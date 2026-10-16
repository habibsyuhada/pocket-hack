import { describe, it, expect } from 'vitest';
import { newProfile, hasCmd, loadMs, LOAD_MS } from '../src/game/profile.js';
import { newRun } from '../src/engine/core.js';
import { exec } from '../src/engine/actions.js';
import { CMD_META, DEFAULT_CMDS, GROUPS, commandTargets, groupCommands } from '../src/engine/commands.js';
import { MARKET, buy } from '../src/game/market.js';
import { SITES } from '../src/sites/index.js';

// Commands the four sites actually reference (via actions used in their flows).
const SITE_CMDS = ['SCAN', 'INSPECT', 'CONNECT', 'DISCONNECT', 'LOGIN', 'CRACK', 'EXPLOIT', 'ELEVATE',
  'READ', 'DOWNLOAD', 'RECOVER', 'DECRYPT', 'COMPARE', 'STOP', 'START', 'CONFIG', 'RESTORE', 'CONTROL'];

describe('command catalog', () => {
  it('every command used by the 4 sites is unlocked by default', () => {
    for (const c of SITE_CMDS) expect(DEFAULT_CMDS).toContain(c);
  });

  it('fresh profile has all default commands and none of the locked extras', () => {
    const p = newProfile();
    for (const c of DEFAULT_CMDS) expect(hasCmd(p, c)).toBe(true);
    for (const c of ['SEARCH', 'UPLOAD', 'EDIT', 'ROUTE', 'TOOLS', 'RUN', 'QUEUE', 'SCRIPT']) expect(hasCmd(p, c)).toBe(false);
  });

  it('every command has metadata and belongs to a listed group', () => {
    const groups = new Set(['explore', 'access', 'server', 'feature', 'auto']);
    for (const [cmd, meta] of Object.entries(CMD_META)) {
      expect(groups.has(meta.group)).toBe(true);
      expect(typeof meta.desc).toBe('string');
    }
    // every group lists at least one command
    for (const g of groups) expect(groupCommands(g).length).toBeGreaterThan(0);
  });

  it('catalog has one Server group: FILES, SERVICES, CONTROL — no file/service commands', () => {
    expect(groupCommands('server').sort()).toEqual(['CONTROL', 'FILES', 'SERVICES']);
    expect(GROUPS.map((g) => g.id)).toEqual(['explore', 'access', 'server', 'auto']);
  });

  it('commandTargets lists reachable devices for CONNECT', () => {
    const site = SITES.find((s) => s.id === 's00');
    const ctx = { mission: site, run: newRun(site), profile: newProfile() };
    exec(ctx, 'SCAN', { type: 'rig' }); // reveal router (entry)
    const targets = commandTargets(ctx, 'CONNECT');
    expect(targets.some((t) => t.target.id === 'router' && t.enabled)).toBe(true);
  });

  it('commandTargets for file commands needs a connected node', () => {
    const site = SITES.find((s) => s.id === 's00');
    const ctx = { mission: site, run: newRun(site), profile: newProfile() };
    expect(commandTargets(ctx, 'READ')).toEqual([]);
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    const reads = commandTargets(ctx, 'READ');
    expect(reads.some((t) => t.label.includes('catatan_staf'))).toBe(true);
  });

  it('market unlocks a command', () => {
    const p = newProfile();
    p.credits = 200;
    expect(hasCmd(p, 'SEARCH')).toBe(false);
    const r = buy(p, 'cmd_search');
    expect(r.ok).toBe(true);
    expect(hasCmd(p, 'SEARCH')).toBe(true);
  });

  it('automation bundle unlocks all four commands', () => {
    const p = newProfile();
    p.credits = 500;
    buy(p, 'cmd_automation');
    for (const c of ['TOOLS', 'RUN', 'QUEUE', 'SCRIPT']) expect(hasCmd(p, c)).toBe(true);
  });

  it('SEARCH lists files of the connected node', () => {
    const site = SITES.find((s) => s.id === 's00');
    const ctx = { mission: site, run: newRun(site), profile: newProfile() };
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    const before = ctx.run.log.length;
    exec(ctx, 'SEARCH', { type: 'device', id: 'router' });
    expect(ctx.run.log.length).toBeGreaterThan(before);
    expect(ctx.run.log.some((e) => /Memindai/.test(e.text))).toBe(true);
  });

  it('CONNECT does not auto-reveal linked devices; SCAN does', () => {
    const site = SITES.find((s) => s.id === 's00');
    const ctx = { mission: site, run: newRun(site), profile: newProfile() };
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    expect(ctx.run.devices.printer.discovered).toBe(false);
    exec(ctx, 'SCAN', { type: 'device', id: 'router' });
    expect(ctx.run.devices.printer.discovered).toBe(true);
  });

  it('loading time shrinks with market Overclock upgrades', () => {
    const p = newProfile();
    p.credits = 1000;
    expect(loadMs(p)).toBe(LOAD_MS[0]);
    expect(buy(p, 'speed_2').ok).toBe(false); // needs Overclock I first
    for (const id of ['speed_1', 'speed_2', 'speed_3']) expect(buy(p, id).ok).toBe(true);
    expect(loadMs(p)).toBe(LOAD_MS[3]);
  });
});
