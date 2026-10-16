import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { focusState, focusCostFor, loadingMult, spendFocus, restoreFocus, sleep, eventFor, seasonName, EVENTS } from '../src/game/time.js';

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
    p.focus = 5;
    expect(loadingMult(p, { loading: 1.5 })).toBe(2.5 * 1.5);
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
