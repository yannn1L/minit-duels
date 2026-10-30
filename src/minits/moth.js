// ============================================================
// MINIT: MOTH (ES Module - Clean Hatch & Attack Separation)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_MOTH = {
  id: 'moth',
  name: 'MOTH',
  color: 0x88ffcc,
  desc: 'Incubates in cocoon, then hatches into a winged spore-bomber.',
  stats: { hp: 1350, speed: 0.0 }, // Immobile during egg stage
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 6,
    flash: 0.4,
    particleCount: 20,
    shockRad: 100,
    sound: 'explosion',
    hitStop: 12
  },

  // 1. Egg Incubation Timer (Hatch Cooldown = 360 ticks / 6.0 seconds)
  action: {
    cd: 360,
    count: 1,
    speed: 0,
    life: 1,
    traitList: ['transformOwner']
  },

  // 2. Hatched Moth Stats & Attack Action (Completely Separate Cooldown)
  payload: {
    transformation: {
      texture: 'minit_moth_mythical',
      sound: 'moth_hatch',
      stats: {
        speed: 0.15,
        hpAdd: 80
      },
      vfx: { flash: 0.8, shake: 6, particleTex: 'fx_moth_spore', particleCount: 30 },
      // Separate Attack Action after hatching: Spore Bomb throw every 75 frames (~1.25s)
      action: {
        cd: 75,
        count: 1,
        speed: 0.38,
        life: 60,
        sound: 'moth_throw',
        traitList: ['moveAndBounce', 'damageRadiusOnHit', 'mothBombVisual', 'ageLife']
      }
    },
    zoneRadius: 3.0,
    dmg: 48,
    destroyOnHit: true
  },

  textures: {
    base: './assets/minit_icon/egg-stage-moth.png'
  },

  customTextures: {
    minit_moth_mythical: './assets/minit_icon/hatch-stage-moth.png',
    fx_moth_spore: (g) => g.beginFill(0x88ffcc).drawCircle(0, 0, 2.5).endFill(),
    fx_moth_bomb: (g) => g.beginFill(0xffffff).drawCircle(0, 0, 4.5).endFill()
  },

  customAudio: {
    moth_hatch: { t: 'sine', f0: 200, f1: 1500, v: 0.25, d: 1.5, ramp: 'exp' },
    moth_throw: {
      t: 'square',
      f0: () => 1200 + FastMath.rand() * 800,
      seq: [() => 400 + FastMath.rand() * 200, () => 1000 + FastMath.rand() * 400],
      v: 0.04,
      d: 0.15,
      ramp: 'exp'
    }
  },

  customTraits: {
    mothBombVisual: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      a.fxPool.spawnPhysics('fx_moth_bomb', pX, pY, 0, 0, 2, 1, 1, false, e.p.color);
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics('fx_moth_spore', pX, pY, 0, 0, 10, 1, 1, true, e.p.color);
      }

      if (e.dead || e.l <= 1) {
        a.shake = Math.max(a.shake, 8);
        a.triggerFlash(0.4);
        a.hitStop = Math.max(a.hitStop, 4);
        AudioSys.play('explosion', 0.6);

        const radPx = e.p.payload.zoneRadius * CFG.GRID.TS;
        a.fxPool.spawnShockwave(pX, pY, e.p.color, radPx, 5);
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, radPx * 0.7, 3);

        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const speed = FastMath.randRange(3, 5.5);
          a.fxPool.spawnPhysics(
            'fx_moth_bomb',
            pX,
            pY,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            12,
            0.9,
            0.9,
            true,
            e.p.color
          );
        }
      }
    }
  }
};
