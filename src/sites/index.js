import s00 from './s00_kafe.js';
import s01 from './s01_blueprint.js';
import s02 from './s02_cctv.js';
import s03 from './s03_vault.js';
import s04 from './s04_warung.js';
import s05 from './s05_radio.js';
import s06 from './s06_sekolah.js';
import s07 from './s07_iklan.js';
import s08 from './s08_kelurahan.js';
import s09 from './s09_loket.js';
import s10 from './s10_asrama.js';
import s11 from './s11_surat.js';
import s12 from './s12_klinik.js';
import s13 from './s13_kapal.js';
import s14 from './s14_syahbandar.js';
import s15 from './s15_himpunan.js';
import s16 from './s16_dompet.js';
import s17 from './s17_gang.js';
import s18 from './s18_gardu.js';
import s19 from './s19_menara.js';
import s20 from './s20_gudang.js';
import s21 from './s21_plc.js';
import { dressWorld } from './flavor.js';
import { BRIEFS } from './briefs.js';
import { applyRoutes, ROUTE_EN } from './routes.js';
import { EN } from '../i18n/en.js';

export const SITES = [s00, s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21];

// Add shared set-dressing (extra files + background services) so every node
// feels populated, not just its objective files.
for (const s of SITES) { dressWorld(s.world); if (BRIEFS[s.id]) s.brief = BRIEFS[s.id]; }

applyRoutes(SITES);
Object.assign(EN, ROUTE_EN);                      // English for the texts the routes added

export const siteById = (id) => SITES.find((s) => s.id === id);
