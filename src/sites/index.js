import s00 from './s00_kafe.js';
import s01 from './s01_blueprint.js';
import s02 from './s02_cctv.js';
import s03 from './s03_vault.js';
import { dressWorld } from './flavor.js';

export const SITES = [s00, s01, s02, s03];

// Add shared set-dressing (extra files + background services) so every node
// feels populated, not just its objective files.
for (const s of SITES) dressWorld(s.world);

export const siteById = (id) => SITES.find((s) => s.id === id);
