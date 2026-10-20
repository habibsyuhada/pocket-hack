// Aggregates the per-feature translation files so several people can add text without touching en.js.
import s07 from './s07.js';
import s08 from './s08.js';
import s09 from './s09.js';
import s10 from './s10.js';
import s11 from './s11.js';
import s12 from './s12.js';
import s13 from './s13.js';
import s14 from './s14.js';
import s15 from './s15.js';
import s16 from './s16.js';
import s17 from './s17.js';
import s18 from './s18.js';
import s19 from './s19.js';
import s20 from './s20.js';
import s21 from './s21.js';
import npcs from './npcs.js';
import infra from './infra.js';
import fx from './fx.js';
import trace from './trace.js';
import briefs from './briefs.js';

const all = [fx, trace, briefs, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, npcs, infra];
export const EXTRA_EN = Object.assign({}, ...all.map((m) => m.en));
export const EXTRA_SAME = all.flatMap((m) => m.same);
