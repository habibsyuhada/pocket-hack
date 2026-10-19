// Lists every user-visible Indonesian string so it can be translated.
//   node tools/i18n-extract.mjs > strings.json
// - "data": prose inside game data (missions, city nodes, dialogue, items, ...)
// - "src":  string literals / template literals in UI + engine source
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(path.join(root, p));

const SKIP_KEYS = new Set(['id', 'kind', 'addr', 'minAccess', 'level', 'account', 'device', 'keyOptions', 'states', 'state',
  'compare', 'requiresProc', 'control', 'entry', 'links', 'district', 'giver', 'site', 'likes', 'cmd', 'cmds', 'group', 'tool', 'item', 'section',
  'unlockTools', 'flags', 'clues', 'creds', 'reveal', 'online', 'device', 'band', 'who', 'mood', 'key', 'rigScan', 'owner']);
const FILENAME = /^[\w.-]+\.\w{2,5}$/;
const CODE = /^[A-Za-z0-9_\-:.\/]+$/;

export function isProse(s) {
  if (typeof s !== 'string' || s.length < 2) return false;
  if (!/[A-Za-z]{2}/.test(s)) return false;
  if (FILENAME.test(s) || s.startsWith('/') || /^\d[\d.:\/ -]*$/.test(s)) return false;
  if (CODE.test(s) && !/[a-z]{3}.*[A-Z]|^[A-Z][a-z]{3,}/.test(s)) return false;   // ids, codes
  return true;
}

export function collect(obj, out = new Set(), key = '') {
  if (typeof obj === 'string') { if (!SKIP_KEYS.has(key) && isProse(obj)) out.add(obj); }
  else if (Array.isArray(obj)) obj.forEach((v) => collect(v, out, key));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) { if (typeof v === 'function') continue; collect(v, out, k); }
  return out;
}

export async function dataStrings() {
  const out = new Set();
  const { SITES } = await imp('src/sites/index.js');
  const { CITY } = await imp('src/city/index.js');
  const D = await imp('src/game/dialogues.js');
  const N = await imp('src/game/npc.js');
  const I = await imp('src/game/items.js');
  const M = await imp('src/game/market.js');
  const C = await imp('src/engine/commands.js');
  const W = await imp('src/game/world.js');
  const P = await imp('src/game/progression.js');
  const PR = await imp('src/game/profile.js');
  const T = await imp('src/game/time.js');
  const K = await imp('src/engine/core.js');
  for (const s of SITES) { const { world, ...rest } = s; collect(rest, out); }
  collect(CITY.world.devices, out); collect(CITY.clues, out); collect(CITY.intro, out, 'intro');
  collect(D.DIALOGUES, out); collect(N.NPCS, out); collect(N.LEVEL_NAMES, out);
  collect(I.ITEMS, out); collect(M.MARKET, out); collect(M.SECTIONS, out);
  collect(C.CMD_META, out); collect(C.GROUPS, out); collect(W.MISSIONS, out); collect(W.DIFF_LABEL, out);
  collect(P.RANKS, out); collect(PR.TOOLS, out); collect(T.EVENTS, out); collect(T.FOCUS_LABEL, out); collect(K.LEVEL_LABEL, out);
  return [...out];
}

const CMD_WORDS = new Set(['COMPARE', 'CONFIG', 'CONNECT', 'CONTROL', 'CRACK', 'DECRYPT', 'DELETE', 'DISCONNECT', 'DOWNLOAD', 'EDIT', 'ELEVATE', 'EXPLOIT',
  'FILES', 'INSPECT', 'LOGIN', 'MAP', 'QUEUE', 'READ', 'RECOVER', 'RESTORE', 'ROUTE', 'RUN', 'SCAN', 'SCRIPT', 'SEARCH', 'SERVICES', 'START', 'STOP', 'TOOLS',
  'UPLOAD', 'HACK', 'POCKET', 'NULLBYTE', 'ADMIN', 'USER', 'OFFLINE', 'HOTSPOT', 'SAFEHOUSE', 'CMDS', 'RAM', 'NAS', 'DVR', 'LS', 'PS']);

export function sourceStrings() {
  const files = ['src/ui/app.js', 'src/engine/actions.js', 'src/engine/core.js', 'src/engine/commands.js', 'src/game/time.js', 'src/game/market.js',
    'src/game/items.js', 'src/game/retainer.js', 'src/game/turnin.js', 'src/game/profile.js', 'src/game/npc.js', 'src/game/world.js', 'src/game/perks.js'];
  const out = new Set();
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\/.*$/gm, '');
    // quoted strings
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\n/g, '\n').replace(/\\'/g, "'");
      const before = src.slice(Math.max(0, m.index - 12), m.index);
      if (/(class|style|type|id|kind|view|mode|cls|icon|stCls|color|key|name)\s*:\s*$/.test(before) && !/\s/.test(s)) continue;
      if (/font-size|margin:|padding:|color:|var\(--|^\.|^\w+:\s*\d|animation|translate\(/.test(s)) continue;
      if (isProse(s) && (/\s|[^\x00-\x7f]/.test(s) || /^[A-Z]/.test(s))) out.add(s);
      else if (/^[A-Z][A-Z ·&▸✓●★⚡◆]{2,}$/.test(s) && !CMD_WORDS.has(s)) out.add(s);          // ALL-CAPS button labels
    }
    // template literals: ${...} -> {1}, {2}
    for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
      let n = 0;
      const s = m[1].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, () => `{${++n}}`).replace(/\\n/g, '\n');
      if (isProse(s.replace(/\{\d+\}/g, '')) && /[A-Za-z]{3}/.test(s.replace(/\{\d+\}/g, ''))) out.add(s);
    }
  }
  return [...out];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await dataStrings(), src = sourceStrings();
  console.log(JSON.stringify({ data, src: src.filter((s) => !data.includes(s)) }, null, 1));
}
