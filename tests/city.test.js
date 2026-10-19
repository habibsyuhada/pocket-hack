import { describe, it, expect } from 'vitest';
import { CITY, START_NODES } from '../src/city/index.js';
import { PLACE, NPC_CELLS, SAFEHOUSE_CELL, MARKET_CELL, CONTRACT_CELL, DISTRICTS, cellXY, MAPW, MAPH } from '../src/city/layout.js';
import { SITES } from '../src/sites/index.js';

const devices = CITY.world.devices;
const ids = Object.keys(devices);

describe('city graph', () => {
  it('has many nodes across six districts', () => {
    expect(ids.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ids.map((i) => devices[i].district)).size).toBe(6);
  });

  it('every node is placed on the map inside the canvas', () => {
    for (const id of ids) {
      expect(PLACE[id], `placement for ${id}`).toBeTruthy();
      expect(devices[id].x).toBeGreaterThan(0);
      expect(devices[id].x).toBeLessThan(MAPW);
      expect(devices[id].y).toBeLessThan(MAPH);
    }
    for (const id of Object.keys(PLACE)) expect(devices[id], `node for placement ${id}`).toBeTruthy();
  });

  it('all links point to real nodes', () => {
    for (const d of Object.values(devices)) for (const l of d.links || []) expect(devices[l], `${d.id} -> ${l}`).toBeTruthy();
  });

  it('the whole city is one connected network starting from the hotspots', () => {
    const seen = new Set(CITY.entry);
    const queue = [...seen];
    while (queue.length) {
      const d = devices[queue.pop()];
      for (const l of [...(d.links || []), ...(d.routes || [])]) if (!seen.has(l)) { seen.add(l); queue.push(l); }
    }
    expect([...ids].filter((i) => !seen.has(i))).toEqual([]);
  });

  it('the rig only sees the ISP uplink; every hotspot hangs off it', () => {
    expect(CITY.entry).toEqual(['isp_core']);
    expect(CITY.rigScan).toEqual(['isp_core']);
    expect(START_NODES).toEqual(['isp_core']);
    expect(devices.isp_core.open).toBe('guest');
    const hubs = ids.filter((i) => devices[i].hub);
    expect(hubs.length).toBe(6);
    for (const h of hubs) expect(devices[h].open).toBe('guest');
    // the industrial estate is cut off from the city: only reachable by ROUTE from the relay tower
    for (const h of hubs.filter((x) => x !== 'industri_hub')) expect(devices.isp_core.links).toContain(h);
    expect(devices.isp_core.links).not.toContain('industri_hub');
    expect(devices.menara_relay.routes).toContain('industri_hub');
  });

  it('every mission start node is reachable from the ISP uplink', () => {
    const seen = new Set(CITY.entry), queue = [...seen];
    while (queue.length) for (const l of devices[queue.pop()].links || []) if (!seen.has(l)) { seen.add(l); queue.push(l); }
    for (const m of SITES) for (const e of m.entry) expect(seen.has(e), `${m.id} start ${e}`).toBe(true);
  });

  it('file ids, process ids and control ids are globally unique', () => {
    const files = [], procs = [];
    for (const d of Object.values(devices)) {
      for (const f of d.files || []) files.push(f.id);
      for (const p of d.procs || []) procs.push(`${d.id}:${p.id}`);
    }
    expect(new Set(files).size).toBe(files.length);
    expect(new Set(procs).size).toBe(procs.length);
  });

  it('credentials point to existing nodes', () => {
    for (const c of Object.values(CITY.creds)) expect(devices[c.device]).toBeTruthy();
  });

  it('every mission patch targets a real node', () => {
    for (const m of SITES) for (const id of Object.keys(m.patches || {})) expect(devices[id], `${m.id} patch ${id}`).toBeTruthy();
  });
});

describe('map layout', () => {
  const W = 130, H = 90; // card box with margin
  const boxes = [
    ...Object.entries(PLACE).map(([id, [c, r]]) => ({ id, ...cellXY([c, r]) })),
    { id: 'safehouse', ...cellXY(SAFEHOUSE_CELL) },
    { id: 'market', ...cellXY(MARKET_CELL) },
    { id: 'contracts', ...cellXY(CONTRACT_CELL) },
    ...Object.entries(NPC_CELLS).flatMap(([n, cells]) => cells.map((c, i) => ({ id: `${n}${i}`, ...cellXY(c) })))
  ];

  it('no two cards (nodes, NPC spots, safehouse) overlap', () => {
    const hits = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (Math.abs(a.x - b.x) < W && Math.abs(a.y - b.y) < H) hits.push([a.id, b.id]);
    }
    expect(hits).toEqual([]);
  });

  it('district labels do not sit on a card', () => {
    for (const d of DISTRICTS) {
      const p = cellXY(d.at);
      for (const b of boxes) expect(Math.abs(b.x - p.x) < 110 && Math.abs(b.y - p.y) < 60, `${d.id} label vs ${b.id}`).toBe(false);
    }
  });
});
