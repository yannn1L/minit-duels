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

  // Dust particle texture (crisp multi-tone pixel square)
  MinitEngine.Registry.addTexture('fx_dust', (g) => {
    g.beginFill(0xffffff, 0.45).drawRect(0, 0, 6, 6).endFill();
    g.beginFill(0xffffff, 1).drawRect(1, 1, 4, 4).endFill();
  });

  // Directional spark streak texture (elongated along X-axis for velocity-aligned stretching)
  MinitEngine.Registry.addTexture('fx_spark', (g) => {
    g.beginFill(0xffffff, 0.35).drawRoundedRect(0, 1, 14, 6, 3).endFill();
    g.beginFill(0xffffff, 0.85).drawRoundedRect(2, 2, 10, 4, 2).endFill();
    g.beginFill(0xffffff, 1.0).drawRect(4, 2.5, 7, 3).endFill();
  });

  // Soft radial bloom glow texture (for additive light flares, projectile halos, and unit under-glows)
  MinitEngine.Registry.addTexture('fx_glow', (g) => {
    g.beginFill(0xffffff, 0.08).drawCircle(24, 24, 22).endFill();
    g.beginFill(0xffffff, 0.16).drawCircle(24, 24, 16).endFill();
    g.beginFill(0xffffff, 0.32).drawCircle(24, 24, 10).endFill();
    g.beginFill(0xffffff, 0.65).drawCircle(24, 24, 5).endFill();
    g.beginFill(0xffffff, 1.0).drawCircle(24, 24, 2.2).endFill();
  });

  // Glowing ember mote texture
  MinitEngine.Registry.addTexture('fx_ember', (g) => {
    g.beginFill(0xffffff, 0.3).drawCircle(5, 5, 4.5).endFill();
    g.beginFill(0xffffff, 0.8).drawCircle(5, 5, 2.8).endFill();
    g.beginFill(0xffffff, 1.0).drawRect(3.5, 3.5, 3, 3).endFill();
  });

  // 4-point star sparkle (shields, heals, stun stars, critical flashes)
  MinitEngine.Registry.addTexture('fx_star', (g) => {
    g.beginFill(0xffffff, 0.35).drawCircle(6, 6, 5).endFill();
    g.beginFill(0xffffff, 1.0)
      .drawRect(5, 0, 2, 12)
      .drawRect(0, 5, 12, 2)
      .drawRect(3.5, 3.5, 5, 5)
      .endFill();
  });

  // Frost / crystal diamond shard (slow aura & ice hits)
  MinitEngine.Registry.addTexture('fx_shard', (g) => {
    g.beginFill(0xffffff, 0.9)
      .moveTo(5, 0)
      .lineTo(10, 5)
      .lineTo(5, 10)
      .lineTo(0, 5)
      .closePath()
      .endFill();
    g.beginFill(0xffffff, 1.0).drawRect(3.5, 3.5, 3, 3).endFill();
  });

  // Persistent floor scorch / blast crater mark
  MinitEngine.Registry.addTexture('fx_scorch', (g) => {
    g.beginFill(0x030308, 0.55).drawCircle(24, 24, 20).endFill();
    g.beginFill(0x000000, 0.72).drawCircle(24, 24, 13).endFill();
    g.lineStyle(1.5, 0xffffff, 0.35).drawCircle(24, 24, 16);
    g.lineStyle(1, 0xffffff, 0.2).drawCircle(24, 24, 21);
  });

  // Primary Shockwave ring texture (multi-layered energetic wave)
  MinitEngine.Registry.addTexture('fx_ring', (g) => {
    g.lineStyle(6, 0xffffff, 0.25).drawCircle(64, 64, 58);
    g.lineStyle(3, 0xffffff, 0.7).drawCircle(64, 64, 59);
    g.lineStyle(1.5, 0xffffff, 1.0).drawCircle(64, 64, 60);
  });

  // Thin secondary shockwave ring texture (for concentric multi-ring bursts)
  MinitEngine.Registry.addTexture('fx_ring_thin', (g) => {
    g.lineStyle(2.5, 0xffffff, 0.4).drawCircle(64, 64, 60);
    g.lineStyle(1.2, 0xffffff, 1.0).drawCircle(64, 64, 60);
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

  // Slow status icon
  MinitEngine.Registry.addTexture('icon_slow', (g) => {
    g.beginFill(0x00ccff)
      .drawRect(0, 0, 12, 12)
      .beginFill(0xffffff)
      .drawRect(5, 1, 2, 10)
      .drawRect(1, 5, 10, 2)
      .endFill();
  });

  // Stun status icon
  MinitEngine.Registry.addTexture('icon_stun', (g) => {
    g.beginFill(0xffdd00)
      .drawRect(0, 0, 12, 12)
      .beginFill(0x000000)
      .drawRect(5, 2, 2, 5)
      .drawRect(5, 8, 2, 2)
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
