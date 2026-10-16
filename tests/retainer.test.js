import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { sleep } from '../src/game/time.js';
import { canContract, startContract, pendingDays, payout, collect, payPerDay, MAX_BACKLOG } from '../src/game/retainer.js';
import { siteById } from '../src/sites/index.js';

describe('retainers', () => {
  const site = siteById('s00');

  it('needs a cleared mission and can only be taken once', () => {
    const p = newProfile();
    expect(canContract(p, 's00')).toBe(false);
    expect(startContract(p, 's00')).toBe(false);
    p.cleared.s00 = 'deliver';
    expect(canContract(p, 's00')).toBe(true);
    expect(startContract(p, 's00')).toBe(true);
    expect(canContract(p, 's00')).toBe(false);
  });

  it('pays within 15-35 per day and is due the day it starts', () => {
    const p = newProfile();
    p.cleared.s00 = 'x';
    startContract(p, 's00');
    expect(payPerDay(site)).toBeGreaterThanOrEqual(15);
    expect(payPerDay(site)).toBeLessThanOrEqual(35);
    expect(pendingDays(p, 's00')).toBe(1);
  });

  it('collecting pays once per day; the next day it is due again', () => {
    const p = newProfile();
    p.cleared.s00 = 'x';
    startContract(p, 's00');
    const before = p.credits;
    const r = collect(p, 's00', site);
    expect(r.credits).toBe(payPerDay(site));
    expect(p.credits).toBe(before + r.credits);
    expect(collect(p, 's00', site)).toBeNull();
    sleep(p);
    expect(pendingDays(p, 's00')).toBe(1);
  });

  it('skipped days stack up to the backlog cap, with no penalty', () => {
    const p = newProfile();
    p.cleared.s00 = 'x';
    startContract(p, 's00');
    collect(p, 's00', site);
    for (let i = 0; i < 6; i++) sleep(p);
    expect(pendingDays(p, 's00')).toBe(MAX_BACKLOG);
    expect(payout(p, 's00', site)).toBe(payPerDay(site) * MAX_BACKLOG);
  });

  it('event / perk multipliers scale the payout', () => {
    const p = newProfile();
    p.cleared.s00 = 'x';
    startContract(p, 's00');
    expect(payout(p, 's00', site, { retainerMult: 2 })).toBe(payPerDay(site) * 2);
  });
});
