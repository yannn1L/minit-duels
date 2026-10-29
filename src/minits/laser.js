// ============================================================
// MINIT: LASER (ES Module - Optimized Beam)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MINIT_ICONS } from '../assets/icons.js';

export const MINIT_LASER = {
  id: 'laser',
  name: 'LAZER',
  color: 0x00e5ff,
  desc: 'Locks onto a target with an intense beam from its core.',
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

  payload: { baseDmg: 6 },

  action: {
    cd: 240,
    count: 1,
    speed: 0,
    life: 200,
    sound: 'laser',
    traitList: ['infernoTrackingBeam']
  },

  textures: {
    base: './assets/minit_icon/laser.png'
  },

  customTextures: {
    fx_beam_core: (g) => g.beginFill(0xffffff).drawRect(-1, -1, 2, 2).endFill(),
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
    infernoTrackingBeam: (e, a) => {
      if (!e.p.targetId) {
        let closest = null;
        let minDist = Infinity;
        a.players.forEach((p) => {
          if (p.id !== e.p.ownerId && p.hp > 0) {
            const d = FastMath.dist(e.x, e.y, p.x, p.y);
            if (d < minDist) {
              minDist = d;
              closest = p;
            }
          }
        });
        if (closest) {
          e.p.targetId = closest.id;
        } else {
          e.dead = true;
          return;
        }
      }

      const target = a.players.find((p) => p.id === e.p.targetId);
      const owner = a.players.find((p) => p.id === e.p.ownerId);

      if (!target || target.hp <= 0 || !owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      e.x = owner.x;
      e.y = owner.y;

      const ownerX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const ownerY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const targetX = target.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const targetY = target.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      const distance = FastMath.dist(ownerX, ownerY, targetX, targetY);
      const angle = Math.atan2(targetY - ownerY, targetX - ownerX);
      const progress = 1.0 - e.l / e.maxL;

      // Optimized beam: 10px step instead of 6px to cut particle allocations in half while keeping beam dense
      const stepSize = 10;
      const segments = Math.ceil(distance / stepSize);
      const normalAngle = angle + Math.PI / 2;

      for (let i = 0; i <= segments; i++) {
        const pointX = ownerX + Math.cos(angle) * (i * stepSize);
        const pointY = ownerY + Math.sin(angle) * (i * stepSize);
        const jitter = FastMath.randRange(-1, 1) * (progress * 5);
        const finalX = pointX + Math.cos(normalAngle) * jitter;
        const finalY = pointY + Math.sin(normalAngle) * jitter;

        a.fxPool.spawnPhysics('fx_beam_glow', finalX, finalY, 0, 0, 2, 1, 1, false, e.p.color);
        a.fxPool.spawnPhysics('fx_beam_core', finalX, finalY, 0, 0, 2, 1, 1, false, 0xffffff);
      }

      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics(
          'fx_flash',
          targetX,
          targetY,
          FastMath.randRange(-1, 2),
          FastMath.randRange(-1, 2),
          3,
          0.8,
          0.8,
          true,
          e.p.color
        );
      }

      if (e.l % 6 === 0) {
        const damage = e.p.payload.baseDmg * (1 + progress * 2.5);
        a.damagePlayer(
          target.id,
          {
            dmg: damage,
            hitVfx: {
              shake: 0 + progress * 4,
              flash: 0.05 + progress * 0.1,
              hitStop: 1,
              particleCount: 1 + Math.floor(progress * 4),
              playSound: false
            }
          },
          e.p.color
        );
        AudioSys.play('laser_zap', 0.25 + progress * 0.35);
      }

      if (--e.l <= 0) e.dead = true;
    }
  }
};
