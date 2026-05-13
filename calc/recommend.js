// CalcPilot calc engine — cable & MCCB recommendation and cost optimization

import {
  KAHRAMAA_T10,
  KAHRAMAA_T11_EFFECTIVE,
  cablePriceByMM2,
} from './tables.js';
import {
  resistivity,
  calcCurrent,
  groupingFactor,
  loadPF,
  loadDF,
  loadVoltageFor,
  loadTotalKW,
  loadDemandKW,
  buildIecCableTable,
  nextStandardMCCB,
  maxStandardMCCB,
} from './electrical.js';
import {
  buildChildrenMap,
  computeChainTotal,
  sortByType,
  sortSiblings,
} from './topology.js';

// Resolve the active cable table from params/customCableTable (no DOM).
function resolveCableTable(p, customCableTable) {
  if (p.mode === 'custom') return customCableTable;
  if (p.mode === 'iec') return buildIecCableTable(p);
  return p.cableTable === '11' ? KAHRAMAA_T11_EFFECTIVE : KAHRAMAA_T10;
}

function getVdMVFrom(tbl, mm2Num) {
  const idx = tbl.sizes.indexOf(mm2Num);
  if (idx < 0) return null;
  return tbl.vdMV[idx];
}

function getRatingFrom(tbl, mm2Num, install) {
  const idx = tbl.sizes.indexOf(mm2Num);
  if (idx < 0) return null;
  return tbl.ratings[install]?.[idx] ?? null;
}

// Find minimum cable size satisfying both I and VD
export function recommendCableSize(I, meters, maxVDvolt, install, p, customCableTable) {
  const tbl = resolveCableTable(p, customCableTable);
  for (let i = 0; i < tbl.sizes.length; i++) {
    const rating = tbl.ratings[install]?.[i];
    if (rating === null || rating === undefined) continue;
    if (rating < I) continue; // fails ampacity
    const vdMV = tbl.vdMV[i];
    const vd = vdMV * I * meters / 1000;
    if (vd <= maxVDvolt) return tbl.sizes[i];
  }
  return tbl.sizes[tbl.sizes.length - 1]; // largest available
}

export function currentForAutoBasis(load, p, autoTotalMap, basis = 'tdl') {
  const ph = parseInt(load.phases || 3);
  const V = loadVoltageFor(load, p);
  const pf = loadPF(load);
  if (basis === 'mccb') return Math.max(0, parseFloat(load.mccb) || 0);
  const kw = basis === 'tcl' ? loadTotalKW(load, autoTotalMap) : loadDemandKW(load, autoTotalMap);
  return calcCurrent(kw, V, ph, pf);
}

export function segmentVDVoltsForCurrent(load, p, currentA, mm2, nCables, customCableTable) {
  const ph = parseInt(load.phases || 3);
  const V = loadVoltageFor(load, p);
  const pf = loadPF(load);
  const n = Math.max(1, parseInt(nCables) || 1);
  const Ipc = currentA / n;
  if (p.mode === 'kahramaa' || p.mode === 'custom') {
    const tbl = resolveCableTable(p, customCableTable);
    const mvFactor = ph === 3 ? 1 : 2 / Math.sqrt(3);
    return (getVdMVFrom(tbl, mm2) || 0) * mvFactor * Ipc * (parseFloat(load.meters) || 0) / 1000;
  }
  const rho = resistivity(p.material, p.temp);
  const R = rho * (parseFloat(load.meters) || 0) / mm2;
  const Xl = 0.08 * (parseFloat(load.meters) || 0) / 1000;
  const phi = Math.acos(pf);
  return ph === 3
    ? Math.sqrt(3) * Ipc * (R * pf + Xl * Math.sin(phi))
    : 2 * Ipc * (R * pf + Xl * Math.sin(phi));
}

export function segmentVDVoltsForCable(load, p, mm2, nCables, autoTotalMap, basis = 'tdl', customCableTable) {
  return segmentVDVoltsForCurrent(load, p, currentForAutoBasis(load, p, autoTotalMap, basis), mm2, nCables, customCableTable);
}

export function cumulativeVDvoltsFor(name, p, nameMap, autoTotalMap, visited = new Set(), basis = 'tdl', customCableTable) {
  if (!name || visited.has(name)) return 0;
  visited.add(name);
  const load = nameMap[name];
  if (!load || !load.fedFrom || load.fedFrom === load.name) return 0;
  const mm2 = parseFloat(load.mm2) || 6;
  const n = Math.max(1, parseInt(load.parallel) || 1);
  return segmentVDVoltsForCable(load, p, mm2, n, autoTotalMap, basis, customCableTable)
    + cumulativeVDvoltsFor(load.fedFrom, p, nameMap, autoTotalMap, visited, basis, customCableTable);
}

export function cablePriceRecord(mm2, cablePriceOverrides = {}, earthPriceOverrides = {}) {
  const key = String(parseFloat(mm2));
  const def = cablePriceByMM2[key] || { mm2: parseFloat(mm2) || 0, powerPrice: 0, earthMM2: parseFloat(mm2) || 0, earthPrice: 0 };
  const ov = cablePriceOverrides[key] || {};
  return {
    mm2: def.mm2,
    powerPrice: ov.powerPrice !== undefined ? parseFloat(ov.powerPrice) || 0 : def.powerPrice,
    earthMM2: def.earthMM2,
    earthPrice: earthPriceOverrides[String(def.earthMM2)] !== undefined ? parseFloat(earthPriceOverrides[String(def.earthMM2)]) || 0 : def.earthPrice,
  };
}

export function cableOptionCost(load, mm2, n, cablePriceOverrides, earthPriceOverrides) {
  const length = parseFloat(load.meters) || 0;
  const price = cablePriceRecord(mm2, cablePriceOverrides, earthPriceOverrides);
  return length * n * (price.powerPrice || 0) + length * (price.earthPrice || 0);
}

export function recommendCableOption(load, p, upstreamVDv, autoTotalMap, basis = 'tdl', considerVD = true, customCableTable, cablePriceOverrides = {}, earthPriceOverrides = {}) {
  const tbl = resolveCableTable(p, customCableTable);
  const V = loadVoltageFor(load, p);
  const I = currentForAutoBasis(load, p, autoTotalMap, basis);
  const cat = load.category || 'general';
  const isFinal = (load.type === 'Final Load' || load.type === 'Intermediate');
  const maxVDv = p.maxCumVD / 100 * V;
  const install = load.install || 'air_in';
  const groupSize = Math.min(9, Math.max(1, parseInt(load.groupSize) || 1));
  const Cg = groupingFactor(groupSize);
  let fallback = null;
  let bestValid = null; // lowest-cost valid option

  for (let i = 0; i < tbl.sizes.length; i++) {
    const mm2 = tbl.sizes[i];
    const rating = tbl.ratings[install]?.[i];
    if (rating === null || rating === undefined) continue;
    const maxN = mm2 >= 120 ? 10 : 1;
    for (let n = 1; n <= maxN; n++) {
      const Ipc = I / n;
      const segVD = segmentVDVoltsForCable(load, p, mm2, n, autoTotalMap, basis, customCableTable);
      const cumVDv = upstreamVDv + segVD;
      const ampOK = (rating * Cg) >= Ipc;
      const vdOK = !considerVD || cumVDv <= maxVDv + 1e-9;
      const segVDPct = V > 0 ? segVD / V * 100 : 0;
      const segVDOK = !(p.considerSegVD) || segVDPct <= (p.segVDLimit ?? p.maxSegVD ?? 1.5) + 1e-9;
      const cost = cableOptionCost(load, mm2, n, cablePriceOverrides, earthPriceOverrides);
      const opt = { mm2, n, Ipc, segVD, cumVDpct: +(cumVDv / V * 100).toFixed(3), ampOK, vdOK, segVDOK, cost };

      if (ampOK && (!fallback || cost < fallback.cost)) fallback = opt;
      if (ampOK && vdOK && segVDOK) {
        if (!bestValid || cost < bestValid.cost) bestValid = opt;
      }
    }
  }

  return bestValid || fallback || { mm2: tbl.sizes[tbl.sizes.length - 1], n: 10, Ipc: I / 10, segVD: 0, cumVDpct: 0, ampOK: false, vdOK: false, cost: 0 };
}

export function recommendedMCCBForLoad(load, res, basis, p, autoTotalMap, customCableTable) {
  if (basis === 'cable') {
    const mm2 = parseFloat(load.mm2) || parseFloat(res?.mm2) || 0;
    const install = load.install || res?.install || 'air_in';
    const n = Math.max(1, parseInt(load.parallel || res?.nCables || 1) || 1);
    const tbl = resolveCableTable(p, customCableTable);
    const rated = getRatingFrom(tbl, mm2, install) || 0;
    return maxStandardMCCB(rated * n);
  }
  const I = currentForAutoBasis(load, p, autoTotalMap, basis === 'tdl' ? 'tdl' : 'tcl');
  return nextStandardMCCB(I);
}

// Family-sorted order used by the optimizer (loads are walked parent-first so
// upstream cable changes feed into downstream VD on later passes).
function getFamilySortedLoads(loads) {
  const byName = {};
  loads.forEach(l => { byName[l.name] = l; });
  const children = {};
  loads.forEach(l => { children[l.name] = []; });
  loads.forEach(l => {
    if (l.fedFrom && byName[l.fedFrom] && l.fedFrom !== l.name) {
      children[l.fedFrom].push(l);
    }
  });
  Object.keys(children).forEach(k => children[k].sort(sortSiblings));

  const roots = loads
    .filter(l => !l.fedFrom || !byName[l.fedFrom] || l.fedFrom === l.name)
    .sort(sortByType);
  const ordered = [];
  const visited = new Set();
  function walk(node) {
    if (!node || visited.has(node.id)) return;
    visited.add(node.id);
    ordered.push(node);
    (children[node.name] || []).forEach(walk);
  }
  roots.forEach(walk);
  loads.filter(l => !visited.has(l.id)).sort(sortByType).forEach(walk);
  return ordered;
}

export function applyOptimizedCableSelection(loads, params, customCableTable, ids, basis = 'mccb', considerVD = true, considerSegVD = false, segVDLimit = 1.5, cablePriceOverrides = {}, earthPriceOverrides = {}) {
  const targets = new Set(ids);
  const p = { ...params, considerSegVD, segVDLimit };
  const ordered = getFamilySortedLoads(loads);
  let changed = 0;

  for (let pass = 0; pass < (considerVD || considerSegVD ? 4 : 1); pass++) {
    const nameMap = {};
    loads.forEach(l => { nameMap[l.name] = l; });
    const childrenMap = buildChildrenMap(loads, nameMap);
    const autoTotalMap = {};
    loads.forEach(l => { autoTotalMap[l.id] = computeChainTotal(l.name, nameMap, new Set(), childrenMap, loads); });
    let passChanged = 0;

    ordered.forEach(l => {
      if (!targets.has(l.id)) return;
      const upstreamVDv = l.fedFrom ? cumulativeVDvoltsFor(l.fedFrom, p, nameMap, autoTotalMap, new Set(), 'tdl', customCableTable) : 0;
      const opt = recommendCableOption(l, p, upstreamVDv, autoTotalMap, basis, considerVD, customCableTable, cablePriceOverrides, earthPriceOverrides);
      const nextMM2 = String(opt.mm2);
      const nextN = Math.max(1, parseInt(opt.n || 1) || 1);
      if (String(l.mm2) !== nextMM2 || Math.max(1, parseInt(l.parallel) || 1) !== nextN) {
        l.mm2 = nextMM2;
        l.parallel = nextN;
        passChanged++;
      }
    });

    changed += passChanged;
    if (!passChanged) break;
  }
  return changed;
}
