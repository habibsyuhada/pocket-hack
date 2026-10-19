import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { focusState, focusCostFor, loadingMult, fatigueMult, sleepPlan, fmtGameTime, spendFocus, restoreFocus, sleep, eventFor, seasonName, EVENTS } from '../src/game/time.js';

describe('day & focus', () => {
  it('new profile starts day 1 with full focus', () => {
    const p = newProfile();
    expect(p.day).toBe(1);
    expect(p.focus).toBe(100);
  });

  it('focus state thresholds', () => {
    expect(focusState(100)).toBe('segar');
    expect(focusState(51)).toBe('segar');
    expect(focusState(50)).toBe('lelah');
    expect(focusState(20)).toBe('lelah');
    expect(focusState(19)).toBe('kelelahan');
    expect(focusState(0)).toBe('kelelahan');
  });

  it('actions cost more when tired but are never blocked', () => {
    const p = newProfile();
    const fresh = focusCostFor(p, 'CRACK');
    p.focus = 40;
    const tired = focusCostFor(p, 'CRACK');
    p.focus = 5;
    const spent = focusCostFor(p, 'CRACK');
    expect(tired).toBeGreaterThan(fresh);
    expect(spent).toBeGreaterThan(tired);
    spendFocus(p, 999);
    expect(p.focus).toBe(0);               // floors at 0
    expect(focusCostFor(p, 'CRACK')).toBeGreaterThan(0); // still allowed
  });

  it('free commands stay free and perk multipliers apply', () => {
    const p = newProfile();
    expect(focusCostFor(p, 'DISCONNECT')).toBe(0);
    expect(focusCostFor(p, 'CRACK', { focusCost: 0.7 })).toBeLessThan(focusCostFor(p, 'CRACK'));
  });

  it('loading slows with fatigue and event modifiers', () => {
    const p = newProfile();
    expect(loadingMult(p)).toBe(1);
    p.focus = 30;
    expect(loadingMult(p)).toBe(1.5);
    p.focus = 10;
    expect(loadingMult(p, { loading: 1.5 })).toBeCloseTo(4 * 1.5);
  });

  it('below 20 every lost point makes it slower, and 0 is the slowest', () => {
    let prev = fatigueMult(20);
    for (let f = 19; f >= 0; f--) { const m = fatigueMult(f); expect(m).toBeGreaterThan(prev); prev = m; }
    expect(fatigueMult(0)).toBe(6);
    expect(fatigueMult(19)).toBeGreaterThan(fatigueMult(20));
    expect(fatigueMult(60)).toBe(1);
  });

  it('sleep takes 3 game-minutes per missing point, at least an hour', () => {
    const p = newProfile();
    p.focus = 100;
    expect(sleepPlan(p).gameMin).toBe(60);            // already rested: still an hour
    p.focus = 20;
    expect(sleepPlan(p).missing).toBe(80);
    expect(sleepPlan(p).gameMin).toBe(240);           // 80 × 3
    p.focus = 0;
    const full = sleepPlan(p);
    expect(full.gameMin).toBe(300);
    expect(full.ms).toBeGreaterThan(sleepPlan({ focus: 50 }).ms);
    expect(fmtGameTime(198)).toBe('3 jam 18 mnt');
    expect(fmtGameTime(300)).toBe('5 jam');
    expect(fmtGameTime(45)).toBe('45 mnt');
  });


  it('restoreFocus caps at max; sleep resets focus and advances the day', () => {
    const p = newProfile();
    p.focus = 10;
    restoreFocus(p, 25);
    expect(p.focus).toBe(35);
    restoreFocus(p, 500);
    expect(p.focus).toBe(100);
    p.focus = 3;
    const r = sleep(p, 110);
    expect(p.day).toBe(2);
    expect(p.focus).toBe(110);
    expect(r.day).toBe(2);
  });

  it('events recur weekly and seasons rotate', () => {
    expect(eventFor(7)).toBe(EVENTS.festival);
    expect(eventFor(3)).toBe(EVENTS.pasar);
    expect(eventFor(5)).toBe(EVENTS.padam);
    expect(eventFor(1)).toBeNull();
    expect(seasonName(1)).toBe('Kemarau');
    expect(seasonName(15)).toBe('Pancaroba');
    expect(seasonName(29)).toBe('Penghujan');
  });
});

import { perksFor } from '../src/game/perks.js';
import { talk } from '../src/game/npc.js';
import { collect, startContract } from '../src/game/retainer.js';
import { siteById } from '../src/sites/index.js';

describe('weekly events change the numbers, softly', () => {
  it('Lomba Mingguan doubles contracts and boosts talks', () => {
    const p = newProfile();
    p.day = 7;
    const m = perksFor(p);
    expect(m.retainerMult).toBe(2);
    expect(talk(p, 'laras', m).gain).toBe(5);
    const q = newProfile();
    q.day = 7; q.cleared.s00 = 'x'; startContract(q, 's00');
    const normal = (() => { const r = newProfile(); r.cleared.s00 = 'x'; startContract(r, 's00'); return collect(r, 's00', siteById('s00')).credits; })();
    expect(collect(q, 's00', siteById('s00'), perksFor(q)).credits).toBe(normal * 2);
  });

  it('Pemadaman slows loading but pays overtime', () => {
    const p = newProfile();
    p.day = 5;
    const m = perksFor(p);
    expect(m.loading).toBe(1.5);
    expect(m.retainerMult).toBe(1.3);
  });

  it('ordinary days are neutral', () => {
    const m = perksFor(newProfile());
    expect(m.loading).toBe(1);
    expect(m.retainerMult).toBe(1);
    expect(m.marketDiscount).toBe(0);
    expect(m.event).toBeNull();
  });
});
