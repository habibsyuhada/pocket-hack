import { describe, it, expect } from 'vitest';
import { paginate, PAGE_CHARS } from '../src/ui/paginate.js';
import { DIALOGUES } from '../src/game/dialogues.js';

describe('dialogue paging', () => {
  it('keeps short lines whole', () => {
    expect(paginate('Halo.')).toEqual(['Halo.']);
    expect(paginate('')).toEqual(['']);
  });

  it('splits long text at sentence boundaries without losing words', () => {
    const text = 'Kalimat pertama cukup panjang untuk mengisi baris. Kalimat kedua juga panjang sekali di sini. Kalimat ketiga menutup cerita dengan rapi.';
    const pages = paginate(text);
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) expect(p.length).toBeLessThanOrEqual(PAGE_CHARS);
    expect(pages.join(' ').replace(/\s+/g, ' ')).toBe(text);
    expect(pages[0].endsWith('.')).toBe(true);
  });

  it('breaks a single over-long sentence at word boundaries', () => {
    const text = Array.from({ length: 60 }, (_, i) => `kata${i}`).join(' ');
    const pages = paginate(text);
    for (const p of pages) expect(p.length).toBeLessThanOrEqual(PAGE_CHARS);
    expect(pages.join(' ')).toBe(text);
  });

  it('every dialogue line fits a small number of pages', () => {
    const walk = (o, out) => { if (Array.isArray(o)) o.forEach((x) => (x && typeof x.text === 'string' ? out.push(x.text) : walk(x, out))); else if (o && typeof o === 'object') Object.values(o).forEach((v) => walk(v, out)); return out; };
    for (const text of walk(DIALOGUES, [])) {
      const pages = paginate(text);
      expect(pages.length, text).toBeLessThanOrEqual(4);
      for (const p of pages) expect(p.length, text).toBeLessThanOrEqual(PAGE_CHARS);
    }
  });
});
