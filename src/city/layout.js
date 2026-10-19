// Open-world map layout. Everything sits on a coarse grid so cards never
// overlap: cells are 260 wide × 170 tall; a node card is ~112 × 80.
export const MAPW = 3700;
export const MAPH = 2900;
const GX = 140, GY = 140, SX = 260, SY = 170;

export const cellXY = ([c, r]) => ({ x: GX + c * SX, y: GY + r * SY });

// device id -> [col, row, district]. Mission-owned and generic nodes alike.
export const PLACE = {
  // Utara — terminal & lalu lintas
  utara_hub: [4, 1, 'utara'], gw: [3, 2, 'utara'], dvr: [2, 1, 'utara'], cam: [2, 3, 'utara'],
  lampu_lalin: [5, 1, 'utara'], dishub_nas: [5, 3, 'utara'],
  // Barat — kampus & lab
  barat_hub: [1, 7, 'barat'], gateway: [1, 9, 'barat'], teknisi: [0, 8, 'barat'], archive: [2, 8, 'barat'],
  backup: [0, 10, 'barat'], perpus_nas: [0, 6, 'barat'], kampus_ws: [2, 6, 'barat'],
  // Tengah — alun-alun
  tengah_hub: [4, 8, 'tengah'], router: [3, 7, 'tengah'], printer: [3, 6, 'tengah'], warung_pos: [3, 9, 'tengah'],
  halte_info: [5, 7, 'tengah'], kios_tiket: [5, 9, 'tengah'], isp_core: [4, 10, 'tengah'],
  // Timur — pelabuhan & desa
  timur_hub: [7, 7, 'timur'], radio_server: [7, 5, 'timur'], pemancar: [8, 6, 'timur'], klinik_ws: [6, 6, 'timur'],
  sekolah_nas: [6, 9, 'timur'], balai_printer: [8, 9, 'timur'],
  // Selatan — pasar
  selatan_hub: [4, 13, 'selatan'], edge: [4, 14, 'selatan'], ops: [3, 15, 'selatan'], cold: [5, 15, 'selatan'],
  pasar_pos: [3, 12, 'selatan'], gudang_nas: [5, 12, 'selatan'],
  // Tengah (utara sisi) — balai kelurahan
  kelurahan_nas: [4, 5, 'tengah'], pos_satpam: [5, 5, 'tengah'],
  // Utara — gerbang tol
  gate_tol: [6, 2, 'utara'],
  // Selatan — relay menuju kawasan industri
  menara_relay: [7, 13, 'selatan'],
  // Industri — hotspot kawasan pabrik (hanya lewat ROUTE)
  industri_hub: [10, 13, 'industri']
  // Missions add their own nodes with `place: { id: [col, row, district] }`.
};

export const SAFEHOUSE_CELL = [3, 10];
// The black market is a place on the map (Pasar Selatan), not a menu tab.
export const MARKET_CELL = [5, 13];
// Where contracts (daily maintenance jobs) are taken and checked.
export const CONTRACT_CELL = [5, 10];

// Each NPC walks a 3-cell route, one cell per day. Cells are free of nodes.
export const NPC_CELLS = {
  laras: [[3, 8], [5, 8], [4, 9]],
  rani: [[4, 2], [6, 4], [5, 2]],
  dimas: [[1, 8], [1, 5], [2, 10]],
  gun: [[4, 12], [6, 13], [2, 13]],
  hadi: [[2, 4], [6, 5], [4, 3]],
  wulan: [[7, 8], [7, 6], [7, 9]],
  sari: [[8, 8], [9, 6], [10, 7]],
  vira: [[0, 7], [2, 7], [1, 6]]
};

export const DISTRICTS = [
  { id: 'utara', name: 'UTARA · Terminal', at: [4, 0] },
  { id: 'barat', name: 'BARAT · Kampus', at: [1, 5.55] },
  { id: 'tengah', name: 'TENGAH · Alun-Alun', at: [4, 6] },
  { id: 'timur', name: 'TIMUR · Pelabuhan', at: [7, 4.4] },
  { id: 'selatan', name: 'SELATAN · Pasar', at: [4, 11.2] },
  { id: 'industri', name: 'INDUSTRI · Kawasan Pabrik', at: [10.5, 10.4] }
];

export const placeOf = (id) => {
  const p = PLACE[id];
  return p ? { ...cellXY(p), district: p[2] } : null;
};
