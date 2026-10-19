import { describe, it, expect } from 'vitest';
import { newProfile } from '../src/game/profile.js';
import { NPCS, npcState, talk } from '../src/game/npc.js';
import { MISSIONS, offersFrom, waitingOn, nodeState, isAccepted } from '../src/game/world.js';
import { DIALOGUES, greetingFor, talkSceneFor, offerSceneFor, noOfferLine, giftLines, bandOf } from '../src/game/dialogues.js';
import { PLACEHOLDER } from '../src/ui/portraits.js';

describe('dialogue content is complete', () => {
  it('every NPC has greetings for all 5 levels and talks for every band', () => {
    for (const n of NPCS) {
      const d = DIALOGUES[n.id];
      expect(d, n.id).toBeTruthy();
      expect(d.greet.length).toBe(5);
      for (const g of d.greet) expect(g.length).toBeGreaterThan(0);
      for (const band of ['low', 'mid', 'high']) expect(d.talks.some((s) => s.band === band), `${n.id} ${band}`).toBe(true);
      expect(giftLines(n.id, true).length).toBeGreaterThan(0);
      expect(giftLines(n.id, false).length).toBeGreaterThan(0);
      expect(noOfferLine(n.id, 'locked')).toBeTruthy();
      expect(noOfferLine(n.id, 'none')).toBeTruthy();
      expect(PLACEHOLDER[n.id], `placeholder for ${n.id}`).toBeTruthy();
    }
  });

  it('every talk scene has well-formed lines and choices', () => {
    for (const n of NPCS) for (const s of DIALOGUES[n.id].talks) {
      expect(s.lines.length).toBeGreaterThan(0);
      for (const l of s.lines) { expect(['npc', 'you']).toContain(l.who); expect(l.text.length).toBeGreaterThan(0); }
      if (s.choice) {
        expect(s.choice.options.length).toBeGreaterThanOrEqual(2);
        for (const o of s.choice.options) { expect(o.label).toBeTruthy(); expect(o.lines.length).toBeGreaterThan(0); expect(o.bonus).toBeGreaterThanOrEqual(0); }
      }
    }
  });

  it('every mission has an NPC giver with an offer scene', () => {
    for (const m of MISSIONS) {
      const offer = offerSceneFor(m.giver, m.id);
      expect(offer, `${m.giver} offer for ${m.id}`).toBeTruthy();
      expect(offer.lines.length).toBeGreaterThan(0);
      expect(offer.onAccept.length).toBeGreaterThan(0);
      expect(offer.onDecline.length).toBeGreaterThan(0);
      expect(offer.accept && offer.decline).toBeTruthy();
    }
  });

  it('scene choice picks the band from the friendship level and is deterministic', () => {
    expect(bandOf(0)).toBe('low'); expect(bandOf(3)).toBe('mid'); expect(bandOf(4)).toBe('high');
    expect(talkSceneFor('laras', 0, 1, 0).id).toBe(talkSceneFor('laras', 0, 1, 0).id);
    expect(talkSceneFor('laras', 4, 1, 0).band).toBe('high');
    expect(greetingFor('rani', 2, 1)).toBeTruthy();
  });

  it('choice bonus adds to the daily talk gain', () => {
    const a = newProfile(), b = newProfile();
    talk(a, 'laras', {}, 0);
    talk(b, 'laras', {}, 2);
    expect(npcState(b, 'laras').aff - npcState(a, 'laras').aff).toBe(2);
  });
});

describe('missions come from NPCs', () => {
  it('a new player is offered only the first Laras mission', () => {
    const p = newProfile();
    expect(offersFrom(p, 'laras').map((m) => m.id)).toEqual(['s00']);
    expect(waitingOn(p, 'laras').map((m) => m.id)).toEqual(['s04']);
    expect(offersFrom(p, 'rani')).toEqual([]); // Rani not met yet (needs reputation)
  });

  it('friendship opens the next mission of the same giver', () => {
    const p = newProfile();
    p.accepted.s00 = true;
    npcState(p, 'laras').aff = 10; // level 1
    expect(offersFrom(p, 'laras').map((m) => m.id)).toEqual(['s04']);
    expect(isAccepted(p, 's00')).toBe(true);
    expect(nodeState(p, 's00')).toBe('accepted');
  });

  it('reputation reveals the other givers', () => {
    const p = newProfile();
    p.rep = 130;
    expect(offersFrom(p, 'rani').map((m) => m.id)).toEqual(['s02']);
    expect(offersFrom(p, 'dimas').map((m) => m.id)).toEqual(['s06']);
    expect(offersFrom(p, 'gun').map((m) => m.id)).toEqual(['s03']);
  });
});
