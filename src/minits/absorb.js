// ============================================================
// MINIT: ABSORB (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';

export const MINIT_ABSORB = {
  id: 'absorb',
  name: 'ABSORB',
  color: 0xff4422,
  desc: 'Spawns a vortex zone. Drains HP and speed from enemies to grow in size and power.',
  stats: { hp: 1300, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 10,
    flash: 0.6,
    particleCount: 30,
    shockRad: 150,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    zoneRadius: 3.0,
    zoneDuration: 180,
    tickRate: 10,
    drain: {
      speed: 0.8,
      hp: 5,
      vfxLeech: 'fx_absorb_energy',
      hitVfx: { flash: 0.1, particleCount: 3, shake: 0, playSound: false }
    },
    buff: {
      scale: 0.015,
      maxScale: 3.5,
      dmgMult: 0.08,
      maxDmgMult: 8.0,
      sound: 'absorb_ding'
    }
  },

  action: {
    cd: 240,
    count: 1,
    speed: 0,
    life: 1,
    sound: 'absorb_hum',
    traitList: ['spawnAbsorbZone']
  },

  textures: {
    base: './assets/minit_icon/absorb.png'
  },

  customTextures: {
    fx_absorb_ring: (g) => {
      g.lineStyle(2, 0xff4422, 0.5).drawCircle(0, 0, 48);
    },
    fx_absorb_dust: (g) => g.beginFill(0xff4422).drawRect(-1, -1, 2, 2).endFill(),
    fx_absorb_energy: (g) => g.beginFill(0xffaa00).drawRect(-1, -1, 3, 3).endFill()
  },

  customAudio: {
    absorb_hum: { t: 'sine', f0: 150, f1: 300, v: 0.1, d: 0.5, ramp: 'lin', throttle: 0.2 },
    absorb_ding: { t: 'square', f0: 800, f1: 1500, v: 0.05, d: 0.1, ramp: 'exp', throttle: 0.1 }
  },

  customTraits: {
    spawnAbsorbZone: (e, a) => {
      e.dead = true;
      const tgt = a.getValidTarget(e.p.ownerId, { type: 'closest_enemy' });
      if (!tgt) return;
      a.spawnEnt({
        x: tgt.x,
        y: tgt.y,
        l: e.p.payload.zoneDuration,
        traits: ['drainEnemyStats', 'buffOwnerStats', 'absorbVortexVisual', 'ageLife'],
        p: { ownerId: e.p.ownerId, color: e.p.color, payload: e.p.payload }
      });
    },

    absorbVortexVisual: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const radPx = e.p.payload.zoneRadius * CFG.GRID.TS;

      a.fxPool.spawnPhysics('fx_absorb_ring', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      if (e.l % 2 === 0) {
        for (let i = 0; i < 2; i++) {
          const ang = FastMath.rand() * 6.28;
          const startX = pX + Math.cos(ang) * radPx;
          const startY = pY + Math.sin(ang) * radPx;
          const speed = radPx / 15;
          a.fxPool.spawnPhysics(
            'fx_absorb_dust',
            startX,
            startY,
            Math.cos(ang + Math.PI) * speed,
            Math.sin(ang + Math.PI) * speed,
            15,
            1,
            1,
            true,
            0xffffff
          );
        }
      }
    }
  }
};
