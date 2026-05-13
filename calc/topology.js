// CalcPilot calc engine — load tree topology (sort, chain totals, impedance, source detection)

import { TYPE_ORDER, PANEL_TYPES } from './tables.js';
import { resistivity, loadDF } from './electrical.js';

export function naturalNameSort(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true });
}

export function typeOrderIndex(t) {
  const idx = TYPE_ORDER.indexOf(t);
  return idx < 0 ? TYPE_ORDER.length : idx;
}

export function sortByType(a, b) {
  const oi = typeOrderIndex(a.type) - typeOrderIndex(b.type);
  return oi !== 0 ? oi : naturalNameSort(a, b);
}

export function sortSiblings(a, b) {
  const lo = (a.loopOrder || 1) - (b.loopOrder || 1);
  if (lo !== 0) return lo;
  const oi = typeOrderIndex(a.type) - typeOrderIndex(b.type);
  return oi !== 0 ? oi : naturalNameSort(a, b);
}

export function isGeneratorSource(value, sources) {
  const v = String(value || '').trim();
  if (v.toLowerCase() === 'generator') return true;
  const src = sources.find(s => s.name === v);
  return src?.type === 'generator';
}

export function isTransformerSource(value, sources) {
  const v = String(value || '').trim();
  if (!v || v.toLowerCase() === 'transformer' || v.toLowerCase() === 'utility' || v.toLowerCase() === 'tx') return true;
  const src = sources.find(s => s.name === v);
  return src?.type === 'transformer';
}

export function isKnownSource(value, sources) {
  const v = String(value || '').trim().toLowerCase();
  if (!v || v === 'transformer' || v === 'generator' || v === 'utility') return true;
  return sources.some(s => s.name === value);
}

// Build O(n) children lookup map: name → array of direct child loads
export function buildChildrenMap(loads, nameMap) {
  const cm = {};
  loads.forEach(l => { cm[l.name] = []; });
  loads.forEach(l => { if (l.fedFrom && nameMap[l.fedFrom] && l.fedFrom !== l.name) cm[l.fedFrom].push(l); });
  return cm;
}

// ── AUTO-DETECT TYPES ─────────────────────────────────────────
// Manual: MDB, DB.  Auto-detect: SMDB (when a node feeds others and isn't MDB/DB).
// Default: Final Load.
export function autoDetectTypes(loads) {
  const fedFromSet = new Set(loads.map(l => l.fedFrom).filter(Boolean));
  loads.forEach(l => {
    // Never overwrite manually-locked types
    if (l.typeManual) return;
    // Panel types are always manually set — lock them and exit
    if (l.type === 'MDB' || l.type === 'DB' || l.type === 'SMDB') { l.typeManual = true; return; }
    // Check if this load has children (someone feeds from it)
    const hasChildren = fedFromSet.has(l.name);
    if (PANEL_TYPES.includes(l.type)) {
      // Already a panel type — keep it (SMDB auto-promote still works)
      if (hasChildren) return;
    }
    // Non-panel loads: auto-detect Intermediate vs Final Load
    if (hasChildren) {
      // Has children and is not a panel → Intermediate
      if (!PANEL_TYPES.includes(l.type)) {
        l.type = 'Intermediate';
      }
    } else {
      // No children and is not a panel → Final Load
      if (!PANEL_TYPES.includes(l.type)) {
        l.type = 'Final Load';
      }
    }
  });
}

// ── CHAIN TOTAL KW ────────────────────────────────────────────
// Pass a pre-built childrenMap (name→[loads]) to avoid O(n²) filter on every node.
export function computeChainTotal(name, nameMap, visited = new Set(), childrenMap = null, loads = null) {
  if (visited.has(name)) return 0;
  visited.add(name);
  const node = nameMap[name];
  if (!node) return 0;
  const downstream = childrenMap ? (childrenMap[name] || []) : (loads ? loads.filter(l => l.fedFrom === name) : []);
  if (!downstream.length) return node.kw;
  return node.kw + downstream.reduce((s, c) => s + computeChainTotal(c.name, nameMap, new Set(visited), childrenMap, loads), 0);
}

export function computeChainDemand(name, nameMap, visited = new Set(), childrenMap = null, loads = null) {
  if (visited.has(name)) return 0;
  visited.add(name);
  const node = nameMap[name];
  if (!node) return 0;
  const downstream = childrenMap ? (childrenMap[name] || []) : (loads ? loads.filter(l => l.fedFrom === name) : []);
  if (!downstream.length) return +(node.kw * loadDF(node));
  return +(node.kw * loadDF(node)) + downstream.reduce((s, c) => s + computeChainDemand(c.name, nameMap, new Set(visited), childrenMap, loads), 0);
}

// ── CUMULATIVE CABLE IMPEDANCE FOR ISC ────────────────────────────────────
// Returns Ω — sum of R from transformer bus to this load terminal.
// Uses user-selected material and temperature so aluminum/hot-cable Isc is correct.
export function cumulativeImpedanceFor(name, nameMap, p, visited = new Set()) {
  if (visited.has(name)) return 0;
  visited.add(name);
  const l = nameMap[name];
  if (!l) return 0;
  const mm2 = parseFloat(l.mm2) || 6;
  const len = parseFloat(l.meters) || 0;
  const n = Math.max(1, parseInt(l.parallel) || 1);
  const rho = resistivity(p.material, p.temp); // Ω·mm²/m (respects Cu/Al and temperature)
  const Rcab = rho * len / (mm2 * n);
  const parentZ = l.fedFrom ? cumulativeImpedanceFor(l.fedFrom, nameMap, p, visited) : 0;
  return parentZ + Rcab;
}

export function normalizeSourceFedFroms(loads, sources) {
  // Ensure a TX source always exists before normalizing
  let tx = sources.find(s => s.type === 'transformer');
  if (!tx) {
    tx = {
      id: 'src-tx-default',
      name: 'TX-1',
      type: 'transformer',
      kva: 1600, hvKV: 11, lvV: 415, zPct: 6,
      connection: 'Dyn11', pf: 0.85,
    };
    sources.unshift(tx);
  }
  const defaultSrc = tx.name;
  loads.forEach(l => {
    if (l.type !== 'MDB') {
      // Non-MDB nodes must reference another load, not a source
      if (isKnownSource(l.fedFrom, sources) && !loads.find(x => x.name === l.fedFrom)) l.fedFrom = '';
    } else {
      // Check if fedFrom is already a named source in the sources array (e.g. 'TX-2', 'GEN-1')
      const alreadyNamedSource = sources.some(s => s.name === l.fedFrom);
      if (alreadyNamedSource) {
        // User explicitly chose this source — keep it
        return;
      }
      // Migrate legacy blank / generic placeholder strings to the default TX source
      const isGenericPlaceholder = !l.fedFrom ||
        ['transformer', 'utility', 'tx'].includes(String(l.fedFrom).toLowerCase().trim());
      if (isGenericPlaceholder || !isKnownSource(l.fedFrom, sources)) {
        l.fedFrom = defaultSrc;
      } else if (isGeneratorSource(l.fedFrom, sources) && !sources.find(s => s.name === l.fedFrom)) {
        const gen = sources.find(s => s.type === 'generator');
        l.fedFrom = gen ? gen.name : defaultSrc;
      }
    }
  });
}

export function getDescendants(panelName, loads) {
  const result = [], queue = [panelName], visited = new Set([panelName]);
  while (queue.length) {
    const cur = queue.shift();
    loads.filter(l => l.fedFrom === cur && !visited.has(l.name)).forEach(l => {
      result.push(l); visited.add(l.name); queue.push(l.name);
    });
  }
  return result;
}
