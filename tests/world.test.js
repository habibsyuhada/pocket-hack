import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { rankFor, nextRank, rankProgress, RANKS } from '../src/game/progression.js';
import { nodeState, availableJobs, WORLD_NODES } from '../src/game/world.js';
import { MARKET, buy, canBuy, owned } from '../src/game/market.js';

describe('progression', () => {
  it('rep maps to rank ladder', () => {
    expect(rankFor(0).name).toBe('Script Kiddie');
    expect(rankFor(70).name).toBe('Runner');
    expect(rankFor(99999).id).toBe(RANKS[RANKS.length - 1].id);
    expect(nextRank(0).name).toBe('Runner');
    expect(nextRank(99999)).toBe(null);
    expect(rankProgress(99999)).toBe(1);
    expect(rankProgress(30)).toBeGreaterThan(0);
    expect(rankProgress(30)).toBeLessThan(1);
  });
});

describe('world gating', () => {
  it('first site open, higher sites locked until rep/intel', () => {
    const p = newProfile();
    expect(nodeState(p, 's00')).toBe('open');
    expect(nodeState(p, 's03')).toBe('locked');
    p.rep = 160;
    expect(nodeState(p, 's03')).toBe('open');
  });

  it('intel unlocks a site without rep', () => {
    const p = newProfile();
    p.intel.s03 = true;
    expect(nodeState(p, 's03')).toBe('open');
  });

  it('cleared sites report cleared', () => {
    const p = newProfile();
    p.cleared.s00 = 'deliver';
    expect(nodeState(p, 's00')).toBe('cleared');
  });

  it('job board hides locked sites', () => {
    const p = newProfile();
    const jobs = availableJobs(p);
    expect(jobs.some((j) => j.siteId === 's00')).toBe(true);
    expect(jobs.some((j) => j.siteId === 's03')).toBe(false);
  });
});

describe('market', () => {
  it('buy deducts credits and unlocks tool', () => {
    const p = newProfile();
    p.credits = 200;
    const item = MARKET.find((m) => m.id === 'buy_cipher');
    expect(owned(p, item)).toBe(false);
    const r = buy(p, 'buy_cipher');
    expect(r.ok).toBe(true);
    expect(p.credits).toBe(200 - item.cost);
    expect(p.tools.cipher).toBe(true);
    expect(owned(p, item)).toBe(true);
  });

  it('cannot buy without enough credits', () => {
    const p = newProfile();
    p.credits = 10;
    expect(canBuy(p, MARKET.find((m) => m.id === 'buy_skeleton')).ok).toBe(false);
    expect(buy(p, 'buy_skeleton').ok).toBe(false);
    expect(p.credits).toBe(10);
  });

  it('intel buy reveals the site', () => {
    const p = newProfile();
    p.credits = 200;
    buy(p, 'intel_s03');
    expect(p.intel.s03).toBe(true);
    expect(nodeState(p, 's03')).toBe('open');
  });
});

describe('all world nodes resolve to a site', () => {
  it('every map node has a loadable site', async () => {
    const { siteById } = await import('../src/sites/index.js');
    for (const n of WORLD_NODES) expect(siteById(n.id)).toBeTruthy();
  });
});
