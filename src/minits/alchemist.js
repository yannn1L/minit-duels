// ============================================================
// MINIT: ALCHEMIST (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { MINIT_ICONS } from '../assets/icons.js';

export const MINIT_ALCHEMIST = {
  id: 'alchemist',
  name: 'ALCHEM',
  color: 0x00ff44,
  desc: 'Lob poison randomly. Deals splash damage and creates a toxic circle that poisons enemies.',
  stats: { hp: 1200, speed: 0.15 },
  targeting: { type: 'closest_enemy' },
  deathVfx: { shake: 8, flash: 0.6, particleCount: 30, shockRad: 120, sound: 'crush', hitStop: 10 },

  payload: {
    zoneRadius: 2.5,
    lob: {
      vfxTex: 'fx_flask_green',
      deathSound: 'crush',
      spawnOnDeath: {
        life: 240,
        traits: ['applyStatusInRadius', 'alchemistZoneVisual', 'ageLife']
      }
    },
    debuff: {
      id: 'poison',
      duration: 240,
      trait: 'statusEffect',
      payload: {
        id: 'poison',
        icon: 'icon_poison',
        dmg: 6,
        tick: 5,
        vfxTex: 'fx_poison_dust_green',
        vfxTick: 5,
        hitVfx: {
          particleCount: 0,
          sound: 'spore',
          showText: true,
          shake: 0,
          flash: 0,
          hitStop: 0
        }
      }
    }
  },

  action: {
    cd: 180,
    count: 1,
    speed: 0,
    life: 40,
    sound: 'spore',
    traitList: ['lobToRandomArea', 'ageLife']
  },

  textures: {
    base: (g, c) => MINIT_ICONS.alchemist(g, c)
  },

  customTextures: {
    fx_flask_green: (g) => g.beginFill(0x00ff44).drawRect(-2, -2, 4, 4).endFill(),
    fx_poison_circle: (g) => {
      g.lineStyle(2, 0x00ff44, 0.8).drawCircle(0, 0, 40);
      g.beginFill(0x00ff44, 0.15).drawCircle(0, 0, 40).endFill();
    },
    fx_poison_dust_green: (g) => g.beginFill(0x55ff88).drawRect(-1, -1, 2, 2).endFill()
  },

  customTraits: {
    alchemistZoneVisual: (e, a) => {
      const centerX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const centerY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const radius = e.p.payload.zoneRadius;

      a.fxPool.spawnPhysics('fx_poison_circle', centerX, centerY, 0, 0, 2, 1, 1, false, 0xffffff);
      if (e.l % 3 === 0) {
        for (let i = 0; i < CFG.VFX.ZONE.PARTICLE_RATE; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * (radius * CFG.GRID.TS);
          a.fxPool.spawnPhysics(
            'fx_poison_dust_green',
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            0,
            -0.5,
            20,
            0.9,
            0.9,
            true,
            0xffffff
          );
        }
      }
    }
  }
};
