// CalcPilot calc engine — orchestrator: produces per-load results from inputs (no DOM)

import {
  KAHRAMAA_T10,
  KAHRAMAA_T11_EFFECTIVE,
  PANEL_TYPES,
} from './tables.js';
import {
  resistivity,
  calcCurrent,
  calcSegmentVD_IEC,
  ambientTempDerating,
  groupingFactor,
  loadPF,
  loadDF,
  loadVoltageFor,
  buildIecCableTable,
} from './electrical.js';
import {
  autoDetectTypes,
  normalizeSourceFedFroms,
  buildChildrenMap,
  computeChainTotal,
  computeChainDemand,
  cumulativeImpedanceFor,
  isKnownSource,
} from './topology.js';
import {
  cumulativeVDvoltsFor,
  recommendCableOption,
} from './recommend.js';

function resolveCableTable(p, customCableTable) {
  if (p.mode === 'custom') return customCableTable;
  if (p.mode === 'iec') return buildIecCableTable(p);
  return p.cableTable === '11' ? KAHRAMAA_T11_EFFECTIVE : KAHRAMAA_T10;
}

function getVdMV(tbl, mm2Num) {
  const idx = tbl.sizes.indexOf(mm2Num);
  if (idx < 0) return null;
  return tbl.vdMV[idx];
}

function getRating(tbl, mm2Num, install) {
  const idx = tbl.sizes.indexOf(mm2Num);
  if (idx < 0) return null;
  return tbl.ratings[install]?.[idx] ?? null;
}

export function runCalculate({ loads, params, sources, gridInfo, customCableTable, cablePriceOverrides = {}, earthPriceOverrides = {} }) {
  const p = params;
  const tbl = resolveCableTable(p, customCableTable);

  autoDetectTypes(loads);
  normalizeSourceFedFroms(loads, sources);

  const nameMap = {};
  loads.forEach(l => nameMap[l.name] = l);

  // Build children map once (O(n)) so chain functions don't scan all loads on every node
  const childrenMap = buildChildrenMap(loads, nameMap);

  // Auto total kW map (own kW + downstream fed-from loads)
  const autoTotalMap = {};
  loads.forEach(l => { autoTotalMap[l.id] = computeChainTotal(l.name, nameMap, new Set(), childrenMap, loads); });

  // Demand total map: sum of (kw * df) for self + all descendants
  const demandTotalMap = {};
  loads.forEach(l => { demandTotalMap[l.id] = computeChainDemand(l.name, nameMap, new Set(), childrenMap, loads); });

  // Build per-source Isc and Z_source map (keyed by source name)
  // Uses grid fault level for TX sources, X"d for generators
  const sourceIscMap = {};   // name → Isc_kA
  const sourceZMap = {};   // name → Z_source [Ω] for cable-chain propagation
  sources.forEach(src => {
    const lvV = src.lvV || src.voltage || p.lineVoltage;
    const kva = src.kva || p.txKVA;
    const baseMVA = kva / 1000;
    let Isc_A;
    if (src.type === 'transformer') {
      const zPct = src.zPct || p.txZ;
      const Z_tx_pu = zPct / 100;
      const Z_grid_pu = baseMVA / (gridInfo.sscMVA || 250);
      Isc_A = (kva * 1000) / (Math.sqrt(3) * lvV * (Z_tx_pu + Z_grid_pu));
    } else {
      const xdPct = src.xdPct || src.zPct || 12;
      Isc_A = (kva * 1000) / (Math.sqrt(3) * lvV * (xdPct / 100));
    }
    sourceIscMap[src.name] = +(Isc_A / 1000).toFixed(2);
    sourceZMap[src.name] = lvV / (Math.sqrt(3) * Isc_A);
  });
  // Fallback using params bar values if sources not configured
  const fallbackLvV = p.lineVoltage;
  const fallbackZpu = (p.txZ / 100) + (p.txKVA / 1000) / (gridInfo.sscMVA || 250);
  const fallbackIsc = (p.txKVA * 1000) / (Math.sqrt(3) * fallbackLvV * fallbackZpu);
  const fallbackZ = fallbackLvV / (Math.sqrt(3) * fallbackIsc);

  // Helper: get Z_source for the MDB that feeds a given load (walk up to MDB)
  function getZ_sourceFor(loadName) {
    let cur = nameMap[loadName];
    let visited = new Set();
    while (cur && !visited.has(cur.name)) {
      visited.add(cur.name);
      if (cur.type === 'MDB') {
        return sourceZMap[cur.fedFrom] ?? fallbackZ;
      }
      cur = cur.fedFrom ? nameMap[cur.fedFrom] : null;
    }
    return fallbackZ;
  }

  const results = loads.map(l => {
    const autoTotal = +(autoTotalMap[l.id] || l.kw).toFixed(2);
    const hasChildren = loads.some(x => x.fedFrom === l.name);
    const isPanelType = PANEL_TYPES.includes(l.type);
    const dfIsAuto = isPanelType && hasChildren;
    const df = dfIsAuto
      ? (autoTotal > 0 ? +((demandTotalMap[l.id] || 0) / autoTotal).toFixed(4) : 1)
      : loadDF(l);
    const tdl = +(autoTotal * df).toFixed(2);
    const V = loadVoltageFor(l, p);
    const ph = parseInt(l.phases || 3);
    const mm2Num = parseFloat(l.mm2) || 6;
    const install = l.install || 'air_in';
    const pf = loadPF(l);
    const nCables = Math.max(1, parseInt(l.parallel) || 1);
    const cat = l.category || 'general';
    const groupSize = Math.min(9, Math.max(1, parseInt(l.groupSize) || 1));
    const I = +calcCurrent(tdl, V, ph, pf).toFixed(2);
    const Ipc = +(I / nCables).toFixed(2);

    // Grouping derating factor Cg (IEC 60364-5-52)
    const Cg = groupingFactor(groupSize);
    const ratedA = getRating(tbl, mm2Num, install) ?? 0;
    // Kahramaa tables (T10/T11) are already derated for temperature — Kt locked at 1
    const Kt = p.mode === 'kahramaa' ? 1 : ambientTempDerating(p.insulation, p.ambientTemp);
    const ktLocked = p.mode === 'kahramaa';
    const effRatedA = +(ratedA * Cg * Kt).toFixed(1);

    // Segment VD (parallel cables share current → VD based on Ipc)
    let segVD = 0, segVDpct = 0;
    if (p.mode === 'kahramaa' || p.mode === 'custom') {
      const mv = getVdMV(tbl, mm2Num) || 0;
      // T10/T11 mV/A/m is defined for 3-phase balanced (includes √3).
      // For single-phase, the return conductor doubles the path: factor = 2/√3.
      const mvFactor = ph === 3 ? 1 : 2 / Math.sqrt(3);
      segVD = +(mv * mvFactor * Ipc * l.meters / 1000).toFixed(3);
      segVDpct = +(segVD / V * 100).toFixed(3);
    } else {
      const r = calcSegmentVD_IEC(tdl / nCables, l.meters, mm2Num, { ...p, voltage: V, phases: ph, pf });
      segVD = +r.vd.toFixed(3);
      segVDpct = +(segVD / V * 100).toFixed(3);
    }

    // Cumulative VD
    const cumVDv = +cumulativeVDvoltsFor(l.name, p, nameMap, autoTotalMap, new Set(), 'tdl', customCableTable).toFixed(3);
    const cumVDpct = +(cumVDv / V * 100).toFixed(3);

    // Actual voltage at this panel/load terminal
    const vAtPanel = +(V - cumVDv).toFixed(1);

    // Cable I²R losses: P = phases_factor × I² × R_parallel [W]
    const effRho = (p.mode === 'iec') ? resistivity(p.material, p.temp) : 0.017241; // Ω·mm²/m
    const Rcab = effRho * (parseFloat(l.meters) || 0) / mm2Num; // Ω single cable
    const phFactor = (ph === 3) ? 3 : 2;
    const lossKW = +(phFactor * I * I * Rcab / nCables / 1000).toFixed(3);

    // Short-circuit Isc at this terminal (uses correct source Z)
    const Z_cables = cumulativeImpedanceFor(l.name, nameMap, p);
    const Z_src_for = getZ_sourceFor(l.name);
    // 3-phase: Isc = V_line / (√3 × Z);  1-phase: Isc = V_phase / Z (V already = phase V)
    const Isc_kA = +((ph === 3
      ? V / (Math.sqrt(3) * (Z_src_for + Z_cables))
      : V / (Z_src_for + Z_cables)) / 1000).toFixed(2);

    const warnFrac = p.warnPct / 100;
    const segVDOK = segVDpct <= p.maxSegVD + 1e-9;
    const cumVDOK = cumVDpct <= p.maxCumVD + 1e-9;
    const vdOK = segVDOK && cumVDOK;

    const sourceOK = l.type === 'MDB'
      ? (!!l.fedFrom && isKnownSource(l.fedFrom, sources))
      : (!!l.fedFrom && !!nameMap[l.fedFrom] && l.fedFrom !== l.name);
    const lenOK = (parseFloat(l.meters) || 0) > 0;
    const ampOK = effRatedA > 0 && Ipc <= effRatedA;
    const mccbOK = ratedA > 0 && (parseFloat(l.mccb) || 0) <= ratedA * nCables;
    const tripVal = parseFloat(l.mccb) || 0;
    const tripOK = tripVal <= 0 || tripVal >= I; // 0 means not set — skip check

    // Recommended cable option
    const upstreamVDv = l.fedFrom ? cumulativeVDvoltsFor(l.fedFrom, p, nameMap, autoTotalMap, new Set(), 'tdl', customCableTable) : 0;
    const recOpt = recommendCableOption(l, p, upstreamVDv, autoTotalMap, 'tdl', true, customCableTable, cablePriceOverrides, earthPriceOverrides);
    const recMM2 = recOpt.mm2;
    const recN = recOpt.n;

    // Motor starting current check
    const motorMult = { motor_dol: 7, motor_ss: 3, motor_vfd: 1.5 }[cat];
    const Ist = motorMult ? +(I * motorMult).toFixed(1) : null;

    // PF correction suggestion
    let kVArRequired = null;
    if (pf < 0.85 && tdl > 0) {
      kVArRequired = +(tdl * (Math.tan(Math.acos(pf)) - Math.tan(Math.acos(0.85)))).toFixed(1);
    }

    const designIssues = [];
    if (!sourceOK) designIssues.push(l.type === 'MDB' ? 'MDB source must be Transformer/Generator' : 'Invalid fed-from');
    if (!lenOK) designIssues.push('Missing length');
    if (!ampOK) designIssues.push(`Cable ampacity fail (${Ipc}A > ${effRatedA}A${Cg < 1 ? ' derated' : ''})`);
    if (!mccbOK) designIssues.push('TRIP > cable ampacity');
    if (!tripOK) designIssues.push(`TRIP (${tripVal}A) < demand current (${I.toFixed(0)}A) — circuit will trip`);
    if (!segVDOK) designIssues.push(`Segment VD ${segVDpct.toFixed(2)}% exceeds ${p.maxSegVD}% limit`);
    if (!cumVDOK) designIssues.push(`Cumulative VD ${cumVDpct.toFixed(2)}% exceeds ${p.maxCumVD}% limit`);
    if (Ist !== null && (parseFloat(l.mccb) || 0) < Ist / nCables)
      designIssues.push(`Motor start ${motorMult}×FLA = ${Ist}A — verify TRIP setting`);
    if (kVArRequired !== null)
      designIssues.push(`Low PF ${pf.toFixed(2)} — add ${kVArRequired} kVAr capacitors`);
    if (cat === 'motor_vfd' && ph === 3)
      designIssues.push('VFD load: triplen harmonics add in neutral — upsize neutral conductor to 173% line conductor');
    if ((parseInt(l.groupSize) || 1) > 9)
      designIssues.push(`Group size ${l.groupSize} exceeds IEC table (capped at 9) — verify Cg manually`);

    const designStatus = designIssues.length
      ? (designIssues.some(i => /fail|exceeds|Invalid|TRIP >|will trip/.test(i)) ? 'FAIL' : 'WARN')
      : 'PASS';

    const status = (segVDpct <= p.maxSegVD * warnFrac && cumVDpct <= p.maxCumVD * warnFrac && ampOK && mccbOK && tripOK && sourceOK) ? 'OK'
      : (vdOK && ampOK && mccbOK && tripOK && sourceOK) ? 'WARN'
        : 'OVER';

    return {
      ...l,
      pf, df, dfIsAuto, autoTotal, totalKW: autoTotal, tdl, V, I, Ipc, nCables,
      cat, groupSize, Cg, effRatedA,
      vd: segVD, vdPct: segVDpct, cumVD: cumVDpct, cumVDv,
      segVDOK, cumVDOK, vAtPanel, lossKW, Isc_kA,
      ratedA, Kt, ktLocked, Cg, ampOK, mccbOK, tripOK, sourceOK, lenOK,
      designStatus, designIssues, recMM2, recN, status,
      Ist, kVArRequired,
    };
  });

  return { results, sourceIscMap, sourceZMap };
}
