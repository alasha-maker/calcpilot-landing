// CalcPilot calc engine — reference tables and constants (Kahramaa T10/T11, IEC, cable prices)

export const KAHRAMAA_T10 = {
  sizes: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400],
  vdMV: [24, 15, 9.1, 6, 3.6, 2.2, 1.5, 1, 0.81, 0.57, 0.42, 0.34, 0.29, 0.24, 0.2, 0.18, 0.17],
  // current ratings per install method [ground, pipe, air_in, air_out]
  ratings: {
    ground: [14, 20, 26, 33, 50, 65, 73, 87, 104, 123, 150, 170, 190, 215, 250, 280, 315],
    pipe: [14, 20, 25, 32, 42, 54, 70, 82, 100, 120, 150, 164, 190, 210, 250, 262, 300],
    air_in: [15, 20, 26, 33, 45, 60, 80, 100, 119, 150, 200, 220, 300, 350, 400, 450, null],
    air_out: [13, 17, 23, 30, 40, 52, 75, 85, 110, 140, 170, 200, 230, 250, 300, 350, 400],
  }
};

// Table 11: XLPE/SWA — sizes 16→300 mm²
export const KAHRAMAA_T11 = {
  sizes: [16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300],
  vdMV: [2.6, 1.5, 1.2, 0.87, 0.61, 0.45, 0.36, 0.29, 0.24, 0.2, 0.18],
  ratings: {
    ground: [71, 93, 112, 133, 164, 195, 223, 251, 285, 329, 366],
    pipe: [65, 84, 100, 123, 151, 182, 210, 235, 266, 308, 350],
    air_in: [81, 110, 150, 170, 208, 255, 300, 350, 400, 476, 550],
    air_out: [80, 102, 136, 150, 200, 250, 276, 323, 367, 450, 500],
  }
};

export function buildTable11WithSmallCableFallback() {
  const smallIdx = KAHRAMAA_T10.sizes.map((s, i) => s < 16 ? i : -1).filter(i => i >= 0);
  return {
    sizes: [...smallIdx.map(i => KAHRAMAA_T10.sizes[i]), ...KAHRAMAA_T11.sizes],
    vdMV: [...smallIdx.map(i => KAHRAMAA_T10.vdMV[i]), ...KAHRAMAA_T11.vdMV],
    ratings: {
      ground: [...smallIdx.map(i => KAHRAMAA_T10.ratings.ground[i]), ...KAHRAMAA_T11.ratings.ground],
      pipe: [...smallIdx.map(i => KAHRAMAA_T10.ratings.pipe[i]), ...KAHRAMAA_T11.ratings.pipe],
      air_in: [...smallIdx.map(i => KAHRAMAA_T10.ratings.air_in[i]), ...KAHRAMAA_T11.ratings.air_in],
      air_out: [...smallIdx.map(i => KAHRAMAA_T10.ratings.air_out[i]), ...KAHRAMAA_T11.ratings.air_out],
    }
  };
}
export const KAHRAMAA_T11_EFFECTIVE = buildTable11WithSmallCableFallback();

export const INSTALL_LABELS = {
  ground: 'Direct in Ground',
  pipe: 'Underground Pipe',
  air_in: 'Air — In Building',
  air_out: 'Air — Exterior',
};

export const TYPE_ORDER = ['MDB', 'SMDB', 'DB', 'Intermediate', 'Final Load'];
export const PANEL_TYPES = ['MDB', 'SMDB', 'DB'];

// Standard MCCB sizes (IEC)
export const MCCB_STANDARD_SIZES = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600];

export const LOAD_CATEGORIES = {
  general: { label: 'General Loads', df: 0.60 },
  ac: { label: 'Air Conditioning', df: 0.90 },
  cooker: { label: 'Cookers', df: 0.40 },
  water_heat: { label: 'Water Heaters', df: 0.30 },
  motor_dol: { label: 'Motors (DOL)', df: 0.50 },
  motor_ss: { label: 'Motors (Soft Start)', df: 0.50 },
  motor_vfd: { label: 'Motors (VFD)', df: 0.50 },
  others: { label: 'Others', df: 0.50 },
};
// Summary groups: motor sub-types and others collapse into one row
export const CAT_SUMMARY_GROUPS = [
  { key: 'general', label: 'General Loads', cats: ['general'], df: 0.60 },
  { key: 'ac', label: 'Air Conditioning', cats: ['ac'], df: 0.90 },
  { key: 'cooker', label: 'Cookers', cats: ['cooker'], df: 0.40 },
  { key: 'water_heat', label: 'Water Heaters', cats: ['water_heat'], df: 0.30 },
  { key: 'motor', label: 'Others / Motors', cats: ['motor_dol', 'motor_ss', 'motor_vfd', 'others'], df: 0.50 },
];

// Default cable prices and earth-size mapping from the attached cable list workbook.
export const CABLE_PRICE_DEFAULTS = [
  { mm2: 1.5, powerPrice: 10, earthMM2: 1.5, earthPrice: 4 },
  { mm2: 2.5, powerPrice: 12, earthMM2: 2.5, earthPrice: 6 },
  { mm2: 4, powerPrice: 13, earthMM2: 4, earthPrice: 6 },
  { mm2: 6, powerPrice: 14, earthMM2: 6, earthPrice: 6 },
  { mm2: 10, powerPrice: 20, earthMM2: 10, earthPrice: 7 },
  { mm2: 16, powerPrice: 29, earthMM2: 16, earthPrice: 8 },
  { mm2: 25, powerPrice: 55, earthMM2: 16, earthPrice: 13 },
  { mm2: 35, powerPrice: 58, earthMM2: 16, earthPrice: 17 },
  { mm2: 50, powerPrice: 77, earthMM2: 25, earthPrice: 25 },
  { mm2: 70, powerPrice: 110, earthMM2: 35, earthPrice: 29 },
  { mm2: 95, powerPrice: 149, earthMM2: 50, earthPrice: 35 },
  { mm2: 120, powerPrice: 189, earthMM2: 70, earthPrice: 39 },
  { mm2: 150, powerPrice: 228, earthMM2: 95, earthPrice: 41 },
  { mm2: 185, powerPrice: 289, earthMM2: 95, earthPrice: 44 },
  { mm2: 240, powerPrice: 374, earthMM2: 120, earthPrice: 46 },
  { mm2: 300, powerPrice: 400, earthMM2: 150, earthPrice: 51 },
  { mm2: 400, powerPrice: 420, earthMM2: 240, earthPrice: 55 },
];
export const cablePriceByMM2 = Object.fromEntries(CABLE_PRICE_DEFAULTS.map(r => [String(r.mm2), r]));
