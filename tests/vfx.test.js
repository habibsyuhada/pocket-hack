// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vfx } from '../src/fx/vfx.js';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"><b>x</b></div>';
  vfx.setMode('full');
  vfx.init();
});
afterEach(() => { vfx.setMode('off'); vfx.setMode('full'); vi.useRealTimers(); });

describe('vfx', () => {
  it('init is idempotent and creates #fx on body', () => {
    vfx.init(); vfx.init();
    expect(document.querySelectorAll('#fx').length).toBe(1);
    expect(document.getElementById('fx').parentElement).toBe(document.body);
    expect(document.querySelector('#fx canvas')).toBeTruthy();
  });

  it('does not throw without a 2D context', () => {
    expect(() => {
      vfx.burst(10, 10, { kind: 'confetti' }); vfx.burst(10, 10, { kind: 'ring' });
      vfx.float('+1', 5, 5); vfx.ripple(1, 1); vfx.flash(); vfx.shake(2); vfx.glitch(); vfx.rain(true);
    }).not.toThrow();
  });

  it('off mode creates nothing and clears existing effects', () => {
    vfx.burst(10, 10, { kind: 'sparks' }); vfx.float('a', 1, 1);
    expect(vfx.count()).toBeGreaterThan(0);
    vfx.setMode('off');
    expect(vfx.count()).toBe(0);
    vfx.burst(10, 10, { kind: 'confetti' }); vfx.float('b', 1, 1); vfx.ripple(1, 1); vfx.flash();
    expect(vfx.count()).toBe(0);
    expect(document.querySelectorAll('.fx-float, .fx-ripple, .fx-flash').length).toBe(0);
  });

  it('float text appears then is removed', () => {
    vfx.float('+◆150', 20, 20, { ms: 500 });
    expect(document.querySelector('.fx-float').textContent).toBe('+◆150');
    vi.advanceTimersByTime(700);
    expect(document.querySelector('.fx-float')).toBeNull();
  });

  it('countUp ends at the final value; off is immediate', () => {
    const el = document.createElement('span');
    vfx.countUp(el, 0, 100, 600);
    vi.advanceTimersByTime(1000);
    expect(el.textContent).toBe('100');
    vfx.setMode('off');
    const e2 = document.createElement('span');
    vfx.countUp(e2, 5, 42, 600, (n) => `◆${n}`);
    expect(e2.textContent).toBe('◆42');
  });

  it('countUp cancel stops updates', () => {
    const el = document.createElement('span');
    const cancel = vfx.countUp(el, 0, 100, 600);
    vi.advanceTimersByTime(100); cancel();
    const v = el.textContent;
    vi.advanceTimersByTime(1000);
    expect(el.textContent).toBe(v);
  });

  it('#fx survives #app replaceChildren', () => {
    document.getElementById('app').replaceChildren(document.createElement('p'));
    expect(document.getElementById('fx')).toBeTruthy();
  });

  it('caps particles (full 250, lite 80)', () => {
    for (let i = 0; i < 20; i++) vfx.burst(50, 50, { kind: 'confetti', n: 100 });
    expect(vfx.count()).toBeLessThanOrEqual(250);
    expect(vfx.count()).toBeGreaterThan(200);
    vfx.setMode('lite');
    for (let i = 0; i < 20; i++) vfx.burst(50, 50, { kind: 'confetti', n: 100 });
    expect(vfx.count()).toBeLessThanOrEqual(80);
  });

  it('shake and glitch set temporary classes', () => {
    const app = document.getElementById('app');
    vfx.shake(2); expect(app.classList.contains('fx-shake-2')).toBe(true);
    vi.advanceTimersByTime(600); expect(app.classList.contains('fx-shake-2')).toBe(false);
    vfx.glitch(); expect(app.classList.contains('fx-glitch')).toBe(true);
    vi.advanceTimersByTime(300); expect(app.classList.contains('fx-glitch')).toBe(false);
  });

  it('tap ripple only on interactive targets, bound once', () => {
    vfx.bindTapRipple(); vfx.bindTapRipple();
    document.getElementById('app').innerHTML = '<div class="worldmap"><button class="node">n</button></div>';
    const ev = (t) => t.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 6 }));
    ev(document.querySelector('.worldmap'));
    expect(document.querySelectorAll('.fx-ripple').length).toBe(0);
    ev(document.querySelector('.node'));
    expect(document.querySelectorAll('.fx-ripple').length).toBe(1);
  });
});
