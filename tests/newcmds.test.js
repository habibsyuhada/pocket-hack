import { describe, it, expect } from 'vitest';
import { newProfile, newRun, device } from '../src/engine/core.js';
import { exec, getActions, getChoices } from '../src/engine/actions.js';
import { commandTargets } from '../src/engine/commands.js';

// A tiny synthetic mission exercising the v1 commands.
const mission = {
  id: 'x', entry: ['a'], rigScan: ['a'], creds: {}, clues: { cl: { title: 'Petunjuk uji', text: '' } }, diffs: {},
  world: {
    devices: {
      a: { id: 'a', name: 'Relay', kind: 'Gateway', addr: '10.0.0.1', online: true, open: 'guest', routes: ['b'], routeAccess: 'admin',
        inspect: 'relay', links: [], sniff: { text: 'user=admin pass=1234', fx: { clues: ['cl'] } },
        files: [
          { id: 'jadwal', name: 'jadwal.txt', minAccess: 'guest', content: 'Obat A jam 08', edit: { options: ['Obat A jam 07', 'Obat A jam 09'], answer: 'Obat A jam 07', result: { content: 'Obat A jam 07' }, onDone: { flags: ['edited'] }, minAccess: 'guest' } },
          { id: 'pesan', name: 'pesan.txt', minAccess: 'guest', content: 'dari: ???', trace: { text: 'Asal: 10.0.0.9', fx: { flags: ['traced'], reveal: ['b'] } } }
        ],
        uploads: [{ file: 'patch', minAccess: 'guest', text: 'Patch terpasang.', fx: { flags: ['patched'] } }] },
      b: { id: 'b', name: 'Dermaga', kind: 'Server', addr: '10.9.0.1', online: true, open: 'guest', inspect: 'b', links: [], routes: ['a'] },
      c: { id: 'c', name: 'Mati', kind: 'Server', addr: '10.9.0.2', online: false, inspect: 'c', links: [] }
    }
  }
};
const dev = (id) => ({ type: 'device', id });
const file = (d, id) => ({ type: 'file', device: d, id });
function game(extra = {}) {
  const profile = newProfile();
  Object.assign(profile, extra);
  const run = newRun(mission);
  run.devices.a.discovered = true;
  return { mission, run, profile };
}
const act = (ctx, target, cmd) => getActions(ctx, target).find((x) => x.cmd === cmd);

describe('PING', () => {
  it('is free to use and reports online / offline', () => {
    const ctx = game(); ctx.run.devices.c.discovered = true;
    expect(act(ctx, dev('a'), 'PING').enabled).toBe(true);
    expect(exec(ctx, 'PING', dev('a')).out.some((l) => /ms/.test(l.text))).toBe(true);
    expect(exec(ctx, 'PING', dev('c')).out.some((l) => /offline/.test(l.text))).toBe(true);
    expect(commandTargets(ctx, 'PING').map((r) => r.target.id)).toContain('a');
  });
});

describe('ROUTE', () => {
  it('needs the command, admin access on the relay, and an online destination', () => {
    const ctx = game(); exec(ctx, 'CONNECT', dev('a'));
    ctx.profile.cmds = ctx.profile.cmds.filter((c) => c !== 'ROUTE');
    expect(act(ctx, dev('b'), 'ROUTE').enabled).toBe(false);
    ctx.profile.cmds.push('ROUTE');
    expect(act(ctx, dev('b'), 'ROUTE').enabled).toBe(false);          // guest on the relay
    expect(act(ctx, dev('b'), 'ROUTE').reason).toMatch(/ADMIN/);
    ctx.run.devices.a.access = 'admin';
    expect(act(ctx, dev('b'), 'ROUTE').enabled).toBe(true);
    exec(ctx, 'ROUTE', dev('b'));
    expect(ctx.run.current).toBe('b');
    expect(ctx.run.devices.b.discovered).toBe(true);
  });
  it('ROUTE targets are the routes of the node you are on; plain CONNECT cannot reach them', () => {
    const ctx = game(); ctx.profile.cmds.push('ROUTE'); exec(ctx, 'CONNECT', dev('a'));
    expect(commandTargets(ctx, 'ROUTE').map((r) => r.target.id)).toEqual(['b']);
    expect(act(ctx, dev('b'), 'CONNECT').enabled).toBe(false);
  });
});

describe('UPLOAD', () => {
  it('sends a local file to a node that expects it', () => {
    const ctx = game(); ctx.profile.cmds.push('UPLOAD');
    exec(ctx, 'CONNECT', dev('a'));
    ctx.run.local.push({ id: 'patch', name: 'patch.bin', content: 'x' });
    expect(act(ctx, { type: 'file', local: true, id: 'patch' }, 'UPLOAD').enabled).toBe(true);
    exec(ctx, 'UPLOAD', { type: 'file', local: true, id: 'patch' });
    expect(ctx.run.flags).toContain('patched');
    expect(act(ctx, { type: 'file', local: true, id: 'patch' }, 'UPLOAD').enabled).toBe(false);
  });
  it('is not offered for files nothing expects, and is locked without the command', () => {
    const ctx = game(); exec(ctx, 'CONNECT', dev('a'));
    ctx.run.local.push({ id: 'other', name: 'o.txt', content: '' }, { id: 'patch', name: 'patch.bin', content: '' });
    expect(act(ctx, { type: 'file', local: true, id: 'other' }, 'UPLOAD')).toBeUndefined();
    ctx.profile.cmds = ctx.profile.cmds.filter((c) => c !== 'UPLOAD');
    expect(act(ctx, { type: 'file', local: true, id: 'patch' }, 'UPLOAD').enabled).toBe(false);
  });
});

describe('EDIT', () => {
  it('accepts only the right change, then rewrites the file', () => {
    const ctx = game(); ctx.profile.cmds.push('EDIT'); exec(ctx, 'CONNECT', dev('a'));
    const f = file('a', 'jadwal');
    expect(getChoices(ctx, 'EDIT', f).map((c) => c.value)).toEqual(['Obat A jam 07', 'Obat A jam 09']);
    exec(ctx, 'EDIT', f, 'Obat A jam 09');
    expect(ctx.run.devices.a.files[0].content).toBe('Obat A jam 08');
    expect(ctx.run.flags).not.toContain('edited');
    exec(ctx, 'EDIT', f, 'Obat A jam 07');
    expect(ctx.run.devices.a.files[0].content).toBe('Obat A jam 07');
    expect(ctx.run.flags).toContain('edited');
    expect(act(ctx, f, 'EDIT')).toBeUndefined();                      // done: no second edit
  });
});

describe('TRACE and Sniffer', () => {
  it('TRACE needs the Tracer tool, then reveals what the message hides', () => {
    const ctx = game(); ctx.profile.cmds.push('TRACE'); exec(ctx, 'CONNECT', dev('a'));
    const f = file('a', 'pesan');
    expect(act(ctx, f, 'TRACE').enabled).toBe(false);
    ctx.profile.tools.tracer = true;
    expect(act(ctx, f, 'TRACE').enabled).toBe(true);
    const r = exec(ctx, 'TRACE', f);
    expect(r.sheet.content).toMatch(/10\.0\.0\.9/);
    expect(ctx.run.flags).toEqual(expect.arrayContaining(['traced']));
    expect(ctx.run.devices.b.discovered).toBe(true);
    expect(act(ctx, f, 'TRACE')).toBeUndefined();
  });
  it('INSPECT shows the sniffed traffic only to owners of Sniffer', () => {
    const plain = game(); expect(exec(plain, 'INSPECT', dev('a')).sheet.content).not.toMatch(/pass=1234/);
    const sn = game(); sn.profile.tools.sniffer = true;
    expect(exec(sn, 'INSPECT', dev('a')).sheet.content).toMatch(/pass=1234/);
    expect(sn.run.clues).toContain('cl');
  });
});
