// ============================================================
// MINIT: MOTH (ES Module - Egg Incubation, Larva Spores & Winged Bomber)
// Stage 1: Egg Incubates (Emits Toxic Spores & Crawling Larvae)
// Stage 2: Hatches into Winged Mythical Moth (Throws Spore Bombs)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';

export const MINIT_MOTH = {
  id: 'moth',
  name: 'MOTH',
  color: 0x88ffcc,
  desc: 'Incubates, then hatches.',
  stats: { hp: 1350, speed: 0 }, // Slight sluggish wiggle during egg stage
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 8,
    flash: 0.5,
    particleCount: 25,
    shockRad: 110,
    sound: 'explosion',
    hitStop: 12
  },

  // 1. Egg Incubation Lifecycle (Hatch Timer = 100 ticks / ~1.6 seconds)
  action: {
    cd: 300,
    count: 1,
    speed: 0,
    life: 1,
    traitList: ['transformOwner']
  },

  // 2. Hatched Moth Stats & Spore Bomb Attacks
  payload: {
    transformation: {
      texture: 'minit_moth_mythical',
      sound: 'moth_hatch',
      stats: {
        speed: 0.17,
        hpAdd: 120
      },
      vfx: { flash: 0.85, shake: 8, particleTex: 'fx_moth_spore', particleCount: 35 },
      // Separate Attack Action after hatching: Spore Bomb throw every 60 frames (~1.0s)
      action: {
        cd: 60,
        count: 2,
        speed: 0.38,
        life: 55,
        scatterSpread: 0.25,
        sound: 'moth_throw',
        traitList: ['moveAndBounce', 'damageRadiusOnHit', 'mothBombVisual', 'ageLife']
      }
    },
    zoneRadius: 1.2,
    dmg: 75,
    destroyOnHit: true
  },

  textures: {
    base: './assets/minit_icon/egg-stage-moth.png'
  },

  customTextures: {
    minit_moth_mythical: './assets/minit_icon/hatch-stage-moth.png',
    fx_moth_spore: (g) => g.beginFill(0x88ffcc).drawCircle(0, 0, 2.5).endFill(),
    fx_moth_bomb: (g) => g.beginFill(0xddffdd).drawCircle(0, 0, 4.5).beginFill(0x55ffaa).drawCircle(0, 0, 2.5).endFill(),
    // Crawling bug larva
    fx_moth_larva: (g) => {
      g.beginFill(0x66eeaa).drawEllipse(0, 0, 4, 2.5);
      g.beginFill(0xffffff).drawCircle(-2, -1, 1).endFill();
    }
  },

  customAudio: {
    moth_hatch: { t: 'sine', f0: 200, f1: 1500, v: 0.3, d: 1.2, ramp: 'exp' },
    moth_throw: {
      t: 'square',
      f0: () => 1100 + FastMath.rand() * 600,
      seq: [() => 400 + FastMath.rand() * 200, () => 900 + FastMath.rand() * 300],
      v: 0.05,
      d: 0.14,
      ramp: 'exp'
    },
    moth_larva_bite: {
      t: 'sawtooth',
      f0: 700,
      f1: 150,
      v: 0.08,
      d: 0.08,
      ramp: 'exp'
    }
  },

  customTraits: {
    // ============================================================
    // TRAIT: CRAWLING LARVA SPAWNED BY INCUBATING EGG
    // Seeks enemy, crawls and bursts into spores on contact
    // ============================================================
    mothLarva: (e, a) => {
      const tgt = a.getValidTarget(e.p.ownerId, { type: 'closest_enemy' });
      if (tgt && tgt.hp > 0) {
        const desiredAngle = Math.atan2(tgt.y - e.y, tgt.x - e.x);
        e.dx = Math.cos(desiredAngle) * 0.18;
        e.dy = Math.sin(desiredAngle) * 0.18;
      }

      e.x += e.dx;
      e.y += e.dy;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Render crawling larva sprite with wiggle
      const wiggle = Math.sin(e.l * 0.6) * 2;
      a.fxPool.spawnPhysics('fx_moth_larva', pX, pY + wiggle, 0, 0, 2, 1, 1, false, e.p.color);

      // Trailing tiny spores
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics('fx_moth_spore', pX, pY, 0, 0, 8, 1, 1, true, 0x88ffcc);
      }

      // Contact collision with enemy
      if (tgt && tgt.hp > 0 && FastMath.dist(e.x, e.y, tgt.x, tgt.y) <= 1.0) {
        AudioSys.play('moth_larva_bite');
        const owner = a.players.find((p) => p.id === e.p.ownerId);
        const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;
        a.damagePlayer(
          tgt.id,
          {
            dmg: 18 * dMult,
            hitVfx: {
              shake: 3,
              flash: 0.1,
              particleCount: 4,
              particleTex: 'fx_moth_spore',
              playSound: false
            }
          },
          0x88ffcc
        );
        a.fxPool.spawnShockwave(pX, pY, 0x88ffcc, 40, 3);
        e.dead = true;
      }
    },

    // ============================================================
    // TRAIT: SPORE BOMB THROWN BY WINGED MOTH
    // Bounces and detonates into a cluster of toxic spores
    // ============================================================
    mothBombVisual: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      a.fxPool.spawnPhysics('fx_moth_bomb', pX, pY, 0, 0, 2, 1, 1, false, e.p.color);
      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics('fx_moth_spore', pX, pY, -e.dx * 0.5, -e.dy * 0.5, 10, 0.9, 0.9, true, e.p.color);
      }

      // Detonation burst on contact or expiration
      if (e.dead || e.l <= 1) {
        a.shake = Math.max(a.shake, 7);
        a.triggerFlash(0.35);
        a.hitStop = Math.max(a.hitStop, 2);
        AudioSys.play('explosion', 0.5);

        const radPx = (e.p.payload?.zoneRadius || 1.2) * CFG.GRID.TS;
        a.fxPool.spawnShockwave(pX, pY, e.p.color, radPx, 5);
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, radPx * 0.6, 3);

        for (let i = 0; i < 14; i++) {
          const ang = Math.random() * Math.PI * 2;
          const speed = FastMath.randRange(2.5, 5.0);
          a.fxPool.spawnPhysics(
            'fx_moth_spore',
            pX,
            pY,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            15,
            0.88,
            0.88,
            true,
            e.p.color
          );
        }
      }
    }
  }
};
