// Renders every SFX recipe, dialogue blip and music scene offline in headless Chromium,
// prints quality metrics and writes 16-bit WAVs.  Usage: node tools/render-audio.mjs [outDir]
// Exit code 1 on silence, clipping (>0 dBFS) or edge clicks (|first/last sample| > 0.02).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const outDir = process.argv[2] || '/tmp/pocket-audio';
const SCENE_SECONDS = 20, LONG = new Set(['missionDone', 'ending', 'sleepStart', 'wake']);
fs.mkdirSync(outDir, { recursive: true });

// tiny static server over src/ (modules have no bare imports, so no bundler needed)
const mime = { '.js': 'text/javascript', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__blank') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><title>x</title>'); }
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream');
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let results;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(base + '/__blank');
  results = await page.evaluate(async ({ SCENE_SECONDS }) => {
    const sfx = await import('/fx/sfx.js');
    const music = await import('/fx/music.js');
    const SR = 44100;
    const b64 = (f32) => {
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
      const u8 = new Uint8Array(i16.buffer); let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const stats = (name, kind, d) => {
      let peak = 0, sq = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sq += d[i] * d[i]; }
      return { name, kind, dur: d.length / SR, peak, rms: Math.sqrt(sq / d.length), first: d[0], last: d[d.length - 1], b64: b64(d) };
    };
    const out = [];
    const recipeJobs = [
      ...Object.entries(sfx.RECIPES).map(([n, r]) => [n, 'sfx', r, {}]),
      ...Object.keys(sfx.BLIPS).flatMap((id) => ['happy', 'worried', 'serious', undefined].map((m) =>
        [`blip_${id}${m ? '_' + m : ''}`, 'blip', sfx.blipRecipe, { npc: id, mood: m }]))
    ];
    for (const [name, kind, recipe, opts] of recipeJobs) {
      const probe = new OfflineAudioContext(1, SR * 6, SR);   // dry run just to learn the duration
      const dur = recipe(probe, probe.destination, 0, { pitch: 1, gain: 1, ...opts });
      const ctx = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
      recipe(ctx, ctx.destination, 0, { pitch: 1, gain: 1, ...opts });
      out.push(stats(name, kind, (await ctx.startRendering()).getChannelData(0)));
    }
    for (const sc of music.SCENES) {
      const ctx = new OfflineAudioContext(1, SR * SCENE_SECONDS, SR);
      const g = ctx.createGain();                              // 0.5 s end fade so the cut is not a click
      g.gain.setValueAtTime(1, SCENE_SECONDS - 0.5);
      g.gain.linearRampToValueAtTime(0, SCENE_SECONDS);
      g.connect(ctx.destination);
      music.renderScene(ctx, sc, SCENE_SECONDS, g);
      out.push(stats('scene_' + sc, 'music', (await ctx.startRendering()).getChannelData(0)));
    }
    return out;
  }, { SCENE_SECONDS });
} finally {
  await browser.close();
  server.close();
}

function wav(b64, sr = 44100) {
  const pcm = Buffer.from(b64, 'base64'), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const fmt = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : '-inf');
let bad = 0;
console.log('name'.padEnd(24) + 'dur(s)'.padStart(7) + 'peak dB'.padStart(9) + 'rms dB'.padStart(8) + 'first'.padStart(9) + 'last'.padStart(9) + '  status');
for (const r of results) {
  fs.writeFileSync(path.join(outDir, r.name + '.wav'), wav(r.b64));
  const fails = [], warns = [];
  if (r.peak < 0.001) fails.push('SILENT');
  if (r.peak > 1) fails.push('CLIP');
  if (Math.abs(r.first) > 0.02 || (r.kind !== 'music' && Math.abs(r.last) > 0.02)) fails.push('EDGE-CLICK');
  if (r.peak > 0.708) warns.push('peak>-3dB');
  if (r.kind === 'sfx' && r.dur > 1.5 && !LONG.has(r.name)) warns.push('long');
  if (fails.length) bad++;
  console.log(r.name.padEnd(24) + fmt(r.dur, 2).padStart(7) + fmt(db(r.peak)).padStart(9) + fmt(db(r.rms)).padStart(8)
    + r.first.toFixed(4).padStart(9) + r.last.toFixed(4).padStart(9) + '  ' + (fails.concat(warns).join(' ') || 'ok'));
}
console.log(`\n${results.length} files -> ${outDir}; ${bad} failing`);
process.exit(bad ? 1 : 0);
