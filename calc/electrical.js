// CalcPilot calc engine — primitive electrical formulas (current, VD, derating, cable tables)

import { KAHRAMAA_T10, MCCB_STANDARD_SIZES } from './tables.js';

export function nextStandardMCCB(I) {
  for (const sz of MCCB_STANDARD_SIZES) if (sz >= I) return sz;
  return MCCB_STANDARD_SIZES[MCCB_STANDARD_SIZES.length - 1];
}

export function maxStandardMCCB(capacityA) {
  const cap = Math.max(0, parseFloat(capacityA) || 0);
  let best = MCCB_STANDARD_SIZES[0];
  for (const sz of MCCB_STANDARD_SIZES) {
    if (sz <= cap) best = sz;
    else break;
  }
  return best;
}

// ── AMBIENT TEMPERATURE DERATING Kt (IEC 60364-5-52 Table B.52.14) ──────────
// Kt = √((θmax − θambient) / (θmax − θref))  [θref = 30°C for air]
export function ambientTempDerating(insulation, ambientTemp) {
  const thetaMax = insulation === 'pvc' ? 70 : 90;
  const kt = Math.sqrt((thetaMax - ambientTemp) / (thetaMax - 30));
  return Math.max(0.01, +kt.toFixed(3));
}

// ── CABLE GROUPING DERATING Cg (IEC 60364-5-52 Table B.52.17) ────────────
const CG_FACTORS = [1.00, 0.80, 0.70, 0.65, 0.60, 0.57, 0.54, 0.52, 0.50];
export function groupingFactor(groupSize) {
  const n = Math.min(Math.max(1, Math.round(groupSize || 1)), 9);
  return CG_FACTORS[n - 1];
}

// ── IEC RESISTIVITY ───────────────────────────────────────────
export function resistivity(material, temp) {
  const base = material === 'copper' ? 0.017241 : 0.028264;
  const alpha = material === 'copper' ? 0.00393 : 0.00403;
  return base * (1 + alpha * (temp - 20));
}

// ── CURRENT CALCULATION (shared) ─────────────────────────────
export function calcCurrent(kw, voltage, phases, pf) {
  return phases === 3
    ? (kw * 1000) / (Math.sqrt(3) * voltage * pf)
    : (kw * 1000) / (voltage * pf);
}

// ── SEGMENT VD (Kahramaa mV/A/m method) ──────────────────────
export function calcSegmentVD_Kahramaa(I, meters, mm2Num, vdMV) {
  if (vdMV === null || vdMV === undefined) return { vd: 0, vdPct: 0 };
  const vd = (vdMV * I * meters) / 1000;
  return { vd, vdPct: 0 }; // vdPct filled per-node with correct voltage
}

// ── SEGMENT VD (IEC resistivity method) ──────────────────────
export function calcSegmentVD_IEC(kw, meters, mm2Num, p) {
  const mm = mm2Num;
  const rho = resistivity(p.material, p.temp);
  const I = calcCurrent(kw, p.voltage, p.phases, p.pf);
  const R = rho * meters / mm;
  const Xl = 0.08 * meters / 1000;
  const phi = Math.acos(p.pf);
  const vd = p.phases === 3
    ? Math.sqrt(3) * I * (R * p.pf + Xl * Math.sin(phi))
    : 2 * I * (R * p.pf + Xl * Math.sin(phi));
  return { I: +I.toFixed(2), vd: +vd.toFixed(3), vdPct: +(vd / p.voltage * 100).toFixed(3) };
}

// PF for a single load
export function loadPF(l) {
  const v = parseFloat(l.pf);
  return (isFinite(v) && v > 0 && v <= 1) ? v : 0.85;
}

export function loadDF(l) {
  const v = parseFloat(l.df);
  return (isFinite(v) && v >= 0) ? v : 1;
}

// Voltage for a single load based on its phases and the user-defined line voltage
export function loadVoltageFor(l, p) {
  return parseInt(l.phases || 3) === 3 ? p.lineVoltage : p.phaseVoltage;
}

export function loadTotalKW(load, autoTotalMap) {
  return autoTotalMap?.[load.id] ?? load.totalKW ?? load.kw ?? 0;
}

export function loadDemandKW(load, autoTotalMap) {
  return +(loadTotalKW(load, autoTotalMap) * loadDF(load)).toFixed(2);
}

// ── CABLE TABLE HELPERS ───────────────────────────────────────
export function fixedCustomCableSizes() {
  return [].concat(KAHRAMAA_T10.sizes);
}

export function iecDefaultVdMVForSize(mm2, material = 'copper', temp = 75) {
  const pf = 0.85;
  const rho = resistivity(material, temp);
  const phi = Math.acos(pf);
  return +(Math.sqrt(3) * ((rho / mm2) * pf + (0.08 / 1000) * Math.sin(phi)) * 1000).toFixed(3);
}

function validNum(value, fallback) {
  const n = parseFloat(value);
  return isFinite(n) && n >= 0 ? n : fallback;
}

function validNullableNum(value, fallback) {
  if (value === null) return null;
  const n = parseFloat(value);
  return isFinite(n) && n >= 0 ? n : fallback;
}

export function buildDefaultCustomCableTable() {
  return buildIecCableTable({ material: 'copper', temp: 75 });
}

export function buildIecCableTable(p = {}) {
  const sizes = fixedCustomCableSizes();
  const material = p.material || 'copper';
  const temp = parseFloat(p.temp) || 75;
  return {
    sizes,
    vdMV: sizes.map(size => iecDefaultVdMVForSize(size, material, temp)),
    ratings: {
      ground: sizes.map((_, i) => KAHRAMAA_T10.ratings.ground[i] ?? null),
      pipe: sizes.map((_, i) => KAHRAMAA_T10.ratings.pipe[i] ?? null),
      air_in: sizes.map((_, i) => KAHRAMAA_T10.ratings.air_in[i] ?? null),
      air_out: sizes.map((_, i) => KAHRAMAA_T10.ratings.air_out[i] ?? null),
    }
  };
}

export function normalizeCustomCableTable(table) {
  const defaults = buildDefaultCustomCableTable();
  const sizes = fixedCustomCableSizes();
  const bySize = {};
  (table?.sizes || []).forEach((size, idx) => {
    bySize[String(parseFloat(size))] = {
      vdMV: table?.vdMV?.[idx],
      ground: table?.ratings?.ground?.[idx],
      pipe: table?.ratings?.pipe?.[idx],
      air_in: table?.ratings?.air_in?.[idx],
      air_out: table?.ratings?.air_out?.[idx],
    };
  });
  return {
    sizes,
    vdMV: sizes.map((size, i) => validNum(bySize[String(size)]?.vdMV, defaults.vdMV[i])),
    ratings: {
      ground: sizes.map((size, i) => validNullableNum(bySize[String(size)]?.ground, defaults.ratings.ground[i])),
      pipe: sizes.map((size, i) => validNullableNum(bySize[String(size)]?.pipe, defaults.ratings.pipe[i])),
      air_in: sizes.map((size, i) => validNullableNum(bySize[String(size)]?.air_in, defaults.ratings.air_in[i])),
      air_out: sizes.map((size, i) => validNullableNum(bySize[String(size)]?.air_out, defaults.ratings.air_out[i])),
    }
  };
}
