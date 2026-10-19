// Handing in a mission happens in person: talk to the mission's giver once the
// main objective is done. Pure logic; the dialogue UI is in ui/app.js.
import { endings } from '../engine/actions.js';
import { MISSIONS, isAccepted } from './world.js';
import { siteById } from '../sites/index.js';

// Accepted, not yet cleared missions of this NPC that have at least one ending available.
export function readyFrom(ctx, profile, npcId) {
  return MISSIONS.filter((m) => m.giver === npcId && isAccepted(profile, m.id) && !profile.cleared[m.id]
    && endings({ ...ctx, mission: siteById(m.id) }).some((e) => e.available));
}

// The endings the player can pick right now for one mission.
export const endingsFor = (ctx, missionId) => endings({ ...ctx, mission: siteById(missionId) }).filter((e) => e.available);

// Is this mission finished (main objectives done) but not handed in?
export const awaitingTurnIn = (ctx, profile, missionId) =>
  isAccepted(profile, missionId) && !profile.cleared[missionId] && endingsFor(ctx, missionId).length > 0;
