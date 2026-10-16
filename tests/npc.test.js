import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { sleep } from '../src/game/time.js';
import { addItem, countOf, contractDrop, MISSION_ITEMS, addAll } from '../src/game/items.js';
import { NPCS, levelOf, talk, gift, canTalk, canGift, npcSpot, isVisible, npcLevel, missionBond, npcState } from '../src/game/npc.js';
import { perksFor } from '../src/game/perks.js';
import { MARKET, buy, priceFor } from '../src/game/market.js';
import { finish } from '../src/engine/actions.js';
import { newRun } from '../src/engine/core.js';
import { siteById } from '../src/sites/index.js';

const item = (id) => MARKET.find((m) => m.id === id);

describe('inventory', () => {
  it('adds, counts and drops on alternate days', () => {
    const p = newProfile();
    addItem(p, 'kue', 2);
    expect(countOf(p, 'kue')).toBe(2);
    addAll(p, MISSION_ITEMS.s03);
    expect(countOf(p, 'rongsok')).toBe(1);
    expect(contractDrop('s00', 2)).toBe('kue');
    expect(contractDrop('s00', 3)).toBeNull();
  });
});

describe('npc friendship', () => {
  it('levels follow the affinity steps', () => {
    expect([0, 9, 10, 24, 25, 44, 45, 69, 70, 200].map(levelOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('talk once per day, resets after sleeping', () => {
    const p = newProfile();
    expect(canTalk(p, 'laras')).toBe(true);
    const r = talk(p, 'laras');
    expect(r.gain).toBe(3);
    expect(talk(p, 'laras')).toBeNull();
    sleep(p);
    expect(canTalk(p, 'laras')).toBe(true);
  });

  it('liked gifts give more affinity and are consumed; one gift per day', () => {
    const p = newProfile();
    addItem(p, 'kue', 1); addItem(p, 'komponen', 1);
    const liked = gift(p, 'laras', 'kue');
    expect(liked.liked).toBe(true);
    expect(npcState(p, 'laras').aff).toBe(8);
    expect(countOf(p, 'kue')).toBe(0);
    expect(canGift(p, 'laras')).toBe(false);
    expect(gift(p, 'laras', 'komponen')).toBeNull();
    sleep(p);
    expect(gift(p, 'dimas', 'komponen').liked).toBe(true);
  });

  it('cannot gift an item you do not have', () => {
    expect(gift(newProfile(), 'laras', 'kue')).toBeNull();
  });

  it('Laras gives free coffee from level 1', () => {
    const p = newProfile();
    npcState(p, 'laras').aff = 9;
    talk(p, 'laras'); // 12 -> level 1 reached by this talk
    expect(countOf(p, 'kopi')).toBe(1);
  });

  it('Rani level 2 reveals a locked site; Mbah Gun level 2 unlocks SEARCH', () => {
    const p = newProfile();
    npcState(p, 'rani').aff = 23;
    const r = talk(p, 'rani');
    expect(r.notes.some((n) => /membocorkan/.test(n))).toBe(true);
    expect(Object.keys(p.intel).length).toBe(1);
    npcState(p, 'gun').aff = 23;
    talk(p, 'gun');
    expect(p.cmds).toContain('SEARCH');
  });

  it('clearing a mission warms up its NPC once', () => {
    const p = newProfile();
    missionBond(p, 's00');
    expect(npcState(p, 'laras').aff).toBe(10);
    expect(npcLevel(p, 'laras')).toBe(1);
  });

  it('NPCs walk a daily route and appear by reputation', () => {
    const laras = NPCS.find((n) => n.id === 'laras');
    expect(npcSpot(laras, 1)).not.toEqual(npcSpot(laras, 2));
    expect(npcSpot(laras, 1)).toEqual(npcSpot(laras, 4));
    const p = newProfile();
    expect(isVisible(p, laras)).toBe(true);
    expect(isVisible(p, NPCS.find((n) => n.id === 'gun'))).toBe(false);
    p.rep = 120;
    expect(isVisible(p, NPCS.find((n) => n.id === 'gun'))).toBe(true);
  });

  it('no two NPCs ever share a map spot on the same day', () => {
    for (let day = 1; day <= 12; day++) {
      const keys = NPCS.map((n) => JSON.stringify(npcSpot(n, day)));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('perks', () => {
  it('are neutral by default and grow with friendship', () => {
    const p = newProfile();
    const base = perksFor(p);
    expect(base.focusCost).toBe(1);
    expect(base.hintCost).toBe(10);
    npcState(p, 'dimas').aff = 70;
    npcState(p, 'rani').aff = 45;
    npcState(p, 'laras').aff = 25;
    const m = perksFor(p);
    expect(m.focusCost).toBe(0.7);
    expect(m.hintCost).toBe(5);
    expect(m.focusMax).toBe(110);
    expect(m.speedDiscount).toBe(0.4);
  });

  it('discounts lower market prices (Overclock via Dimas, events too)', () => {
    const p = newProfile();
    const full = priceFor(p, item('speed_1'));
    npcState(p, 'dimas').aff = 10;
    expect(priceFor(p, item('speed_1'))).toBeLessThan(full);
    p.day = 3; // Hari Pasar: -20%
    expect(priceFor(p, item('cmd_search'))).toBe(Math.round(70 * 0.8));
    p.credits = 1000;
    const before = p.credits;
    buy(p, 'cmd_search');
    expect(before - p.credits).toBe(56);
  });

  it('Mbah Gun level 4 and Rani level 4 raise mission payouts', () => {
    const site = siteById('s00');
    const mk = () => ({ mission: site, run: newRun(site), profile: newProfile() });
    const plain = finish(mk(), 'deliver', { repReward: 40 });
    const boosted = finish(mk(), 'deliver', { repReward: 40, creditMult: 1.2, repMult: 1.25 });
    expect(boosted.reward).toBe(Math.round(plain.reward * 1.2));
    expect(boosted.rep).toBe(50);
  });
});
