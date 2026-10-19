import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fake AudioContext that counts the nodes it creates.
function makeParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} };
}
function makeNode(kind, log) {
  const n = { kind, connect() {}, disconnect() {}, start() {}, stop() {}, addEventListener() {}, onended: null };
  for (const p of ['gain', 'frequency', 'detune', 'Q', 'delayTime', 'threshold', 'knee', 'ratio', 'attack', 'release']) n[p] = makeParam();
  log.nodes.push(kind);
  return n;
}
function installFakeAudio() {
  const log = { nodes: [], ctxs: 0 };
  class FakeAC {
    constructor() { log.ctxs++; this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = makeNode('dest', log); }
    createGain() { return makeNode('gain', log); }
    createOscillator() { return makeNode('osc', log); }
    createBiquadFilter() { return makeNode('biquad', log); }
    createBufferSource() { return makeNode('src', log); }
    createDelay() { return makeNode('delay', log); }
    createDynamicsCompressor() { return makeNode('comp', log); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  globalThis.AudioContext = FakeAC;
  return log;
}

describe('audio without AudioContext', () => {
  it('never throws and plays nothing', async () => {
    delete globalThis.AudioContext; delete globalThis.webkitAudioContext;
    vi.resetModules();
    const { audio } = await import('../src/fx/audio.js');
    const sfx = await import('../src/fx/sfx.js');
    const music = await import('../src/fx/music.js');
    expect(() => audio.init()).not.toThrow();
    expect(audio.ctx).toBeNull();
    expect(audio.isReady()).toBe(false);
    expect(() => { audio.resume(); audio.suspend(); }).not.toThrow();
    expect(sfx.cue('tap')).toBe(false);
    expect(() => { sfx.blip('laras', 'happy'); sfx.loop('load')(); music.setScene('map'); music.duck(); music.setScene(null); }).not.toThrow();
  });
});

describe('sfx catalog', () => {
  it('has a recipe for every required name', async () => {
    const { SFX_NAMES, RECIPES } = await import('../src/fx/sfx.js');
    const need = 'tap tapSoft tab sheetOpen sheetClose toastInfo toastOk toastWarn toastError toggleOn toggleOff back denied confirm typeTick cmdConnect cmdDisconnect cmdScan cmdInspect cmdLogin cmdCrack cmdExploit cmdElevate cmdRead cmdDownload cmdUpload cmdRecover cmdDecrypt cmdCompare cmdRoute cmdTrace cmdEdit cmdPing cmdStop cmdStart cmdConfig cmdControl cmdSearch cmdFiles cmdGeneric loadDone loadFail loadCancel coin buy broke nodeFound missionAccept missionDone ending rankUp bondUp gift talk notify sleepStart wake'.split(' ');
    for (const n of need) { expect(SFX_NAMES).toContain(n); expect(typeof RECIPES[n]).toBe('function'); }
    for (const n of SFX_NAMES) expect(typeof RECIPES[n]).toBe('function');
  });

  it('recipes build nodes and return a sane duration', async () => {
    const log = installFakeAudio();
    const { RECIPES } = await import('../src/fx/sfx.js');
    const ctx = new globalThis.AudioContext(), out = ctx.createGain();
    for (const [n, r] of Object.entries(RECIPES)) {
      const d = r(ctx, out, 0, { pitch: 1, gain: 1 });
      expect(d, n).toBeGreaterThan(0);
      expect(d, n).toBeLessThanOrEqual(['missionDone', 'ending', 'sleepStart', 'wake'].includes(n) ? 4.5 : 1.5);
    }
    expect(log.nodes.length).toBeGreaterThan(100);
  });
});

describe('engine with a fake AudioContext', () => {
  let audio, sfx, music, log;
  beforeEach(async () => {
    log = installFakeAudio();
    vi.resetModules();
    ({ audio } = await import('../src/fx/audio.js'));
    sfx = await import('../src/fx/sfx.js');
    music = await import('../src/fx/music.js');
  });

  it('init is idempotent and builds the bus chain', () => {
    expect(audio.ctx).toBeNull();
    audio.init(); audio.init();
    expect(log.ctxs).toBe(1);
    expect(audio.isReady()).toBe(true);
    expect(audio.master && audio.sfxBus && audio.musicBus).toBeTruthy();
  });

  it('cue creates nodes; unknown names are no-ops', () => {
    audio.init();
    const before = log.nodes.length;
    expect(sfx.cue('nope')).toBe(false);
    expect(log.nodes.length).toBe(before);
    expect(sfx.cue('coin')).toBe(true);
    expect(log.nodes.length).toBeGreaterThan(before);
  });

  it('rate-limits the same cue', () => {
    audio.init();
    expect(sfx.cue('tap')).toBe(true);
    const n = log.nodes.length;
    expect(sfx.cue('tap')).toBe(false);
    expect(log.nodes.length).toBe(n);
  });

  it('caps polyphony', () => {
    audio.init();
    const names = sfx.SFX_NAMES.filter((x) => x !== 'typeTick');
    let played = 0;
    for (const n of names) if (sfx.cue(n)) played++;   // fake clock never advances -> voices pile up
    expect(played).toBe(24);
    expect(names.length).toBeGreaterThan(24);
  });

  it('blip and loop work', () => {
    audio.init();
    expect(sfx.blip('gun', 'serious')).toBe(true);
    const stop = sfx.loop('load');
    expect(typeof stop).toBe('function');
    stop(); stop();
  });

  it('scenes switch freely, and wait for init', async () => {
    music.setScene('map');                       // before init: remembered only
    expect(music.musicState().running).toBe(false);
    audio.init();
    expect(music.musicState().scene).toBe('map');
    for (const s of [...music.SCENES, null, 'bogus', 'tense']) expect(() => music.setScene(s)).not.toThrow();
    expect(music.musicState().scene).toBe('tense');
    const n = log.nodes.length;
    music.setScene('tense');                     // same scene = no-op
    expect(log.nodes.length).toBe(n);
    music.setScene(null);
    expect(music.musicState().wanted).toBeNull();
  });

  it('music volume 0 stops the scheduler, raising it restarts', async () => {
    const { setSettings } = await import('../src/fx/settings.js');
    setSettings({ music: 0.5 });
    audio.init();
    music.setScene('terminal');
    expect(music.musicState().running).toBe(true);
    setSettings({ music: 0 });
    expect(music.musicState().running).toBe(false);
    expect(music.musicState().scene).toBeNull();
    setSettings({ music: 0.5 });
    expect(music.musicState().running).toBe(true);
    expect(music.musicState().scene).toBe('terminal');
    music.setScene(null);
    expect(music.musicState().running).toBe(false);
  });
});
