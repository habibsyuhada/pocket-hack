// The city: ONE shared network graph that every mission is built on.
// Missions own some nodes (their puzzle devices) and may "patch" extra files
// onto generic city nodes; the builder merges everything, places it on the map
// and links it together. The engine treats the result as a single big "mission".
import { SITES } from '../sites/index.js';
import { dressWorld } from '../sites/flavor.js';
import { GENERIC_NODES, EXTRA_NODES, EDGES } from './nodes.js';
import { placeOf, DISTRICTS } from './layout.js';

const clone = (o) => structuredClone(o);

function mergePatch(dev, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (['files', 'procs', 'controls'].includes(k)) dev[k] = [...(dev[k] || []), ...clone(v)];
    else if (k === 'links') dev.links = [...new Set([...(dev.links || []), ...v])];
    else dev[k] = clone(v);
  }
}

function link(devices, a, b) {
  for (const [x, y] of [[a, b], [b, a]]) {
    const d = devices[x];
    if (!d) throw new Error(`city: unknown node "${x}" in link ${a} <-> ${b}`);
    d.links = [...new Set([...(d.links || []), y])];
  }
}

function buildCity() {
  const devices = {};
  const owner = {};                     // device id -> owning mission id
  const creds = {}, clues = {}, diffs = {};

  // generic nodes (dressed with the same set-dressing as mission nodes)
  const generic = dressWorld({ devices: Object.fromEntries([...GENERIC_NODES, ...EXTRA_NODES].map((d) => [d.id, clone(d)])) });
  Object.assign(devices, generic.devices);

  // mission-owned nodes + shared tables
  for (const m of SITES) {
    for (const [id, d] of Object.entries(m.world.devices)) {
      if (devices[id]) throw new Error(`city: duplicate node id "${id}" (${m.id})`);
      devices[id] = clone(d);
      owner[id] = m.id;
    }
    for (const [k, v] of Object.entries(m.creds || {})) { if (creds[k]) throw new Error(`city: duplicate cred ${k}`); creds[k] = v; }
    for (const [k, v] of Object.entries(m.clues || {})) { if (clues[k]) throw new Error(`city: duplicate clue ${k}`); clues[k] = v; }
    Object.assign(diffs, m.diffs || {});
  }

  // patches: missions dropping extra content onto existing nodes
  for (const m of SITES) {
    for (const [id, patch] of Object.entries(m.patches || {})) {
      if (!devices[id]) throw new Error(`city: ${m.id} patches unknown node "${id}"`);
      mergePatch(devices[id], patch);
    }
  }

  // undirected links between generic nodes / mission entry nodes
  for (const [a, b] of EDGES) link(devices, a, b);

  // placement
  for (const [id, d] of Object.entries(devices)) {
    const pos = placeOf(id);
    if (!pos) throw new Error(`city: node "${id}" has no map placement`);
    d.x = pos.x; d.y = pos.y; d.district = pos.district;
  }

  return {
    id: 'city',
    code: 'KOTA',
    title: 'Surabaya',
    intro: 'Terminal siap. Kota Surabaya tersambung di depanmu.',
    world: { devices },
    owner,
    creds, clues, diffs,
    rigScan: ['isp_core'],                           // the only thing your rig sees on its own
    entry: ['isp_core'],                             // everything else is reached through links
  };
}

export const CITY = buildCity();
export { DISTRICTS };
// bump when city content changes so saved runs are rebuilt (progress is carried over)
export const CITY_VERSION = 2;
export const START_NODES = ['isp_core'];             // your rig's uplink, known from day one

export const missionOfNode = (id) => CITY.owner[id] || null;
