// ============================================================
// MINIT: SAITAMA (ES Module - One Punch Man)
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
    shake: 14,
    flash: 0.8,
    particleCount: 30,
    shockRad: 160,
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
    // Red Hero Boxing Glove / Clenched Fist Sprite
    fx_saitama_fist: (g) => {
      // Red glove body
      g.beginFill(0xcc1111).drawRoundedRect(-6, -4, 12, 8, 2);
      // Thumb knuckle
      g.beginFill(0xee2222).drawCircle(-2, -3, 3);
      // Knuckle highlight
      g.beginFill(0xffffff, 0.85).drawRect(2, -2, 2, 4);
      g.endFill();
    },

    // Dramatic Giant Death Fist (Ability 3)
    fx_saitama_giant_fist: (g) => {
      // Outer destructive red aura
      g.beginFill(0xff0033, 0.4).drawRoundedRect(-24, -18, 48, 36, 8);
      // Red glove body
      g.beginFill(0xd41414, 0.98).drawRoundedRect(-20, -15, 40, 30, 6);
      // Thumb knuckle
      g.beginFill(0xff2222, 1.0).drawCircle(-10, -10, 8);
      // Knuckle highlight ridges
      g.beginFill(0xffffff, 0.9).drawRect(6, -10, 5, 20);
      g.beginFill(0xff6666, 0.9).drawRect(-4, -10, 5, 20);
      g.endFill();
    },

    // Menacing atmospheric pressure ring
    fx_saitama_pressure_ring: (g) => {
      g.lineStyle(3, 0xff0033, 0.9).drawCircle(0, 0, 28);
      g.lineStyle(1.5, 0xffea00, 1.0).drawCircle(0, 0, 20);
      g.beginFill(0xff0000, 0.2).drawCircle(0, 0, 28).endFill();
    },

    // High-speed fist ghost trail / wind streak
    fx_saitama_whoosh: (g) => {
      g.beginFill(0xffffff, 0.7).drawPolygon([-8, -2, 8, 0, -8, 2]);
      g.beginFill(0xffdd00, 0.5).drawPolygon([-12, -3, 4, 0, -12, 3]);
      g.endFill();
    },

    // Serious Red Eye Glint
    fx_saitama_serious_eye: (g) => {
      g.lineStyle(2, 0xff0033, 1).moveTo(-6, 0).lineTo(6, 0);
      g.lineStyle(1, 0xffffff, 1).moveTo(0, -4).lineTo(0, 4);
      g.beginFill(0xff2222).drawCircle(0, 0, 2).endFill();
    },

    // Serious Punch Atmospheric Shockwave Blast
    fx_saitama_serious_shock: (g) => {
      g.lineStyle(3, 0xffffff, 1.0)
        .moveTo(-10, 0)
        .lineTo(30, -22)
        .lineTo(38, 0)
        .lineTo(30, 22)
        .closePath();
      g.beginFill(0xffdd00, 0.35)
        .moveTo(-8, 0)
        .lineTo(26, -18)
        .lineTo(32, 0)
        .lineTo(26, 18)
        .closePath()
        .endFill();
    },

    // Ground Dust & Debris
    fx_saitama_dust: (g) => {
      g.beginFill(0xd8cca8, 0.8).drawCircle(0, 0, 3);
      g.beginFill(0xffeeaa, 0.6).drawCircle(1, -1, 1.5);
      g.endFill();
    },

    // Punch Impact Sparkle
    fx_saitama_spark: (g) => {
      g.beginFill(0xffea00).drawRect(-1.5, -1.5, 3, 3).endFill();
    }
  },

  customAudio: {
    saitama_punch_hit: {
      t: 'sawtooth',
      f0: 320,
      f1: 50,
      v: 0.16,
      d: 0.08,
      ramp: 'exp',
      throttle: 0.03
    },
    saitama_whoosh: {
      t: 'sine',
      f0: 550,
      f1: 180,
      v: 0.14,
      d: 0.1,
      ramp: 'exp',
      throttle: 0.04
    },
    saitama_serious_charge: {
      t: 'sawtooth',
      f0: 80,
      f1: 450,
      v: 0.28,
      d: 0.45,
      ramp: 'exp'
    },
    saitama_serious_boom: {
      noise: true,
      d: 0.65,
      fType: 'lowpass',
      f0: 1800,
      f1: 40,
      v: 0.65,
      oF0: 300,
      oF1: 25,
      throttle: 0.1
    },
    saitama_death_charge: {
      t: 'sawtooth',
      f0: 45,
      f1: 550,
      v: 0.35,
      d: 1.2,
      ramp: 'exp'
    },
    saitama_death_slam: {
      noise: true,
      d: 0.9,
      fType: 'lowpass',
      f0: 2400,
      f1: 30,
      v: 0.85,
      oF0: 380,
      oF1: 20,
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

      if (e.l % 3 === 0) {
        AudioSys.play('saitama_whoosh', 0.2);

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
                shake: 3,
                flash: 0.1,
                particleCount: 3,
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
        a.fxPool.spawnPhysics('fx_saitama_whoosh', pX, pY, -e.dx * 1.5, -e.dy * 1.5, 4, 0.85, 0.85, true, 0xffffff);
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
        }

        owner.dx = 0;
        owner.dy = 0;
        owner.aS.tX = 1.25;
        owner.aS.tY = 0.75;

        a.fxPool.spawnPhysics('fx_saitama_serious_eye', pX, pY - 4, 0, 0, 2, 1, 1, false, 0xff0033);

        if (e.l % 2 === 0) {
          const spkAng = FastMath.rand() * 6.28;
          const dist = FastMath.randRange(16, 28);
          a.fxPool.spawnPhysics(
            'fx_saitama_dust',
            pX + Math.cos(spkAng) * dist,
            pY + Math.sin(spkAng) * dist,
            -Math.cos(spkAng) * 2.2,
            -Math.sin(spkAng) * 2.2,
            8,
            0.9,
            0.9,
            true,
            0xd8cca8
          );
        }

        a.shake = Math.max(a.shake, 2);
      }
      // PHASE 2: Supersonic Dash & Serious Punch (Frame 24)
      else if (elapsed === 24) {
        AudioSys.play('saitama_serious_boom');
        a.triggerFlash(0.9);
        a.hitStop = 8;
        a.shake = Math.max(a.shake, 24);

        const dashDistance = Math.min(FastMath.dist(owner.x, owner.y, tgt.x, tgt.y) - 0.7, 4.0);
        owner.x += Math.cos(angle) * Math.max(0.5, dashDistance);
        owner.y += Math.sin(angle) * Math.max(0.5, dashDistance);

        const newPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const newPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

        owner.aS.tX = 1.8;
        owner.aS.tY = 0.65;

        a.fxPool.spawnShockwave(newPX, newPY, 0xffd700, 160, 8);
        a.fxPool.spawnShockwave(newPX, newPY, 0xffffff, 90, 4);

        for (let i = 0; i < 18; i++) {
          const coneAngle = angle + FastMath.randRange(-0.45, 0.45);
          const spd = FastMath.randRange(4.0, 9.5);
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
          const dSpd = FastMath.randRange(3.0, 8.0);
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
              particleCount: 16,
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
        }

        const growProgress = elapsed / 58; // 0.0 -> 1.0
        const fistY = targetPY - (1.0 - growProgress) * 20;

        // Red serious eye glint on Saitama
        a.fxPool.spawnPhysics('fx_saitama_serious_eye', ownerPX, ownerPY - 4, 0, 0, 2, 1, 1, false, 0xff0033);

        // Render the dramatic giant fist directly hovering over the target!
        const alpha = Math.min(1.0, 0.4 + growProgress * 0.6);
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
            const dist = FastMath.randRange(18, 40);
            a.fxPool.spawnPhysics(
              'fx_saitama_dust',
              targetPX + Math.cos(spkAng) * dist,
              targetPY + Math.sin(spkAng) * dist,
              -Math.cos(spkAng) * 3.5,
              -Math.sin(spkAng) * 3.5,
              10,
              0.88,
              0.88,
              true,
              0xd8cca8
            );
          }
        }

        // Escalating screen rumble as the giant fist grows
        a.shake = Math.max(a.shake, growProgress * 7.5);
      }
      // ----------------------------------------------------
      // PHASE 2: 9999 DAMAGE SLAM IMPACT! (Frame 58)
      // ----------------------------------------------------
      else if (elapsed === 58) {
        AudioSys.play('saitama_death_slam');
        a.triggerFlash(1.0);             // Blinding white flash
        a.hitStop = 16;                  // Dramatic screen freeze
        a.shake = Math.max(a.shake, 35); // Colossal screen shake

        // Massive shockwave rings detonating across arena
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xff0000, 240, 12);
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xffd700, 180, 8);
        a.fxPool.spawnShockwave(targetPX, targetPY, 0xffffff, 110, 5);

        // Ground debris blast
        for (let i = 0; i < 28; i++) {
          const dAng = FastMath.rand() * 6.28;
          const dSpd = FastMath.randRange(4.0, 11.0);
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
              shake: 35,
              particleCount: 25,
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
