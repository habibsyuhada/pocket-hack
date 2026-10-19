import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { dayIndex, weekdayOf, fmtDate, fmtDateShort, syncDay, focusState, focusCostFor, loadingMult, fatigueMult, sleepPlan, fmtGameTime, fmtClock, startSleep, sleepProgress, finishSleep, wakeEarly, spendFocus, restoreFocus, advanceDay, eventFor, seasonName, EVENTS } from '../src/game/time.js';

describe('day & focus', () => {
  it('new profile starts on the real calendar day with full focus', () => {
    const p = newProfile();
    expect(p.day).toBe(dayIndex());
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

  it('sleep takes 1 real minute per missing Fokus point, at least a 5 minute nap', () => {
    const p = newProfile();
    p.focus = 100;
    expect(sleepPlan(p).minutes).toBe(5);              // already rested: just a nap
    p.focus = 20;
    expect(sleepPlan(p).missing).toBe(80);
    expect(sleepPlan(p).minutes).toBe(80);
    expect(sleepPlan(p).ms).toBe(80 * 60000);          // real time, not sped up
    p.focus = 0;
    expect(sleepPlan(p).minutes).toBe(100);
    expect(fmtGameTime(80)).toBe('1 jam 20 mnt');
    expect(fmtGameTime(60)).toBe('1 jam');
    expect(fmtGameTime(45)).toBe('45 mnt');
    expect(fmtClock(4825000)).toBe('1:20:25');
    expect(fmtClock(95000)).toBe('1:35');
    expect(fmtClock(0)).toBe('0:00');
  });

  it('sleep runs on timestamps: it survives a restart and settles when you come back', () => {
    const p = newProfile();
    p.focus = 40;
    const today = p.day;
    const t0 = 1_000_000;
    startSleep(p, 100, t0);
    expect(p.sleeping.minutes).toBe(60);
    // 15 minutes in: +15 Fokus shown, still asleep
    expect(sleepProgress(p, t0 + 15 * 60000).focusNow).toBe(55);
    expect(finishSleep(p, t0 + 15 * 60000)).toBeNull();
    // the app was closed for 2 hours: it settles on open
    const info = finishSleep(p, t0 + 120 * 60000);
    expect(info.slept).toBe(60);
    expect(p.focus).toBe(100);
    expect(p.sleeping).toBeNull();
    expect(p.day).toBe(today);                         // the date is the real one: sleeping never moves it
  });

  it('waking early keeps the rest so far', () => {
    const p = newProfile();
    p.focus = 40;
    const today = p.day;
    const t0 = 5_000_000;
    startSleep(p, 100, t0);
    const got = wakeEarly(p, t0 + 20 * 60000);
    expect(got).toBe(20);
    expect(p.focus).toBe(60);
    expect(p.day).toBe(today);
    expect(p.sleeping).toBeNull();
    expect(wakeEarly(p, t0 + 99999999)).toBe(0);       // not sleeping any more
  });

  it('restoreFocus caps at max', () => {
    const p = newProfile();
    p.focus = 10;
    restoreFocus(p, 25);
    expect(p.focus).toBe(35);
    restoreFocus(p, 500);
    expect(p.focus).toBe(100);
  });

  it('the date is the real calendar date', () => {
    // 2026-10-21 is a Wednesday
    const d = dayIndex(new Date(2026, 9, 21, 15, 30).getTime());
    expect(weekdayOf(d)).toBe(3);
    expect(fmtDate(d)).toBe('Rabu, 21 Oktober');
    expect(fmtDateShort(d)).toBe('Rab 21 Okt');
    // late evening and early morning are still the same / next calendar day
    expect(dayIndex(new Date(2026, 9, 21, 23, 59).getTime())).toBe(d);
    expect(dayIndex(new Date(2026, 9, 22, 0, 1).getTime())).toBe(d + 1);
  });

  it('syncDay follows the clock and reports a rollover', () => {
    const p = newProfile();
    const noon = new Date(2026, 9, 21, 12).getTime();
    expect(syncDay(p, noon)).toBe(true);
    expect(syncDay(p, noon + 3600000)).toBe(false);
    expect(syncDay(p, noon + 24 * 3600000)).toBe(true);
    expect(p.day).toBe(dayIndex(noon) + 1);
  });

  it('weekly events follow the real weekday; seasons follow the month', () => {
    expect(eventFor(onWeekday(0))).toBe(EVENTS.festival);   // Minggu
    expect(eventFor(onWeekday(3))).toBe(EVENTS.pasar);      // Rabu
    expect(eventFor(onWeekday(5))).toBe(EVENTS.padam);      // Jumat
    expect(eventFor(onWeekday(4))).toBe(EVENTS.kampus);     // Kamis
    expect(eventFor(onWeekday(6))).toBe(EVENTS.subuh);      // Sabtu
    for (const w of [1, 2]) expect(eventFor(onWeekday(w))).toBeNull();
    expect(seasonName(dayIndex(new Date(2026, 6, 10).getTime()))).toBe('Kemarau');
    expect(seasonName(dayIndex(new Date(2026, 0, 10).getTime()))).toBe('Penghujan');
    expect(seasonName(dayIndex(new Date(2026, 3, 10).getTime()))).toBe('Pancaroba');
  });
});

// a day index that falls on this weekday (0 = Minggu), counting forward from today
function onWeekday(w, from = dayIndex()) { let d = from; while (weekdayOf(d) !== w) d++; return d; }

import { perksFor } from '../src/game/perks.js';
import { talk } from '../src/game/npc.js';
import { collect, startContract } from '../src/game/retainer.js';
import { siteById } from '../src/sites/index.js';

describe('weekly events change the numbers, softly', () => {
  it('Lomba Mingguan doubles contracts and boosts talks', () => {
    const p = newProfile();
    p.day = onWeekday(0);
    const m = perksFor(p);
    expect(m.retainerMult).toBe(2);
    expect(talk(p, 'laras', m).gain).toBe(5);
    const q = newProfile();
    q.day = onWeekday(0); q.cleared.s00 = 'x'; startContract(q, 's00');
    const normal = (() => { const r = newProfile(); r.cleared.s00 = 'x'; startContract(r, 's00'); return collect(r, 's00', siteById('s00')).credits; })();
    expect(collect(q, 's00', siteById('s00'), perksFor(q)).credits).toBe(normal * 2);
  });

  it('Pemadaman slows loading but pays overtime', () => {
    const p = newProfile();
    p.day = onWeekday(5);
    const m = perksFor(p);
    expect(m.loading).toBe(1.5);
    expect(m.retainerMult).toBe(1.3);
  });

  it('ordinary days are neutral', () => {
    const quiet = newProfile(); quiet.day = onWeekday(1);
    const m = perksFor(quiet);
    expect(m.loading).toBe(1);
    expect(m.retainerMult).toBe(1);
    expect(m.marketDiscount).toBe(0);
    expect(m.event).toBeNull();
  });
});
