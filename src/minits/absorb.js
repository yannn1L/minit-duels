// ============================================================
// MINIT: ABSORB (ES Module - Balanced & Fair Control Minit)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';

export const MINIT_ABSORB = {
  id: 'absorb',
  name: 'ABSORB',
  color: 0xff4422,
  desc: 'Creates a gravity vortex. Drains HP and grows in size & power.',
  stats: { hp: 1250, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 10,
    flash: 0.6,
    particleCount: 30,
    shockRad: 140,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    zoneRadius: 2.3,       // Balanced radius (allows enemies with good movement to evade)
    zoneDuration: 180,
    tickRate: 7,          // 4 ticks per second
    drain: {
      speed: 0.9,         // Gentle gravitational pull instead of paralyzing stun
      hp: 4.0,             // Fair drain damage per tick
      vfxLeech: 'fx_absorb_energy',
      hitVfx: { flash: 0.08, particleCount: 2, shake: 0, playSound: false }
    },
    buff: {
      scale: 0.008,
      maxScale: 1.8,       // Balanced visual growth
      dmgMult: 0.03,
      maxDmgMult: 9.0,     // Capped at 2.0x max multiplier (instead of 8x)
      sound: 'absorb_ding'
    }
  },

  action: {
    cd: 220,
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
      g.lineStyle(2, 0xff4422, 0.5).drawCircle(0, 0, 36);
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
            12,
            0.9,
            0.9,
            true,
            0xff4422
          );
        }
      }
    }
  }
};
