// ============================================================
// MINIT: MOTH (ES Module - Enhanced Bioluminescent Chrysalis & Spore Bomber VFX/SFX)
// Stage 1: Egg Incubates (Holds energy, then shatters cocoon)
// Stage 2: Hatches into Winged Mythical Moth (Throws Bioluminescent Spore Bombs)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_MOTH = {
  id: 'moth',
  name: 'MOTH',
  color: 0x88ffcc,
  desc: 'Incubates, then hatches.',
  stats: { hp: 1350, speed: 0 }, // Egg stage before metamorphosis
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 12,
    flash: 0.6,
    particleCount: 32,
    shockRad: 135,
    sound: 'explosion',
    hitStop: 12
  },

  // 1. Egg Incubation Lifecycle
  action: {
    cd: 300,
    count: 1,
    speed: 0,
    life: 1,
    traitList: ['transformOwner', 'mothHatchBurstVfx']
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
      vfx: {
        flash: 0.9,
        shake: 14,
        particleTex: 'fx_moth_wing_scale',
        particleCount: 40
      },
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
    destroyOnHit: true,
    hitVfx: {
      shake: 7,
      flash: 0.3,
      particleCount: 10,
      particleTex: 'fx_moth_spore',
      sound: 'moth_bomb_burst',
      playSound: true,
      hitStop: 2
    }
  },

  textures: {
    base: './assets/minit_icon/egg-stage-moth.png'
  },

  customTextures: {
    minit_moth_mythical: './assets/minit_icon/hatch-stage-moth.png',

    // Bioluminescent Toxic Spore Orb
    fx_moth_spore: (g) => {
      g.beginFill(0x00ff88, 0.38).drawCircle(0, 0, 4.5);
      g.beginFill(0x88ffcc, 0.95).drawCircle(0, 0, 2.5);
      g.beginFill(0xffffff, 1.0).drawCircle(-0.5, -0.5, 1.0);
      g.endFill();
    },

    // Golden-Emerald Mythical Wing Scale / Shimmer Dust
    fx_moth_wing_scale: (g) => {
      g.beginFill(0x88ffcc, 0.85)
        .moveTo(0, -4.5)
        .lineTo(3, 0)
        .lineTo(0, 4.5)
        .lineTo(-3, 0)
        .closePath()
        .endFill();
      g.beginFill(0xeeff88, 0.95)
        .moveTo(0, -2.5)
        .lineTo(1.5, 0)
        .lineTo(0, 2.5)
        .lineTo(-1.5, 0)
        .closePath()
        .endFill();
    },

    // Shattered Chrysalis Cocoon Shell Shard
    fx_moth_cocoon_shard: (g) => {
      g.lineStyle(1, 0xffffff, 0.85)
        .beginFill(0x44cc99, 0.9)
        .drawPolygon([-4, -3, 4, -1, 1, 4, -3, 2])
        .endFill();
    },

    // Ethereal Wing Wave Ring
    fx_moth_wing_aura: (g) => {
      g.lineStyle(2, 0x88ffcc, 0.8).drawCircle(0, 0, 18);
      g.lineStyle(1, 0xeeff88, 0.65).drawCircle(0, 0, 13);
      g.beginFill(0x55ffaa, 0.14).drawCircle(0, 0, 18).endFill();
    },

    // Pulsing Bio-Plasma Spore Bomb
    fx_moth_bomb: (g) => {
      // Outer toxic bio-corona
      g.beginFill(0x00ff88, 0.32).drawCircle(0, 0, 8.5);
      // Spore pod ring
      g.lineStyle(1.5, 0xeeff88, 0.9).drawCircle(0, 0, 6);
      // Vibrant mint-emerald core
      g.lineStyle(0).beginFill(0x55ffaa, 0.95).drawCircle(0, 0, 4.8);
      // Bright bioluminescent nucleus
      g.beginFill(0xffffff, 1.0).drawCircle(-1, -1, 2.2).endFill();
    },

    // Expanding Toxic Spore Cloud Puff on Bomb Detonation
    fx_moth_cloud: (g) => {
      g.beginFill(0x33ff99, 0.45).drawCircle(0, 0, 9);
      g.beginFill(0x88ffcc, 0.65).drawCircle(-2, -1, 5.5);
      g.beginFill(0xeeff88, 0.5).drawCircle(2, 2, 3.5).endFill();
    },

    // Crawling Bioluminescent Larva
    fx_moth_larva: (g) => {
      g.beginFill(0x00ff88, 0.3).drawEllipse(0, 0, 6, 4);
      g.beginFill(0x66eeaa, 0.95).drawEllipse(0, 0, 4.5, 2.8);
      g.beginFill(0xeeff88, 0.9).drawCircle(1.5, 0, 1.2);
      g.beginFill(0xffffff, 1.0).drawCircle(-2, -1, 1.2).endFill();
    }
  },

  customAudio: {
    // Majestic mythical metamorphosis arpeggio + cocoon shatter
    moth_hatch: {
      t: 'triangle',
      f0: 293.66,
      seq: [369.99, 440.0, 587.33, 739.99, 880.0, 1174.66],
      v: 0.28,
      d: 0.95,
      ramp: 'lin_exp'
    },
    // Organic cocoon crack & wing burst layered on hatch
    moth_cocoon_burst: {
      noise: true,
      d: 0.45,
      fType: 'bandpass',
      f0: 1600,
      f1: 220,
      v: 0.38,
      oF0: 260,
      oF1: 65,
      throttle: 0.1
    },
    // Ethereal wing-beat & bio-spore launch
    moth_throw: {
      t: 'sine',
      f0: () => 680 + FastMath.rand() * 220,
      seq: [() => 920 + FastMath.rand() * 240, () => 1240 + FastMath.rand() * 300],
      v: 0.12,
      d: 0.16,
      ramp: 'lin_exp',
      throttle: 0.04
    },
    // Pressurized organic spore bomb detonation
    moth_bomb_burst: {
      noise: true,
      d: 0.36,
      fType: 'lowpass',
      f0: 1450,
      f1: 60,
      v: 0.36,
      oF0: 220,
      oF1: 38,
      throttle: 0.04
    },
    // Crisp larva bite snap
    moth_larva_bite: {
      t: 'sawtooth',
      f0: 780,
      f1: 140,
      v: 0.11,
      d: 0.09,
      ramp: 'exp'
    }
  },

  customTraits: {
    // ============================================================
    // TRAIT: CHRYSALIS HATCH EXPLOSION VFX & SFX
    // Triggered alongside transformOwner when Egg hatches into Moth
    // ============================================================
    mothHatchBurstVfx: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      AudioSys.play('moth_cocoon_burst');
      a.hitStop = Math.max(a.hitStop, 6);

      // Triple concentric bioluminescent metamorphosis shockwaves
      a.fxPool.spawnShockwave(pX, pY, 0x88ffcc, 145, 6);
      a.fxPool.spawnShockwave(pX, pY, 0xeeff88, 105, 4);
      a.fxPool.spawnShockwave(pX, pY, 0xffffff, 65, 3);

      // Flying cocoon shell shards & golden-emerald wing scales
      for (let i = 0; i < 18; i++) {
        const ang = (Math.PI * 2 * i) / 18 + FastMath.randRange(-0.15, 0.15);
        const spd = FastMath.randRange(2.5, 6.2);
        a.fxPool.spawnPhysics(
          i % 2 === 0 ? 'fx_moth_cocoon_shard' : 'fx_moth_wing_scale',
          pX,
          pY,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          22,
          0.88,
          0.88,
          true,
          i % 3 === 0 ? 0xeeff88 : 0x88ffcc
        );
      }

      e.dead = true;
    },

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
              particleCount: 5,
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
    // Bounces and detonates into a cluster of bioluminescent toxic spores
    // ============================================================
    mothBombVisual: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // On first frame of throw, emit wing-beat aura & scale shimmer on the Moth owner
      if (e.l === e.maxL) {
        const owner = a.playerMap?.[e.p.ownerId] || a.players.find((p) => p.id === e.p.ownerId);
        if (owner && owner.hp > 0) {
          const oPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const oPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
          a.fxPool.spawnPhysics('fx_moth_wing_aura', oPX, oPY, 0, 0, 4, 1, 1, true, 0x88ffcc, 0.85);
          for (let w = 0; w < 3; w++) {
            a.fxPool.spawnPhysics(
              'fx_moth_wing_scale',
              oPX + FastMath.randRange(-10, 10),
              oPY + FastMath.randRange(-8, 8),
              FastMath.randRange(-1.5, 1.5),
              FastMath.randRange(0.5, 2.0),
              12,
              0.9,
              0.9,
              true,
              w === 0 ? 0xeeff88 : 0x88ffcc
            );
          }
        }
      }

      // Render glowing spore bomb core
      a.fxPool.spawnPhysics('fx_moth_bomb', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      // Trailing bioluminescent spores & golden wing scales along flight path
      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics(
          e.l % 4 === 0 ? 'fx_moth_wing_scale' : 'fx_moth_spore',
          pX + FastMath.randRange(-3, 3),
          pY + FastMath.randRange(-3, 3),
          -e.dx * 0.45 + FastMath.randRange(-0.4, 0.4),
          -e.dy * 0.45 + FastMath.randRange(-0.4, 0.4),
          11,
          0.9,
          0.9,
          true,
          e.l % 4 === 0 ? 0xeeff88 : e.p.color
        );
      }

      // Detonation burst on contact or expiration
      if (e.dead || e.l <= 1) {
        a.shake = Math.max(a.shake, 8);
        a.triggerFlash(0.38);
        a.hitStop = Math.max(a.hitStop, 2);
        AudioSys.play('moth_bomb_burst');

        const radPx = (e.p.payload?.zoneRadius || 1.2) * CFG.GRID.TS;
        a.fxPool.spawnShockwave(pX, pY, 0x88ffcc, radPx * 1.25, 5);
        a.fxPool.spawnShockwave(pX, pY, 0xeeff88, radPx * 0.85, 3);
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, radPx * 0.5, 2);

        // Lingering toxic cloud puffs at blast center
        for (let c = 0; c < 5; c++) {
          const cAng = (Math.PI * 2 * c) / 5 + FastMath.randRange(-0.3, 0.3);
          const cSpd = FastMath.randRange(0.8, 2.2);
          a.fxPool.spawnPhysics(
            'fx_moth_cloud',
            pX,
            pY,
            Math.cos(cAng) * cSpd,
            Math.sin(cAng) * cSpd,
            18,
            0.86,
            0.86,
            true,
            0x88ffcc,
            0.8
          );
        }

        // High-velocity spore & wing-scale shrapnel burst
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16 + FastMath.randRange(-0.15, 0.15);
          const speed = FastMath.randRange(2.5, 5.5);
          a.fxPool.spawnPhysics(
            i % 3 === 0 ? 'fx_moth_wing_scale' : 'fx_moth_spore',
            pX,
            pY,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            16,
            0.88,
            0.88,
            true,
            i % 3 === 0 ? 0xeeff88 : e.p.color
          );
        }
      }
    }
  }
};
