// ============================================================
// MINIT: LASER (ES Module - Multi-Layer Real Vector Beam)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';

export const MINIT_LASER = {
  id: 'laser',
  name: 'LAZER',
  color: 0x00e5ff,
  desc: 'Intense beam from its core.',
  stats: { hp: 750, speed: 0.15 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 6,
    flash: 0.6,
    particleCount: 20,
    shockRad: 100,
    sound: 'explosion',
    hitStop: 8
  },

  payload: {
    baseDmg: 6,
    beamConfig: {
      trackTarget: true,
      coreColor: 0xffffff,
      glowColor: 0x00e5ff,
      sheathColor: 0x33f0ff,
      coreWidth: 0.5,
      sheathWidth: 5,
      glowWidth: 6,
      glowAlpha: 0.38,
      sheathAlpha: 0.85,
      hasLightning: true,
      lightningColor: 0xaaffff,
      lightningBranches: 2,
      damage: 6,
      rampingDamage: 2.1,
      tickRate: 5,
      hitShake: 3,
      hitFlash: 0.1,
      hitStop: 1,
      hitSound: 'laser_zap',
      soundVolume: 0.35,
      sparkTex: 'fx_beam_spark'
    }
  },

  action: {
    cd: 240,
    count: 1,
    speed: 0,
    life: 200,
    sound: 'laser',
    traitList: ['laserContinuousBeam']
  },

  textures: {
    base: './assets/minit_icon/laser.png'
  },

  customTextures: {
    fx_beam_spark: (g) => g.beginFill(0x00e5ff).drawRect(-1.5, -1.5, 3, 3).endFill(),
    fx_beam_glow: (g) => g.beginFill(0x00e5ff, 0.4).drawRect(-3, -3, 6, 6).endFill()
  },

  customAudio: {
    laser_zap: {
      t: 'sawtooth',
      f0: () => 800 + FastMath.randRange(-200, 200),
      f1: 100,
      v: 0.08,
      d: 0.1,
      ramp: 'exp',
      throttle: 0.05
    }
  },

  customTraits: {
    laserContinuousBeam: (e, a) => {
      if (!e.p.beamConfig) {
        e.p.beamConfig = {
          trackTarget: true,
          coreColor: 0xffffff,
          glowColor: 0x00e5ff,
          sheathColor: 0x33f0ff,
          coreWidth: 0.5,
          sheathWidth: 5,
          glowWidth: 10,
          glowAlpha: 0.38,
          sheathAlpha: 0.85,
          hasLightning: true,
          lightningColor: 0xaaffff,
          lightningBranches: 2,
          damage: e.p.payload?.baseDmg || 6,
          rampingDamage: 2.5,
          tickRate: 5,
          hitShake: 3,
          hitFlash: 0.1,
          hitStop: 1,
          hitSound: 'laser_zap',
          soundVolume: 0.35,
          sparkTex: 'fx_beam_spark'
        };
      }
      const mb = MinitEngine.Registry.traits['modularBeam'];
      if (mb) mb(e, a);
    }
  }
};
