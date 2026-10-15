import s00 from './s00_kafe.js';
import s01 from './s01_blueprint.js';
import s02 from './s02_cctv.js';
import s03 from './s03_vault.js';

export const SITES = [s00, s01, s02, s03];
export const siteById = (id) => SITES.find((s) => s.id === id);
