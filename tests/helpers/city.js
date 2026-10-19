// Shared helpers for mission tests: a fresh game on the shared city graph,
// moves that obey the real CONNECT rules, and small target builders.
import { expect } from 'vitest';
import { newProfile, newRun } from '../../src/engine/core.js';
import { exec, getActions } from '../../src/engine/actions.js';
import { CITY, START_NODES } from '../../src/city/index.js';
import { SITES } from '../../src/sites/index.js';

export const mission = (id) => SITES.find((s) => s.id === id);

// A fresh game: shared city run, only the rig's ISP uplink is known.
export function game() {
  const profile = newProfile();
  const run = newRun(CITY);
  for (const id of START_NODES) run.devices[id].discovered = true;
  return { mission: CITY, run, profile };
}
// Accepting a mission reveals its start node(s) on the map (not a route to them).
export function accept(ctx, id) { for (const e of mission(id).entry) ctx.run.devices[e].discovered = true; ctx.profile.accepted[id] = true; }
export const dev = (id) => ({ type: 'device', id });
export const file = (d, id) => ({ type: 'file', device: d, id });
export const local = (id) => ({ type: 'file', local: true, id });
export const proc = (d, id) => ({ type: 'proc', device: d, id });
export const control = (d, id) => ({ type: 'control', device: d, id });
export const done = (ctx, id) => mission(id).objectives.find((o) => o.main).done(ctx.run);

// Moves are checked against the real rules: CONNECT must be an enabled option.
export function go(ctx, id) {
  const a = getActions(ctx, dev(id)).find((x) => x.cmd === 'CONNECT');
  expect(a, `no CONNECT option for ${id}`).toBeTruthy();
  expect(a.enabled, `${id}: ${a.reason}`).toBe(true);
  exec(ctx, 'CONNECT', dev(id));
}
// connect + scan each hop, like a player walking the graph
export function walk(ctx, ...ids) { for (const id of ids) { go(ctx, id); exec(ctx, 'SCAN', dev(id)); } }
// ROUTE hop (needs the command, and admin on the relay)
export function route(ctx, id) {
  const a = getActions(ctx, dev(id)).find((x) => x.cmd === 'ROUTE');
  expect(a, `no ROUTE option for ${id}`).toBeTruthy();
  expect(a.enabled, `${id}: ${a.reason}`).toBe(true);
  exec(ctx, 'ROUTE', dev(id));
}
// The action must be offered AND enabled, then runs it.
export function must(ctx, cmd, target, arg) {
  const a = getActions(ctx, target).find((x) => x.cmd === cmd);
  expect(a, `${cmd} not offered for ${JSON.stringify(target)}`).toBeTruthy();
  expect(a.enabled, `${cmd}: ${a.reason}`).toBe(true);
  return exec(ctx, cmd, target, arg);
}
