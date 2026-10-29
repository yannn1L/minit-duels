// ============================================================
// BASE TEXTURE & AUDIO REGISTRATIONS (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { MinitEngine } from './Registry.js';

export function registerBaseAssets() {
  // ============================================================
  // TEXTURE REGISTRATIONS
  // ============================================================

  // Background grid texture
  MinitEngine.Registry.addTexture('bg_grid', (g) => {
    g.lineStyle(1.5, 0x0088ff, 0.4)
      .moveTo(32, 0)
      .lineTo(32, 32)
      .moveTo(0, 32)
      .lineTo(32, 32);
    g.lineStyle(0.8, 0x00ccff, 0.6)
      .moveTo(32, 0)
      .lineTo(32, 32)
      .moveTo(0, 32)
      .lineTo(32, 32);
  });

  // Flash effect texture
  MinitEngine.Registry.addTexture('fx_flash', (g) => {
    g.beginFill(0xffffff, 1).drawRect(0, 0, CFG.GRID.TS, CFG.GRID.TS).endFill();
  });

  // Dust particle texture
  MinitEngine.Registry.addTexture('fx_dust', (g) => {
    g.beginFill(0xffffff, 1).drawRect(0, 0, 4, 4).endFill();
  });

  // Shockwave ring texture
  MinitEngine.Registry.addTexture('fx_ring', (g) => {
    g.lineStyle(2, 0xffffff, 1).drawCircle(64, 64, 60);
  });

  // Poison status icon
  MinitEngine.Registry.addTexture('icon_poison', (g) => {
    g.beginFill(0x00ff44)
      .drawRect(0, 0, 12, 12)
      .beginFill(0x000000)
      .drawRect(2, 2, 4, 4)
      .drawRect(8, 8, 2, 2)
      .endFill();
  });

  // ============================================================
  // AUDIO REGISTRATIONS
  // ============================================================

  // UI Sounds
  MinitEngine.Registry.addAudio('start', {
    t: 'square',
    f0: 150,
    f1: 600,
    v: 0.15,
    d: 0.5,
    ramp: 'exp'
  });

  MinitEngine.Registry.addAudio('win', {
    t: 'sawtooth',
    f0: 440,
    seq: [554.37, 659.25, 880],
    v: 0.2,
    d: 0.9,
    ramp: 'exp'
  });

  MinitEngine.Registry.addAudio('click', {
    t: 'square',
    f0: 400,
    f1: 800,
    v: 0.1,
    d: 0.05,
    ramp: 'exp'
  });

  // Combat Sounds
  MinitEngine.Registry.addAudio('hit', {
    t: 'square',
    f0: () => 400 + Math.random() * 200,
    f1: 50,
    v: 0.08,
    d: 0.08,
    ramp: 'exp',
    throttle: 0.03
  });

  MinitEngine.Registry.addAudio('laser', {
    t: 'sawtooth',
    f0: () => 1800 + Math.random() * 400,
    f1: 100,
    v: 0.12,
    d: 0.2,
    ramp: 'exp',
    throttle: 0.06
  });

  MinitEngine.Registry.addAudio('spore', {
    t: 'sine',
    f0: () => 200 + Math.random() * 100,
    f1: (f) => f + 300,
    f2: 50,
    v: 0.06,
    d: 0.22,
    ramp: 'lin_exp',
    throttle: 0.05
  });

  // Explosion Sounds
  MinitEngine.Registry.addAudio('explosion', {
    noise: true,
    d: 0.5,
    fType: 'lowpass',
    f0: 1400,
    f1: 40,
    v: 0.45,
    oF0: 150,
    oF1: 20,
    throttle: 0.08
  });

  MinitEngine.Registry.addAudio('crush', {
    noise: true,
    d: 0.55,
    fType: 'lowpass',
    f0: 750,
    f1: 20,
    v: 0.5,
    oF0: 100,
    oF1: 10,
    throttle: 0.08
  });
}
