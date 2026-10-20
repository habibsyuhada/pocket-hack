import { describe, it, expect } from 'vitest';
import { enterNode, leaveNode, tickTrace, lockLeft, budgetLeft, LOCKOUT_MS } from '../src/engine/trace.js';
import { exec, getActions } from '../src/engine/actions.js';
import { CITY } from '../src/city/index.js';
import { game, dev, walk, go } from './helpers/city.js';

const node = { id: 'n1', trace: 100 };
const fresh = () => ({ current: 'n1', devices: {} });

describe('trace timer', () => {
  it('only traced nodes start a timer', () => {
    const run = fresh();
    enterNode(run, { id: 'plain' }, 0);
    expect(run.trace).toBeNull();
    enterNode(run, node, 0);
    expect(run.trace).toEqual({ id: 'n1', left: 100000 });
  });

  it('kicks you out when the time is up and locks the node for 30 seconds', () => {
    const run = fresh();
    enterNode(run, node, 0);
    expect(tickTrace(run, 99000, 99000)).toBeNull();
    const kick = tickTrace(run, 1500, 100500);
    expect(kick).toEqual({ id: 'n1' });
    expect(run.current).toBeNull();
    expect(run.trace).toBeNull();
    expect(lockLeft(run, 'n1', 100500)).toBe(LOCKOUT_MS);
    expect(lockLeft(run, 'n1', 100500 + LOCKOUT_MS)).toBe(0);
    // after the lockout you start again with a full budget
    expect(budgetLeft(run, node, 100500 + LOCKOUT_MS)).toBe(100000);
  });

  it('leaving early keeps what is left, and it recovers while you are away', () => {
    const run = fresh();
    enterNode(run, node, 0);
    tickTrace(run, 60000, 60000);
    leaveNode(run, 60000);
    expect(run.exposure.n1.left).toBe(40000);
    expect(budgetLeft(run, node, 60000)).toBe(40000);
    expect(budgetLeft(run, node, 90000)).toBe(70000);        // +1 s per second away
    expect(budgetLeft(run, node, 500000)).toBe(100000);      // capped at the full budget
  });
});

describe('trace in the city', () => {
  it('secured mission nodes carry a timer, tutorial missions and plain nodes do not', () => {
    const d = CITY.world.devices;
    expect(d.dvr.trace).toBeGreaterThan(0);
    expect(d.s21_plc.trace).toBeLessThan(d.dvr.trace);        // harder missions give less time
    expect(d.printer.trace).toBeUndefined();                  // s00 is the tutorial
    expect(d.isp_core.trace).toBeUndefined();
  });

  it('connecting starts the timer, a kick blocks CONNECT with a reason, and the lockout ends', () => {
    const ctx = game();
    ctx.run.devices.dvr.discovered = true;
    walk(ctx, 'isp_core', 'utara_hub', 'gw');
    go(ctx, 'dvr');
    expect(ctx.run.trace.id).toBe('dvr');
    const now = Date.now();
    tickTrace(ctx.run, 10 * 60000, now);                      // way past the budget
    expect(ctx.run.current).toBeNull();
    const a = getActions(ctx, dev('dvr')).find((x) => x.cmd === 'CONNECT');
    expect(a.enabled).toBe(false);
    expect(a.reason).toMatch(/30|29/);
    ctx.run.locked.dvr = now - 1;                             // lockout over
    walk(ctx, 'gw');
    const b = getActions(ctx, dev('dvr')).find((x) => x.cmd === 'CONNECT');
    expect(b.enabled).toBe(true);
    exec(ctx, 'DISCONNECT', { type: 'rig' });
    expect(ctx.run.trace).toBeNull();
  });
});
