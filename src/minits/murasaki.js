// ============================================================
// MINIT: MURASAKI / GOJO (ES Module - Colossal Hollow Purple Orb)
// Massive Slow-Moving Purple Sphere with Giant Electric FX
// Big Initial Hit Damage + Overtime Damage in Electric Aura
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_MURASAKI = {
  id: 'murasaki',
  name: 'Gojo',
  color: 0x9900ff,
  desc: 'Murasaki.',
  stats: { hp: 1400, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 15,
    flash: 0.8,
    particleCount: 35,
    shockRad: 180,
    sound: 'explosion',
    hitStop: 15
  },

  payload: {
    initialDmg: 85,          // Massive initial burst damage on first contact
    electricTickDmg: 35       // Continuous damage-over-time in the electric field
  },

  action: {
    cd: 210,
    count: 1,
    speed: 0,
    life: 75,
    traitList: ['hollowPurpleSequence']
  },

  textures: {
    base: './assets/minit_icon/murasaki.png'
  },

  customTextures: {
    // Red & Blue singularities for chanting ritual
    fx_murasaki_blue: (g) =>
      g.beginFill(0x0044ff).drawCircle(0, 0, 10).beginFill(0xffffff).drawCircle(0, 0, 3).endFill(),
    fx_murasaki_red: (g) =>
      g.beginFill(0xff0044).drawCircle(0, 0, 10).beginFill(0xffffff).drawCircle(0, 0, 3).endFill(),

    // Colossal Hollow Purple Ball (Enlarged multi-layer sphere)
    fx_murasaki_ball: (g) => {
      // Outer massive gravitational distortion corona
      g.beginFill(0x330055, 0.35).drawCircle(0, 0, 36);
      // Violet energetic body
      g.beginFill(0x7700cc, 0.7).drawCircle(0, 0, 26);
      // Vibrant purple plasma
      g.beginFill(0x9900ff, 0.88).drawCircle(0, 0, 18);
      // Bright magenta plasma core
      g.beginFill(0xee33ff, 0.98).drawCircle(0, 0, 11);
      // Blinding white singularity center
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 5.5);
      g.endFill();
    },

    // Giant crackling electric lightning arcs around the ball
    fx_murasaki_lightning_huge: (g) => {
      g.lineStyle(3, 0xffffff, 1)
        .moveTo(-16, -14)
        .lineTo(-6, -4)
        .lineTo(-10, 2)
        .lineTo(8, 8)
        .lineTo(16, 16);
      g.lineStyle(1.5, 0xcc33ff, 0.85)
        .moveTo(-6, -4)
        .lineTo(4, -8)
        .lineTo(12, -4);
      g.endFill();
    },

    // Secondary Cyan/Blue High-Voltage Lightning Arc
    fx_murasaki_lightning_blue: (g) => {
      g.lineStyle(2.5, 0x00ffff, 0.95)
        .moveTo(14, -16)
        .lineTo(2, -6)
        .lineTo(8, 0)
        .lineTo(-8, 10)
        .lineTo(-14, 18);
      g.endFill();
    },

    // Electric sparks
    fx_murasaki_spark: (g) => g.beginFill(0xdd88ff).drawRect(-2, -2, 4, 4).endFill(),

    // Cursed Energy Aura surrounding Gojo during charge
    fx_gojo_aura_ring: (g) => {
      g.lineStyle(2, 0xaa33ff, 0.8).drawCircle(0, 0, 16);
      g.lineStyle(1, 0x00ffff, 0.6).drawCircle(0, 0, 13);
      g.beginFill(0x7700cc, 0.2).drawCircle(0, 0, 16).endFill();
    },
    fx_gojo_aura_wisp: (g) => {
      g.beginFill(0xbb55ff, 0.85).drawRect(-1.5, -2, 3, 4);
      g.beginFill(0xffffff, 0.9).drawRect(-1, -1, 2, 2).endFill();
    }
  },

  customAudio: {
    murasaki_charge: { t: 'sawtooth', f0: 40, f1: 1200, v: 0.2, d: 1.5, ramp: 'exp' },
    murasaki_merge: { t: 'square', f0: 1500, f1: 30, v: 0.4, d: 0.3, ramp: 'exp' },
    murasaki_fire: { t: 'sawtooth', f0: 3000, f1: 400, f2: 50, v: 0.38, d: 1.2, ramp: 'lin_exp' },
    murasaki_hit: {
      t: 'square',
      f0: () => 1000 + Math.random() * 800,
      f1: 100,
      v: 0.22,
      d: 0.12,
      ramp: 'exp',
      throttle: 0.05
    },
    murasaki_shock: {
      t: 'sawtooth',
      f0: () => 600 + Math.random() * 400,
      f1: 120,
      v: 0.1,
      d: 0.06,
      ramp: 'exp',
      throttle: 0.05
    }
  },

  customTraits: {
    // ============================================================
    // STAGE 1: GOJO CHANTING & FORMING PURPLE SINGULARITY (75 frames)
    // ============================================================
    hollowPurpleSequence: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }
      e.x = owner.x;
      e.y = owner.y;
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Frame 1: Initialize & Lock Target
      if (e.l === e.maxL) {
        AudioSys.play('murasaki_charge', 1.5);
        const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
        e.p.targetId = tgt ? tgt.id : null;
        e.p.lastAngle = tgt ? Math.atan2(tgt.y - owner.y, tgt.x - owner.x) : 0;
      }

      const target = a.players.find((p) => p.id === e.p.targetId);
      if (target && target.hp > 0) {
        e.p.lastAngle = Math.atan2(target.y - owner.y, target.x - owner.x);
      }
      const angle = e.p.lastAngle;
      const elapsed = (e.maxL || 75) - e.l;

      // Cursed Energy Aura surrounding Gojo
      a.fxPool.spawnPhysics('fx_gojo_aura_ring', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);
      if (e.l % 2 === 0) {
        const wispAngle = FastMath.rand() * 6.28;
        const wispDist = FastMath.randRange(4, 14);
        a.fxPool.spawnPhysics(
          'fx_gojo_aura_wisp',
          pX + Math.cos(wispAngle) * wispDist,
          pY + Math.sin(wispAngle) * wispDist,
          FastMath.randRange(-0.5, 0.5),
          -FastMath.randRange(1.2, 2.5),
          12,
          0.9,
          0.9,
          true,
          0xbb55ff
        );
      }

      owner.aS.tX = 1.05 + Math.sin(elapsed * 0.35) * 0.12;
      owner.aS.tY = 1.05 + Math.sin(elapsed * 0.35) * 0.12;

      // Helper function to launch the enlarged, slow Hollow Purple orb
      const launchOrb = () => {
        if (e.p.hasFired) return;
        e.p.hasFired = true;

        AudioSys.play('murasaki_fire');
        a.triggerFlash(0.9);
        a.hitStop = 6;
        a.shake = Math.max(a.shake, 16);

        // Recoil kick on Gojo
        owner.x -= Math.cos(angle) * 0.32;
        owner.y -= Math.sin(angle) * 0.32;
        owner.aS.tX = 1.5;
        owner.aS.tY = 0.7;

        // Firing shockwaves
        a.fxPool.spawnShockwave(pX, pY, 0x9900ff, 140, 7);
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, 70, 4);

        // Spawn flying Colossal Hollow Purple orb entity (slower speed: 0.18 for dramatic presence)
        const orbSpeed = 0.18;
        a.spawnEnt({
          x: owner.x + Math.cos(angle) * 0.8,
          y: owner.y + Math.sin(angle) * 0.8,
          dx: Math.cos(angle) * orbSpeed,
          dy: Math.sin(angle) * orbSpeed,
          l: 260, // Travels deliberately across arena
          maxL: 260,
          traits: ['murasakiOrbFlight', 'ageLife'],
          p: {
            ownerId: owner.id,
            color: 0x9900ff,
            initialDmg: e.p.payload?.initialDmg || 85,
            electricTickDmg: e.p.payload?.electricTickDmg || 9
          }
        });

        e.dead = true;
      };

      // PHASE 1: FORMING RED & BLUE ORBS (0 - 50 frames)
      if (elapsed < 50) {
        const offset = 28;
        const leftX = pX + Math.cos(angle - Math.PI / 2) * offset;
        const leftY = pY + Math.sin(angle - Math.PI / 2) * offset;
        const rightX = pX + Math.cos(angle + Math.PI / 2) * offset;
        const rightY = pY + Math.sin(angle + Math.PI / 2) * offset;

        a.fxPool.spawnPhysics('fx_murasaki_blue', leftX, leftY, 0, 0, 2, 1, 1, false, 0xffffff);
        a.fxPool.spawnPhysics('fx_murasaki_red', rightX, rightY, 0, 0, 2, 1, 1, false, 0xffffff);

        if (e.l % 3 === 0) {
          const a1 = Math.random() * Math.PI * 2;
          a.fxPool.spawnPhysics('fx_murasaki_spark', leftX + Math.cos(a1) * 16, leftY + Math.sin(a1) * 16, -Math.cos(a1) * 2, -Math.sin(a1) * 2, 6, 1, 1, false, 0x0088ff);
          const a2 = Math.random() * Math.PI * 2;
          a.fxPool.spawnPhysics('fx_murasaki_spark', rightX + Math.cos(a2) * 16, rightY + Math.sin(a2) * 16, -Math.cos(a2) * 2, -Math.sin(a2) * 2, 6, 1, 1, false, 0xff0044);
        }
      }
      // PHASE 2: MERGE INTO SINGULARITY (50 - 70 frames)
      else if (elapsed < 70) {
        const progress = (elapsed - 50) / 20;
        const offset = 28 * (1 - Math.pow(progress, 2));

        const leftX = pX + Math.cos(angle - Math.PI / 2) * offset;
        const leftY = pY + Math.sin(angle - Math.PI / 2) * offset;
        const rightX = pX + Math.cos(angle + Math.PI / 2) * offset;
        const rightY = pY + Math.sin(angle + Math.PI / 2) * offset;

        a.fxPool.spawnPhysics('fx_murasaki_blue', leftX, leftY, 0, 0, 2, 1, 1, false, 0xffffff);
        a.fxPool.spawnPhysics('fx_murasaki_red', rightX, rightY, 0, 0, 2, 1, 1, false, 0xffffff);

        if (elapsed === 69) {
          AudioSys.play('murasaki_merge');
          a.triggerFlash(0.9);
          a.shake = Math.max(a.shake, 14);
        }
      }
      // PHASE 3: LAUNCH ENLARGED PURPLE ORB! (When elapsed >= 70)
      else {
        launchOrb();
        return;
      }

      if (--e.l <= 0) {
        launchOrb();
      }
    },

    // ============================================================
    // STAGE 2: COLOSSAL HOLLOW PURPLE ORB (NO BURNING TRAIL)
    // Slower speed, larger orb, massive lightning FX
    // Big damage on first hit + Overtime damage inside electric aura
    // ============================================================
    murasakiOrbFlight: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;

      // Initialize set of enemies that already received the big initial impact
      if (!e.p.firstHitTargets) {
        e.p.firstHitTargets = new Set();
      }

      // Move slowly & menacingly forward
      e.x += e.dx;
      e.y += e.dy;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Render Colossal Hollow Purple orb
      a.fxPool.spawnPhysics('fx_murasaki_ball', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      // Massive crackling electric lightning arcs around the giant sphere
      for (let i = 0; i < 4; i++) {
        const electAngle = FastMath.rand() * 6.28;
        const electDist = FastMath.randRange(16, 42); // Wider electric aura radius
        const tex = Math.random() > 0.4 ? 'fx_murasaki_lightning_huge' : 'fx_murasaki_lightning_blue';
        a.fxPool.spawnPhysics(
          tex,
          pX + Math.cos(electAngle) * electDist,
          pY + Math.sin(electAngle) * electDist,
          FastMath.randRange(-1.5, 1.5),
          FastMath.randRange(-1.5, 1.5),
          3,
          0.9,
          0.9,
          false,
          0xffffff
        );
      }

      // Dense inward vacuum sparks
      if (e.l % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          const spkAng = FastMath.rand() * 6.28;
          const spkDist = FastMath.randRange(30, 55);
          a.fxPool.spawnPhysics(
            'fx_murasaki_spark',
            pX + Math.cos(spkAng) * spkDist,
            pY + Math.sin(spkAng) * spkDist,
            -Math.cos(spkAng) * 3.5,
            -Math.sin(spkAng) * 3.5,
            8,
            0.85,
            0.85,
            true,
            0xdd66ff
          );
        }
      }

      // Continuous deep screen rumble as the colossal orb advances
      a.shake = Math.max(a.shake, 3.0);

      // Hitbox Radii:
      // - Core Orb Radius: ~2.4 grid units (first big hit)
      // - Electric Aura Radius: ~3.4 grid units (overtime damage)
      const orbCoreRadius = 2.4;
      const electricRadius = 3.4;

      a.players.forEach((p) => {
        if (p.id !== e.p.ownerId && p.hp > 0) {
          const dist = FastMath.dist(e.x, e.y, p.x, p.y);

          // --------------------------------------------------------
          // 1. FIRST TIME HIT: MASSIVE IMPACT BURST DAMAGE!
          // --------------------------------------------------------
          if (dist <= orbCoreRadius && !e.p.firstHitTargets.has(p.id)) {
            e.p.firstHitTargets.add(p.id);

            const initialDmg = (e.p.initialDmg || 85) * dMult;
            a.damagePlayer(
              p.id,
              {
                dmg: initialDmg,
                hitVfx: {
                  shake: 18,
                  flash: 0.5,
                  particleCount: 14,
                  particleTex: 'fx_murasaki_spark',
                  hitStop: 5,
                  sound: 'murasaki_hit'
                },
                knockback: {
                  fromX: e.x,
                  fromY: e.y,
                  force: 1.25,
                  shake: 15
                }
              },
              0x9900ff
            );

            // Explosive shockwave on first contact
            a.fxPool.spawnShockwave(pX, pY, 0xcc00ff, 95, 6);
            for (let k = 0; k < 8; k++) {
              const kAng = FastMath.rand() * 6.28;
              a.fxPool.spawnPhysics('fx_murasaki_lightning_huge', pX, pY, Math.cos(kAng) * 4, Math.sin(kAng) * 4, 6, 0.9, 0.9, true, 0xffffff);
            }
          }

          // --------------------------------------------------------
          // 2. OVERTIME DAMAGE: ELECTRIC FX CONTACT
          // Continuous electric shocks while inside the electric field
          // --------------------------------------------------------
          if (dist <= electricRadius) {
            // Slight magnetic gravitational drag pulling victim towards orb center
            p.x -= (p.x - e.x) * 0.04;
            p.y -= (p.y - e.y) * 0.04;

            // Tick overtime damage every 6 frames
            if (e.l % 6 === 0) {
              const tickDmg = (e.p.electricTickDmg || 9) * dMult;
              a.damagePlayer(
                p.id,
                {
                  dmg: tickDmg,
                  hitVfx: {
                    shake: 2,
                    flash: 0.08,
                    particleCount: 2,
                    particleTex: 'fx_murasaki_spark',
                    playSound: false
                  }
                },
                0x00e5ff
              );
              AudioSys.play('murasaki_shock', 0.15);
            }
          }
        }
      });

      // Arena boundary collision: Detonates when completely off-screen
      if (
        e.x < CFG.ARENA_BOUNDS.MIN_X - 2.5 ||
        e.x > CFG.ARENA_BOUNDS.MAX_X + 2.5 ||
        e.y < CFG.ARENA_BOUNDS.MIN_Y - 2.5 ||
        e.y > CFG.ARENA_BOUNDS.MAX_Y + 2.5
      ) {
        a.triggerFlash(0.7);
        a.shake = Math.max(a.shake, 14);
        a.fxPool.spawnShockwave(pX, pY, 0x9900ff, 150, 7);
        AudioSys.play('explosion', 0.7);
        e.dead = true;
      }
    }
  }
};
