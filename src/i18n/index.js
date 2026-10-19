// Language support. Game data and UI text are written in Indonesian and are
// translated when they are *displayed*: `t()` looks a string up in the English
// dictionary (src/i18n/en.js). Templates take positional arguments:
//     t('Fokus +{1}. Segar lagi.', 25)
// The language is stored in localStorage and changing it reloads the page, so a
// whole session always uses one language.
import { EN } from './en.js';

const KEY = 'pockethack_lang';
export const LANGS = { id: 'Bahasa Indonesia', en: 'English' };

function load() {
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'id') return v; } catch { /* no storage */ }
  return 'id';
}
const cache = new Map();
export let LANG = load();
export const isEnglish = () => LANG === 'en';
// switches the language for this page (tests use it; the app reloads instead)
export function useLang(lang) { LANG = lang === 'en' ? 'en' : 'id'; cache.clear(); }

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang === 'en' ? 'en' : 'id'); } catch { /* ignore */ }
}

// string arguments (names, titles, ...) are translated too
const fill = (s, args) => (args.length ? s.replace(/\{(\d+)\}/g, (_, i) => { const a = args[i - 1]; return a === undefined || a === null ? '' : typeof a === 'string' ? tr(a) : a; }) : s);
function lookup(s) {
  if (EN[s] !== undefined) return EN[s];
  // surrounding whitespace / symbols: translate the core ("▸ TIDUR", " (3 hari)")
  const m = /^([^\p{L}\p{N}{]*)([\s\S]*?)(\s*)$/u.exec(s);
  if (m && m[2] && (m[1] || m[3]) && m[2] !== s) {
    const core = lookup(m[2]);
    if (core !== m[2]) return m[1] + core + m[3];
  }
  // "Kopi Susu ×3", "Asing (11/25)": translate the name, keep the number
  const num = /^(.*?)\s*(×\d+|\(\d+\/\d+\))$/.exec(s);
  if (num && num[1]) { const core = lookup(num[1]); if (core !== num[1]) return `${core} ${num[2]}`; }
  // "a · b · c": translate each part
  if (s.includes(' · ')) {
    const parts = s.split(' · ');
    const out = parts.map(lookup);
    if (out.some((p, i) => p !== parts[i])) return out.join(' · ');
  }
  // multi-line text: translate each line
  if (s.includes('\n')) {
    const parts = s.split('\n');
    const out = parts.map(lookup);
    if (out.some((p, i) => p !== parts[i])) return out.join('\n');
  }
  return s;
}

// Translate (when English is on) and fill {1}, {2}... placeholders.
export function t(s, ...args) {
  if (typeof s !== 'string' || !s) return s;
  if (LANG === 'id') return fill(s, args);
  let r = cache.get(s);
  if (r === undefined) { r = lookup(s); cache.set(s, r); }
  return fill(r, args);
}

// UI text that is rendered later (text nodes, titles): translate only, no placeholders.
export const tr = (s) => (LANG === 'id' || typeof s !== 'string' ? s : t(s));
