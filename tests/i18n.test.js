import { describe, it, expect } from 'vitest';
import { dataStrings, sourceStrings } from '../tools/i18n-extract.mjs';
import { EN } from '../src/i18n/en.js';
import { SAME } from '../src/i18n/same.js';
import { t, tr, LANG, useLang } from '../src/i18n/index.js';
import { fmtDate, fmtDateShort, fmtGameTime, dayIndex } from '../src/game/time.js';
import { newProfile } from '../src/game/profile.js';
import { newRun } from '../src/engine/core.js';
import { exec } from '../src/engine/actions.js';
import { CITY } from '../src/city/index.js';
import { SITES } from '../src/sites/index.js';
import { DIALOGUES } from '../src/game/dialogues.js';

describe('translation coverage', () => {
  it('every user-facing string is translated or explicitly marked the same', async () => {
    const all = [...new Set([...(await dataStrings()), ...sourceStrings()])];
    const same = new Set(SAME);
    const missing = all.filter((s) => EN[s] === undefined && !same.has(s));
    expect(missing).toEqual([]);
  });

  it('placeholders survive translation ({1}, {2}, ...)', () => {
    for (const [id, en] of Object.entries(EN)) {
      const a = (id.match(/\{\d+\}/g) || []).sort().join(), b = (en.match(/\{\d+\}/g) || []).sort().join();
      expect(b, `placeholders of "${id}"`).toBe(a);
    }
  });

  it('no translation is empty', () => {
    for (const [id, en] of Object.entries(EN)) expect(en.trim().length, id).toBeGreaterThan(0);
  });
});

describe('t()', () => {
  it('Indonesian is the source language: t() only fills arguments', () => {
    expect(LANG).toBe('id');
    expect(t('Fokus +{1}. Segar lagi.', 25)).toBe('Fokus +25. Segar lagi.');
    expect(tr('Peta')).toBe('Peta');
  });
});

const STOP = /\b(yang|dan|untuk|tidak|belum|sudah|dengan|kamu|akan|atau|saja|bisa|mau|dulu|lagi|harus|kalau|sebuah|tapi|juga|dari|ada|sama|apa)\b/i;

describe('English mode', () => {
  it('translates UI text, fills arguments and translates names passed as arguments', () => {
    useLang('en');
    try {
      expect(tr('Peta')).toBe('Map');
      expect(t('Fokus +{1}. Segar lagi.', 25)).toBe('Focus +25. Fresh again.');
      expect(t('Misi diterima: {1}. Lihat tab Goals.', 'Antrean Cetak')).toBe('Mission accepted: Print Queue. See the Goals tab.');
      // parts joined with " · " and counts such as ×3 / (11/25) keep their numbers
      expect(tr('Pemilik Kafe Senja · Asing (11/25)')).toBe('Owner of Kafe Senja · Stranger (11/25)');
      expect(tr('Kopi Susu ×3')).toBe('Milk Coffee ×3');
      expect(tr('▸ TIDUR')).toBe('▸ SLEEP');
      // unknown text is left alone
      expect(tr('catatan_staf.txt')).toBe('catatan_staf.txt');
      // calendar and durations follow the language
      const wed = dayIndex(new Date(2026, 9, 21, 12).getTime());
      expect(fmtDate(wed)).toBe('Wednesday, October 21');
      expect(fmtDateShort(wed)).toBe('Wed Oct 21');
      expect(fmtGameTime(80)).toBe('1 h 20 min');
    } finally { useLang('id'); }
  });

  it('every translation is free of Indonesian words', () => {
    const leaks = Object.entries(EN).filter(([, en]) => STOP.test(en)).map(([id, en]) => `${id} => ${en}`);
    expect(leaks).toEqual([]);
  });

  it('engine messages come out in English', () => {
    useLang('en');
    try {
      const profile = newProfile(), run = newRun(CITY);
      const ctx = { mission: CITY, run, profile };
      run.devices.isp_core.discovered = true;
      exec(ctx, 'CONNECT', { type: 'device', id: 'isp_core' });
      exec(ctx, 'SCAN', { type: 'device', id: 'isp_core' });
      const lines = run.log.map((l) => l.text).join('\n');
      expect(lines).toContain('Terminal ready. The city of Surabaya is connected in front of you.');
      expect(lines).toContain('Connected to Local ISP Core. Access: GUEST.');
      expect(lines).toContain('Hotspot Alun-Alun'.replace('Hotspot Alun-Alun', 'Town Square Hotspot'));
    } finally { useLang('id'); }
  });

  it('all mission text translates', () => {
    useLang('en');
    try {
      for (const m of SITES) {
        for (const text of [m.title, m.client, m.brief, ...m.objectives.map((o) => o.text), ...m.hints.map((h) => h.text), ...m.endings.flatMap((e) => [e.label, e.text])]) {
          const out = tr(text);
          expect(out, `untranslated: ${text}`).not.toBe(text);
        }
      }
      for (const npc of Object.values(DIALOGUES)) {
        for (const g of npc.greet) for (const line of g) expect(tr(line), line).not.toBe(line);
      }
    } finally { useLang('id'); }
  });
});
