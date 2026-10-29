// ============================================================
// MINIT: IRON MAN (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_IRONMEN = {
  id: 'ironmen',
  name: 'IRON',
  color: 0xff3333,
  desc: 'High-tech armored suit. Fires twin repulsor energy blasts with explosive area impacts.',
  stats: { hp: 1350, speed: 0.14 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 10,
    flash: 0.7,
    particleCount: 30,
    shockRad: 140,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    dmg: 35,
    zoneRadius: 1.8,
    hitVfx: {
      shake: 3,
      flash: 0.15,
      particleCount: 3,
      playSound: true,
      sound: 'hit',
      hitStop: 1
    }
  },

  action: {
    cd: 150,
    count: 2,
    speed: 0.45,
    life: 50,
    scatterSpread: 0.25,
    sound: 'iron_blast',
    traitList: ['moveAndBounce', 'damageRadiusOnHit', 'trailParticles', 'ageLife']
  },

  textures: {
    base: './assets/minit_icon/ironmen.png'
  },

  customTextures: {
    fx_repulsor_bullet: (g) => {
      g.beginFill(0xffee33).drawCircle(0, 0, 4);
      g.beginFill(0xffffff).drawCircle(0, 0, 2);
      g.endFill();
    }
  },

  customAudio: {
    iron_blast: {
      t: 'sawtooth',
      f0: () => 600 + FastMath.randRange(-100, 100),
      f1: 120,
      v: 0.12,
      d: 0.15,
      ramp: 'exp',
      throttle: 0.05
    }
  }
};
