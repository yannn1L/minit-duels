// ============================================================
// MINIT: MOTH (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MINIT_ICONS } from '../assets/icons.js';

export const MINIT_MOTH = {
  id: 'moth',
  name: 'MOTH',
  color: 0x88ffcc,
  desc: 'Incubates safely in a cocoon and hatches into a mythical spore-blaster.',
  stats: { hp: 1400, speed: 0.0 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 6,
    flash: 0.4,
    particleCount: 20,
    shockRad: 100,
    sound: 'explosion',
    hitStop: 12
  },

  action: { cd: 480, count: 1, speed: 0, life: 1, traitList: ['transformOwner'] },

  payload: {
    transformation: {
      texture: 'minit_moth_mythical',
      sound: 'moth_hatch',
      stats: {
        speed: 0.15,
        hpAdd: 50
      },
      vfx: { flash: 0.8, shake: 0, particleTex: 'fx_moth_spore', particleCount: 30 },
      action: {
        cd: 70,
        count: 1,
        speed: 0.4,
        life: 60,
        sound: 'moth_throw',
        traitList: ['moveAndBounce', 'damageRadiusOnHit', 'mothBombVisual', 'ageLife']
      }
    },
    zoneRadius: 4.5,
    dmg: 120,
    destroyOnHit: true
  },

  textures: {
    base: './assets/minit_icon/egg-stage-moth.png'
  },

  customTextures: {
    minit_moth_mythical: './assets/minit_icon/hatch-stage-moth.png',
    fx_moth_spore: (g) => g.beginFill(0x88ffcc).drawCircle(0, 0, 2.5).endFill(),
    fx_moth_bomb: (g) => g.beginFill(0xffffff).drawCircle(0, 0, 5).endFill()
  },

  customAudio: {
    moth_hatch: { t: 'sine', f0: 200, f1: 1500, v: 0.25, d: 1.5, ramp: 'exp' },
    moth_throw: {
      t: 'square',
      f0: () => 1200 + FastMath.rand() * 800,
      seq: [() => 400 + FastMath.rand() * 200, () => 1000 + FastMath.rand() * 400],
      v: 0.02,
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
        a.shake = Math.max(a.shake, 12);
        a.triggerFlash(0.6);
        a.hitStop = Math.max(a.hitStop, 8);
        AudioSys.play('explosion', 0.8);

        const radPx = e.p.payload.zoneRadius * CFG.GRID.TS;
        a.fxPool.spawnShockwave(pX, pY, e.p.color, radPx, 6);
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, radPx * 0.75, 3);

        // Optimized shrapnel: 12 particles instead of 25 to prevent particle starvation
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const speed = FastMath.randRange(3, 6);
          a.fxPool.spawnPhysics(
            'fx_moth_bomb',
            pX,
            pY,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            15,
            0.85,
            0.85,
            true,
            e.p.color
          );
        }

        // Optimized spore cloud: 20 particles instead of 50
        for (let i = 0; i < 20; i++) {
          const ang = Math.random() * Math.PI * 2;
          const speed = FastMath.randRange(1, 5);
          const color = Math.random() > 0.5 ? 0xffffff : e.p.color;
          a.fxPool.spawnPhysics(
            'fx_moth_spore',
            pX,
            pY,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            FastMath.randRange(25, 45),
            0.95,
            0.95,
            true,
            color
          );
        }
      }
    }
  }
};
