// ============================================================
// MINIT: SAITAMA (ES Module - One Punch Man - Enhanced VFX/SFX)
// Ability 1: Consecutive Normal Punches (Renzoku Futsū no Panchi)
// Ability 2: Serious Punch (Maji Naguri) with Atmospheric Shock Cannon
// Ability 3: DEATH PUNCH (Dramatic Giant Fist Expansion -> 9999 DMG!)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_SAITAMA = {
  id: 'saitama',
  name: 'Saitama',
  color: 0xffd700,
  desc: 'Winrate Balancer.',
  stats: { hp: 1300, speed: 0.16 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 18,
    flash: 0.85,
    particleCount: 38,
    shockRad: 175,
    sound: 'explosion',
    hitStop: 14
  },

  payload: {
    barrageDmg: 14,        // Per-punch damage during barrage
    seriousDmg: 115,       // Cataclysmic Serious Punch damage
    deathDmg: 9999,        // Guaranteed 9999 Death Punch
    knockbackForce: 1.6    // Arena-clearing knockback force
  },

  action: {
    cd: 180,               // 3.0 seconds cooldown between ability cycles
    count: 1,
    speed: 0,
    life: 60,
    traitList: ['saitamaCycleController']
  },

  textures: {
    base: './assets/minit_icon/saitama.png'
  },

  customTextures: {
    // Red Hero Boxing Glove / Clenched Fist Sprite with Golden Aura Cuff
    fx_saitama_fist: (g) => {
      // Outer crimson speed-aura
      g.beginFill(0xff2200, 0.35).drawRoundedRect(-8, -6, 16, 12, 4);
      // Golden hero glove cuff
      g.beginFill(0xffd700, 0.95).drawRect(-7, -3.5, 3, 7);
      // Red glove body
      g.beginFill(0xcc1111, 1.0).drawRoundedRect(-5, -4.5, 12, 9, 2.5);
      // Thumb & knuckle ridge
      g.beginFill(0xff2222, 1.0).drawCircle(-1, -3, 3);
      // Specular knuckle highlight
      g.beginFill(0xffffff, 0.95).drawRect(3, -3, 2.5, 5);
      g.endFill();
    },

    // Dramatic Giant Death Fist (Ability 3 - Colossal Multi-Layered Glove)
    fx_saitama_giant_fist: (g) => {
      // Apocalyptic outer crimson-gold shock corona
      g.beginFill(0xff0022, 0.28).drawRoundedRect(-28, -22, 56, 44, 10);
      g.lineStyle(2, 0xffd700, 0.75).drawRoundedRect(-25, -19, 50, 38, 8);
      // Deep crimson shadow layer
      g.lineStyle(0).beginFill(0x880000, 0.95).drawRoundedRect(-22, -16, 44, 32, 7);
      // Iconic Red Hero Glove body
      g.beginFill(0xd81414, 1.0).drawRoundedRect(-20, -15, 40, 30, 6);
      // Thumb knuckle
      g.beginFill(0xff2a2a, 1.0).drawCircle(-9, -10, 8.5);
      // White-hot impact knuckle ridges
      g.beginFill(0xffffff, 0.95).drawRoundedRect(6, -11, 6, 22, 2);
      g.beginFill(0xff7777, 0.9).drawRoundedRect(-3, -10, 5, 20, 2);
      g.endFill();
    },

    // Menacing "DEATH" (死) Kanji / Crimson Doom Sigil
    fx_saitama_death_sigil: (g) => {
      g.beginFill(0xff0022, 0.22).drawCircle(0, 0, 22).endFill();
      g.lineStyle(2.5, 0xff0033, 0.95)
        .moveTo(-12, -10).lineTo(12, -10)
        .moveTo(-2, -10).lineTo(-9, 8)
        .moveTo(-7, -2).lineTo(2, -2).lineTo(-3, 10)
        .moveTo(4, -8).lineTo(4, 9).lineTo(12, 9)
        .moveTo(11, -3).lineTo(4, 2);
      g.lineStyle(1, 0xffffff, 0.85)
        .moveTo(-10, -10).lineTo(10, -10);
    },

    // Menacing atmospheric pressure ring
    fx_saitama_pressure_ring: (g) => {
      g.lineStyle(3, 0xff0033, 0.92).drawCircle(0, 0, 28);
      g.lineStyle(1.8, 0xffea00, 1.0).drawCircle(0, 0, 21);
      g.lineStyle(1, 0xffffff, 0.8).drawCircle(0, 0, 15);
      g.beginFill(0xff0000, 0.16).drawCircle(0, 0, 28).endFill();
    },

    // Supersonic Mach Vapor Cone
    fx_saitama_sonic_cone: (g) => {
      g.lineStyle(2.5, 0xffffff, 0.9)
        .moveTo(8, 0)
        .lineTo(-10, -14)
        .moveTo(8, 0)
        .lineTo(-10, 14);
      g.lineStyle(1.5, 0xffdd00, 0.75)
        .arc(0, 0, 10, -1.1, 1.1);
    },

    // High-speed fist ghost trail / wind streak
    fx_saitama_whoosh: (g) => {
      g.beginFill(0xffffff, 0.85).drawPolygon([-10, -2, 10, 0, -10, 2]);
      g.beginFill(0xffdd00, 0.65).drawPolygon([-14, -3.5, 5, 0, -14, 3.5]);
      g.endFill();
    },

    // Serious Red Eye Glint
    fx_saitama_serious_eye: (g) => {
      g.lineStyle(2.5, 0xff0033, 1).moveTo(-8, 0).lineTo(8, 0);
      g.lineStyle(1.5, 0xffffff, 1).moveTo(0, -6).lineTo(0, 6);
      g.beginFill(0xff2222, 1).drawCircle(0, 0, 3).endFill();
      g.beginFill(0xffffff, 1).drawCircle(0, 0, 1.5).endFill();
    },

    // Serious Punch Atmospheric Shockwave Blast
    fx_saitama_serious_shock: (g) => {
      g.lineStyle(3, 0xffffff, 1.0)
        .moveTo(-10, 0)
        .lineTo(30, -22)
        .lineTo(40, 0)
        .lineTo(30, 22)
        .closePath();
      g.lineStyle(1.5, 0xff0033, 0.9)
        .moveTo(-6, 0)
        .lineTo(26, -16)
        .lineTo(34, 0)
        .lineTo(26, 16);
      g.beginFill(0xffdd00, 0.38)
        .moveTo(-8, 0)
        .lineTo(26, -18)
        .lineTo(34, 0)
        .lineTo(26, 18)
        .closePath()
        .endFill();
    },

    // Crimson-Gold Conqueror Ki Lightning Bolt
    fx_saitama_lightning: (g) => {
      g.lineStyle(2.5, 0xff0033, 1.0)
        .moveTo(-10, -12)
        .lineTo(-2, -3)
        .lineTo(-6, 2)
        .lineTo(5, 7)
        .lineTo(10, 13);
      g.lineStyle(1.2, 0xffea00, 0.95)
        .moveTo(-10, -12)
        .lineTo(-2, -3)
        .lineTo(5, 7);
    },

    // Ground Dust & Tectonic Debris
    fx_saitama_dust: (g) => {
      g.beginFill(0xc8b890, 0.85).drawCircle(0, 0, 3.5);
      g.beginFill(0xffeeaa, 0.75).drawCircle(1, -1, 1.8);
      g.endFill();
    },

    // Blazing 4-Point Impact Star Spark
    fx_saitama_spark: (g) => {
      g.beginFill(0xff2200, 0.6).drawCircle(0, 0, 4).endFill();
      g.beginFill(0xffea00, 1.0)
        .drawPolygon([-5, 0, 0, -1.5, 5, 0, 0, 1.5])
        .drawPolygon([0, -5, 1.5, 0, 0, 5, -1.5, 0])
        .endFill();
      g.beginFill(0xffffff, 1.0).drawRect(-1, -1, 2, 2).endFill();
    }
  },

  customAudio: {
    // Heavy anime body-blow punch impact
    saitama_punch_hit: {
      t: 'sawtooth',
      f0: () => 340 + Math.random() * 140,
      f1: 42,
      v: 0.18,
      d: 0.085,
      ramp: 'exp',
      throttle: 0.025
    },
    // Crisp supersonic fist air-whip
    saitama_whoosh: {
      t: 'triangle',
      f0: () => 580 + Math.random() * 180,
      f1: 140,
      v: 0.15,
      d: 0.09,
      ramp: 'exp',
      throttle: 0.035
    },
    // Deep anime tension charge
    saitama_serious_charge: {
      t: 'sawtooth',
      f0: 65,
      f1: 520,
      v: 0.28,
      d: 0.45,
      ramp: 'exp'
    },
    // Earth-shattering Serious Punch shock cannon
    saitama_serious_boom: {
      noise: true,
      d: 0.68,
      fType: 'lowpass',
      f0: 1950,
      f1: 36,
      v: 0.68,
      oF0: 320,
      oF1: 22,
      throttle: 0.1
    },
    // Apocalyptic Death Punch pressure riser
    saitama_death_charge: {
      t: 'sawtooth',
      f0: 42,
      f1: 620,
      v: 0.36,
      d: 1.2,
      ramp: 'exp'
    },
    // Ominous tectonic heartbeat pulse during Giant Fist expansion
    saitama_heartbeat: {
      t: 'triangle',
      f0: 110,
      f1: 28,
      v: 0.24,
      d: 0.12,
      ramp: 'exp',
      throttle: 0.08
    },
    // Cataclysmic 9999 Death Slam detonation
    saitama_death_slam: {
      noise: true,
      d: 0.95,
      fType: 'lowpass',
      f0: 2600,
      f1: 26,
      v: 0.88,
      oF0: 410,
      oF1: 18,
      throttle: 0.1
    },
    // Harmonic metallic shockwave resonance on 9999 impact
    saitama_aftershock: {
      t: 'sawtooth',
      f0: 220,
      f1: 32,
      v: 0.32,
      d: 0.65,
      ramp: 'exp',
      throttle: 0.1
    }
  },

  customTraits: {
    // ============================================================
    // CONTROLLER: Cycles Consecutive Punches -> Serious Punch -> 9999 Death Punch!
    // ============================================================
    saitamaCycleController: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      if (owner.saitamaCycle === undefined) owner.saitamaCycle = 0;
      const currentAbility = owner.saitamaCycle;
      owner.saitamaCycle = (owner.saitamaCycle + 1) % 3;

      if (currentAbility === 0) {
        // ABILITY 1: Consecutive Normal Punches!
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 45,
          maxL: 45,
          traits: ['saitamaConsecutivePunches'],
          p: {
            ownerId: owner.id,
            color: 0xffd700,
            payload: e.p.payload
          }
        });
      } else if (currentAbility === 1) {
        // ABILITY 2: Serious Punch (Maji Naguri)!
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 60,
          maxL: 60,
          traits: ['saitamaSeriousPunch'],
          p: {
            ownerId: owner.id,
            color: 0xffd700,
            payload: e.p.payload
          }
        });
      } else {
        // ABILITY 3: DEATH PUNCH! (Dramatic Giant Expanding Fist -> 9999 DMG!)
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 80,
          maxL: 80,
          traits: ['saitamaGiantFistPunch'],
          p: {
            ownerId: owner.id,
            color: 0xff0000,
            payload: e.p.payload
          }
        });
      }

      e.dead = true;
    },

    // ============================================================
    // ABILITY 1: CONSECUTIVE NORMAL PUNCHES
    // ============================================================
    saitamaConsecutivePunches: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
      if (!tgt || tgt.hp <= 0) {
        e.dead = true;
        return;
      }

      const angle = Math.atan2(tgt.y - owner.y, tgt.x - owner.x);
      const elapsed = e.maxL - e.l;

      owner.x += Math.cos(angle) * 0.035;
      owner.y += Math.sin(angle) * 0.035;

      owner.aS.tX = 1.3 + Math.sin(elapsed * 1.5) * 0.15;
      owner.aS.tY = 0.85 + Math.cos(elapsed * 1.5) * 0.15;

      const oPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const oPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Ground dust kickback behind Saitama's feet during barrage
      if (e.l % 4 === 0) {
        a.fxPool.spawnPhysics(
          'fx_saitama_dust',
          oPX - Math.cos(angle) * 8,
          oPY - Math.sin(angle) * 8,
          -Math.cos(angle) * 2.2 + FastMath.randRange(-0.8, 0.8),
          -Math.sin(angle) * 2.2 + FastMath.randRange(-0.8, 0.8),
          10,
          0.88,
          0.88,
          true,
          0xd8cca8
        );
      }

      if (e.l % 3 === 0) {
        AudioSys.play('saitama_whoosh', 0.25);

        // Supersonic vapor ring at punch origin every 6 frames
        if (e.l % 6 === 0) {
          a.fxPool.spawnPhysics(
            'fx_saitama_sonic_cone',
            oPX + Math.cos(angle) * 10,
            oPY + Math.sin(angle) * 10,
            Math.cos(angle) * 1.5,
            Math.sin(angle) * 1.5,
            6,
            0.85,
            0.85,
            true,
            0xffffff,
            0.75
          );
        }

        const punchSpread = FastMath.randRange(-0.35, 0.35);
        const punchAngle = angle + punchSpread;
        const fistSpeed = 0.45;

        const shoulderOffset = FastMath.randRange(-0.35, 0.35);
        const normalAngle = angle + Math.PI / 2;
        const startX = owner.x + Math.cos(normalAngle) * shoulderOffset;
        const startY = owner.y + Math.sin(normalAngle) * shoulderOffset;

        a.spawnEnt({
          x: startX,
          y: startY,
          dx: Math.cos(punchAngle) * fistSpeed,
          dy: Math.sin(punchAngle) * fistSpeed,
          l: 25,
          maxL: 25,
          traits: ['saitamaFistProjectile', 'damageRadiusOnHit', 'ageLife'],
          p: {
            ownerId: owner.id,
            color: 0xff2222,
            payload: {
              dmg: e.p.payload?.barrageDmg || 14,
              zoneRadius: 1.4,
              destroyOnHit: true,
              hitVfx: {
                shake: 3.5,
                flash: 0.12,
                particleCount: 5,
                particleTex: 'fx_saitama_spark',
                sound: 'saitama_punch_hit',
                playSound: true,
                hitStop: 1
              },
              knockback: {
                forceX: Math.cos(punchAngle) * 0.25,
                forceY: Math.sin(punchAngle) * 0.25,
                shake: 3
              }
            }
          }
        });
      }

      if (--e.l <= 0) e.dead = true;
    },

    // Flying Ghost Fist projectile
    saitamaFistProjectile: (e, a) => {
      e.x += e.dx;
      e.y += e.dy;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      a.fxPool.spawnPhysics('fx_saitama_fist', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);
      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics('fx_saitama_whoosh', pX, pY, -e.dx * 1.6, -e.dy * 1.6, 5, 0.85, 0.85, true, 0xffffff);
      }
    },

    // ============================================================
    // ABILITY 2: SERIOUS PUNCH (MAJI NAGURI)
    // ============================================================
    saitamaSeriousPunch: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
      if (!tgt || tgt.hp <= 0) {
        e.dead = true;
        return;
      }

      const elapsed = e.maxL - e.l;
      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const angle = Math.atan2(tgt.y - owner.y, tgt.x - owner.x);

      // PHASE 1: Atmospheric Tension (0 - 24 frames)
      if (elapsed < 24) {
        if (elapsed === 0) {
          AudioSys.play('saitama_serious_charge');
          a.fxPool.spawnShockwave(pX, pY, 0xff0033, 55, 3);
        }

        owner.dx = 0;
        owner.dy = 0;
        owner.aS.tX = 1.28;
        owner.aS.tY = 0.72;

        a.fxPool.spawnPhysics('fx_saitama_serious_eye', pX, pY - 4, 0, 0, 2, 1, 1, false, 0xff0033);

        // Crackling crimson-gold ki lightning during Serious charge
        if (e.l % 3 === 0) {
          a.fxPool.spawnPhysics(
            'fx_saitama_lightning',
            pX + FastMath.randRange(-12, 12),
            pY + FastMath.randRange(-12, 12),
            0,
            -1.2,
            5,
            0.9,
            0.9,
            true,
            0xffd700
          );
        }

        if (e.l % 2 === 0) {
          const spkAng = FastMath.rand() * 6.28;
          const dist = FastMath.randRange(18, 32);
          a.fxPool.spawnPhysics(
            'fx_saitama_dust',
            pX + Math.cos(spkAng) * dist,
            pY + Math.sin(spkAng) * dist,
            -Math.cos(spkAng) * 2.5,
            -Math.sin(spkAng) * 2.5,
            8,
            0.9,
            0.9,
            true,
            0xd8cca8
          );
        }

        a.shake = Math.max(a.shake, 2.5);
      }
      // PHASE 2: Supersonic Dash & Serious Punch (Frame 24)
      else if (elapsed === 24) {
        AudioSys.play('saitama_serious_boom');
        a.triggerFlash(0.9);
        a.hitStop = 8;
        a.shake = Math.max(a.shake, 24);

        const dashDistance = Math.min(FastMath.dist(owner.x, owner.y, tgt.x, tgt.y) - 0.7, 4.0);
        const actualDash = Math.max(0.5, dashDistance);

        // Spawn sonic cones along dash trajectory
        for (let s = 0; s < 3; s++) {
          const stepRatio = s / 3;
          const trailX = (owner.x + Math.cos(angle) * actualDash * stepRatio) * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const trailY = (owner.y + Math.sin(angle) * actualDash * stepRatio) * CFG.GRID.TS + CFG.GRID.HALF_TS;
          a.fxPool.spawnPhysics('fx_saitama_sonic_cone', trailX, trailY, 0, 0, 10, 1, 1, true, 0xffffff);
        }

        owner.x += Math.cos(angle) * actualDash;
        owner.y += Math.sin(angle) * actualDash;

        const newPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const newPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

        owner.aS.tX = 1.85;
        owner.aS.tY = 0.62;

        a.fxPool.spawnShockwave(newPX, newPY, 0xffd700, 170, 8);
        a.fxPool.spawnShockwave(newPX, newPY, 0xff0033, 130, 5);
        a.fxPool.spawnShockwave(newPX, newPY, 0xffffff, 95, 4);

        for (let i = 0; i < 18; i++) {
          const coneAngle = angle + FastMath.randRange(-0.45, 0.45);
          const spd = FastMath.randRange(4.2, 9.8);
          a.fxPool.spawnPhysics(
            'fx_saitama_serious_shock',
            newPX + Math.cos(coneAngle) * 20,
            newPY + Math.sin(coneAngle) * 20,
            Math.cos(coneAngle) * spd,
            Math.sin(coneAngle) * spd,
            18,
            0.88,
            0.88,
            true,
            0xffffff
          );
        }

        for (let i = 0; i < 22; i++) {
          const dAng = angle + FastMath.randRange(-0.8, 0.8);
          const dSpd = FastMath.randRange(3.0, 8.5);
          a.fxPool.spawnPhysics(
            'fx_saitama_dust',
            newPX,
            newPY,
            Math.cos(dAng) * dSpd,
            Math.sin(dAng) * dSpd,
            24,
            0.9,
            0.9,
            true,
            0xd8cca8
          );
        }

        const dMult = owner.dmgMult || 1.0;
        const finalDmg = (e.p.payload?.seriousDmg || 115) * dMult;

        a.damagePlayer(
          tgt.id,
          {
            dmg: finalDmg,
            hitVfx: {
              shake: 24,
              flash: 0.8,
              particleCount: 18,
              particleTex: 'fx_saitama_spark',
              hitStop: 6,
              playSound: false
            },
            knockback: {
              fromX: owner.x,
              fromY: owner.y,
              force: e.p.payload?.knockbackForce || 1.6,
              shake: 18
            }
          },
          0xffd700
        );

        e.dead = true;
      }

      if (--e.l <= 0) e.dead = true;
    },

    // ============================================================
    // ABILITY 3: DEATH PUNCH (DRAMATIC EXPANDING GIANT FIST -> 9999 DMG)
    // A gigantic red fist slowly grows directly over the target,
    // then slams down dealing 9999 damage with an extra large popup!
    // ============================================================
    saitamaGiantFistPunch: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
      if (!tgt || tgt.hp <= 0) {
        e.dead = true;
        return;
      }

      const elapsed = (e.maxL || 80) - e.l;
      const ownerPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const ownerPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const targetPX = tgt.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const targetPY = tgt.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Saitama assumes menacing absolute focus stance
      owner.dx = 0;
      owner.dy = 0;
      owner.aS.tX = 1.35;
      owner.aS.tY = 0.75;

      // Target is paralyzed in terror under the shadow of the giant fist
      tgt.dx *= 0.15;
      tgt.dy *= 0.15;

      // ----------------------------------------------------
      // PHASE 1: DRAMATIC EXPANDING GIANT FIST (0 - 58 frames)
      // ----------------------------------------------------
      if (elapsed < 58) {
        if (elapsed === 0) {
          AudioSys.play('saitama_death_charge');
          a.fxPool.spawnShockwave(ownerPX, ownerPY, 0xff0033, 95, 4);
        }

        const growProgress = elapsed / 58; // 0.0 -> 1.0
        const fistY = targetPY - (1.0 - growProgress) * 22;

        // Ominous tectonic heartbeat pulse every 14 frames
        if (elapsed > 0 && elapsed % 14 === 0) {
          AudioSys.play('saitama_heartbeat');
          a.fxPool.spawnShockwave(targetPX, targetPY, 0xff0033, 55 + growProgress * 65, 3);
        }

        // Red serious eye glint & Death Sigil on Saitama
        a.fxPool.spawnPhysics('fx_saitama_serious_eye', ownerPX, ownerPY - 4, 0, 0, 2, 1, 1, false, 0xff0033);
        if (e.l % 3 === 0) {
          a.fxPool.spawnPhysics(
            'fx_saitama_death_sigil',
            targetPX,
            targetPY - 26,
            0,
            0,
            3,
            1,
            1,
            false,
            0xff0033,
            0.5 + growProgress * 0.5
          );
        }

        // Render the dramatic giant fist directly hovering over the target!
        const alpha = Math.min(1.0, 0.42 + growProgress * 0.58);
        a.fxPool.spawnPhysics(
          'fx_saitama_giant_fist',
          targetPX,
          fistY,
          0,
          0,
          2,
          1,
          1,
          false,
          0xffffff,
          alpha
        );

        // Conqueror crimson-gold lightning arcs crackling off the Giant Fist
        if (e.l % 3 === 0) {
          a.fxPool.spawnPhysics(
            'fx_saitama_lightning',
            targetPX + FastMath.randRange(-22, 22),
            fistY + FastMath.randRange(-16, 16),
            FastMath.randRange(-1.2, 1.2),
            FastMath.randRange(-1.2, 1.2),
            5,
            0.9,
            0.9,
            true,
            e.l % 6 === 0 ? 0xff0033 : 0xffea00
          );
        }

        // Menacing pressure shock rings pulsing on the target
        if (e.l % 4 === 0) {
          a.fxPool.spawnPhysics(
            'fx_saitama_pressure_ring',
            targetPX,
            targetPY,
            0,
            0,
            4,
            1,
            1,
            true,
            0xff0033,
            growProgress
          );
        }

        // Atmospheric dust swirling into impact point
        if (e.l % 2 === 0) {
          for (let k = 0; k < 2; k++) {
            const spkAng = FastMath.rand() * 6.28;
            const dist = FastMath.randRange(20, 44);
            a.fxPool.spawnPhysics(
              'fx_saitama_dust',
              targetPX + Math.cos(spkAng) * dist,
              targetPY + Math.sin(spkAng) * dist,
              -Math.cos(spkAng) * 3.8,
              -Math.sin(spkAng) * 3.8,
              10,
              0.88,
              0.88,
              true,
              0xd8cca8
            );
          }
        }

        // Escalating screen rumble as the giant fist grows
        a.shake = Math.max(a.shake, growProgress * 8.5);
      }
      // ----------------------------------------------------
      // PHASE 2: 9999 DAMAGE SLAM IMPACT! (Frame 58)
      // ----------------------------------------------------
      else if (elapsed === 58) {
        AudioSys.play('saitama_death_slam');
        AudioSys.play('saitama_aftershock');
        a.triggerFlash(1.0);             // Blinding white flash
        a.hitStop = 16;                  // Dramatic screen freeze
        a.shake = Math.max(a.shake, 36); // Colossal screen shake

        // Massive concentric shockwave rings detonating across arena
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xff0000, 260, 12);
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xffd700, 195, 8);
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xffffff, 130, 6);
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xff0044, 80, 4);

        // Radial lightning & sonic shock eruption
        for (let l = 0; l < 12; l++) {
          const lAng = (Math.PI * 2 * l) / 12;
          a.fxPool.spawnPhysics(
            l % 2 === 0 ? 'fx_saitama_lightning' : 'fx_saitama_serious_shock',
            targetPX,
            targetPY,
            Math.cos(lAng) * 7.5,
            Math.sin(lAng) * 7.5,
            16,
            0.88,
            0.88,
            true,
            l % 2 === 0 ? 0xff0033 : 0xffd700
          );
        }

        // Ground debris blast
        for (let i = 0; i < 30; i++) {
          const dAng = FastMath.rand() * 6.28;
          const dSpd = FastMath.randRange(4.2, 11.5);
          a.fxPool.spawnPhysics(
            'fx_saitama_dust',
            targetPX,
            targetPY,
            Math.cos(dAng) * dSpd,
            Math.sin(dAng) * dSpd,
            26,
            0.9,
            0.9,
            true,
            0xd8cca8
          );
        }

        // DELIVER 9999 DAMAGE WITH EXTRA LARGE POPUP TEXT!
        a.damagePlayer(
          tgt.id,
          {
            dmg: 9999,
            hitVfx: {
              showText: true,
              textScale: 2.6,            // Extra large popup damage text!
              flash: 1.0,
              shake: 36,
              particleCount: 28,
              particleTex: 'fx_saitama_spark',
              sound: 'saitama_punch_hit',
              playSound: true
            },
            knockback: {
              fromX: owner.x,
              fromY: owner.y,
              force: 2.8,                // Rockets target across arena into walls
              shake: 25
            }
          },
          0xff0033
        );

        e.dead = true;
      }

      if (--e.l <= 0) e.dead = true;
    }
  }
};
