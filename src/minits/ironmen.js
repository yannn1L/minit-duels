// ============================================================
// MINIT: IRON MAN (ES Module - 3 Ability Arsenal)
// Ability 1: 4 Homing Missiles with Arc Guidance & Smoke/Spark Trails
// Ability 2: Dual Foot Thruster Boost -> Supersonic Ram -> Massive Knockback
// Ability 3: Unibeam Chest Laser with Arc Reactor Charge & Ray FX
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_IRONMEN = {
  id: 'ironmen',
  name: 'Ironman',
  color: 0xff3333,
  desc: 'Missiles, Thruster ram, Chest laser.',
  stats: { hp: 1500, speed: 0.14 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 12,
    flash: 0.8,
    particleCount: 35,
    shockRad: 150,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    missileDmg: 32,
    ramDmg: 65,
    beamTickDmg: 13,
    knockbackForce: 1.25,
    zoneRadius: 1.5,
    destroyOnHit: true,
    hitVfx: {
      shake: 5,
      flash: 0.2,
      particleCount: 4,
      playSound: true,
      sound: 'iron_missile_hit',
      hitStop: 2
    }
  },

  action: {
    cd: 120,
    count: 1,
    speed: 0.14,
    life: 60,
    traitList: ['ironTripleAbilityController']
  },

  textures: {
    base: './assets/minit_icon/ironmen.png'
  },

  customTextures: {
    // ----------------------------------------------------
    // MISSILE VISUALS
    // ----------------------------------------------------
    fx_iron_missile: (g) => {
      g.beginFill(0xff2222).drawRect(-3, -1.5, 6, 3);
      g.beginFill(0xffdd00).drawRect(2, -1, 2, 2);
      g.beginFill(0xffffff).drawRect(-2, -0.5, 2, 1);
      g.endFill();
    },
    fx_missile_smoke: (g) => {
      g.beginFill(0x9999aa, 0.75).drawCircle(0, 0, 2).endFill();
    },
    fx_missile_fire: (g) => {
      g.beginFill(0xff8800, 0.9).drawCircle(0, 0, 2.5);
      g.beginFill(0xffff55, 1.0).drawCircle(0, 0, 1.2);
      g.endFill();
    },
    fx_missile_spark: (g) => {
      g.beginFill(0x00e5ff).drawRect(-1, -1, 2, 2).endFill();
    },

    // ----------------------------------------------------
    // THRUSTER BOOST & RAM VISUALS
    // ----------------------------------------------------
    fx_iron_boost: (g) => {
      g.beginFill(0x00d4ff, 0.95).drawEllipse(0, 0, 6, 3);
      g.beginFill(0xffffff, 1.0).drawEllipse(0, -1, 3.5, 1.8);
      g.beginFill(0xff5500, 0.85).drawEllipse(0, 2.5, 5, 3.5);
      g.endFill();
    },
    fx_iron_sparks: (g) => {
      g.beginFill(0xffee33).drawRect(-1, -1, 2, 2).endFill();
    },
    fx_iron_boom_ring: (g) => {
      g.lineStyle(2, 0x00e5ff, 0.8).drawCircle(0, 0, 16);
      g.lineStyle(1, 0xffffff, 0.9).drawCircle(0, 0, 12);
    },

    // ----------------------------------------------------
    // UNIBEAM CHEST LASER VISUALS
    // ----------------------------------------------------
    fx_unibeam_charge: (g) => {
      g.beginFill(0x00e5ff, 0.4).drawCircle(0, 0, 12);
      g.beginFill(0x00f5ff, 0.8).drawCircle(0, 0, 7);
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 3.5);
      g.endFill();
    },
    fx_unibeam_ray: (g) => {
      // High-density piercing beam segment
      g.beginFill(0x0099ff, 0.35).drawCircle(0, 0, 11);
      g.beginFill(0x00e5ff, 0.8).drawCircle(0, 0, 6);
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 2.8);
      g.endFill();
    },
    fx_unibeam_ring: (g) => {
      g.lineStyle(1.5, 0x00ffff, 0.75).drawCircle(0, 0, 14);
    },
    fx_unibeam_spark: (g) => {
      g.beginFill(0x88ffff).drawRect(-1.5, -1.5, 3, 3).endFill();
    }
  },

  customAudio: {
    iron_missile_launch: {
      t: 'square',
      f0: 250,
      f1: 950,
      v: 0.12,
      d: 0.12,
      ramp: 'exp',
      throttle: 0.04
    },
    iron_missile_hit: {
      t: 'sawtooth',
      f0: 450,
      f1: 80,
      v: 0.15,
      d: 0.18,
      ramp: 'exp',
      throttle: 0.04
    },
    iron_boost: {
      t: 'sawtooth',
      f0: 80,
      f1: 700,
      v: 0.25,
      d: 0.35,
      ramp: 'exp',
      throttle: 0.1
    },
    iron_dash: {
      t: 'sawtooth',
      f0: 500,
      f1: 180,
      v: 0.22,
      d: 0.25,
      ramp: 'exp',
      throttle: 0.1
    },
    iron_ram_impact: {
      noise: true,
      d: 0.45,
      fType: 'lowpass',
      f0: 1400,
      f1: 50,
      v: 0.5,
      oF0: 220,
      oF1: 30,
      throttle: 0.1
    },
    // Unibeam charge hum
    iron_unibeam_charge: {
      t: 'sine',
      f0: 120,
      f1: 850,
      v: 0.22,
      d: 0.45,
      ramp: 'exp',
      throttle: 0.15
    },
    // Unibeam firing roar
    iron_unibeam_fire: {
      t: 'sawtooth',
      f0: 1200,
      f1: 250,
      v: 0.28,
      d: 0.75,
      ramp: 'lin_exp',
      throttle: 0.1
    },
    iron_unibeam_sizzle: {
      t: 'square',
      f0: () => 900 + Math.random() * 400,
      f1: 120,
      v: 0.1,
      d: 0.06,
      ramp: 'exp',
      throttle: 0.05
    }
  },

  customTraits: {
    // ----------------------------------------------------
    // TRIPLE ABILITY CONTROLLER
    // Cycles seamlessly: Missiles -> Thruster Ram -> Unibeam
    // ----------------------------------------------------
    ironTripleAbilityController: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      if (owner.ironCycle === undefined) owner.ironCycle = 0;
      const currentAbility = owner.ironCycle;
      owner.ironCycle = (owner.ironCycle + 1) % 3;

      if (currentAbility === 0) {
        // ABILITY 1: 4 Homing Missiles with Arc Guidance & Smoke/Spark Trails
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 40,
          traits: ['ironMissileVolley'],
          p: {
            ownerId: owner.id,
            color: 0xff3333,
            payload: { ...e.p.payload, dmg: e.p.payload.missileDmg }
          }
        });
      } else if (currentAbility === 1) {
        // ABILITY 2: Thruster Foot Boost -> Supersonic Ram -> High Knockback
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 50,
          maxL: 50,
          traits: ['ironThrusterRam'],
          p: {
            ownerId: owner.id,
            color: 0xff3333,
            payload: e.p.payload
          }
        });
      } else {
        // ABILITY 3: Unibeam Chest Laser Blast!
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 65,
          maxL: 65,
          traits: ['ironUnibeamBlast'],
          p: {
            ownerId: owner.id,
            color: 0x00e5ff,
            payload: e.p.payload
          }
        });
      }

      e.dead = true;
    },

    // ----------------------------------------------------
    // ABILITY 1: 4 Consecutive Homing Missiles with Enhanced Trails
    // ----------------------------------------------------
    ironMissileVolley: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const salvoInterval = 5;
      const maxShots = 4;
      if (e.p.shotsFired === undefined) e.p.shotsFired = 0;
      if (e.p.shotTimer === undefined) e.p.shotTimer = 0;

      if (e.p.shotsFired < maxShots) {
        if (e.p.shotTimer <= 0) {
          e.p.shotTimer = salvoInterval;
          const shotIndex = e.p.shotsFired++;
          AudioSys.play('iron_missile_launch');

          // Alternating left/right shoulder pod ejection angle
          const podSign = shotIndex % 2 === 0 ? -1 : 1;
          const launchAngle = podSign < 0 ? -Math.PI * 0.35 : -Math.PI * 0.65;

          a.spawnEnt({
            x: owner.x + podSign * 0.35,
            y: owner.y - 0.25,
            dx: Math.cos(launchAngle) * 0.32,
            dy: Math.sin(launchAngle) * 0.32,
            l: 110,
            traits: ['homingMissile', 'damageRadiusOnHit', 'ageLife'],
            p: {
              ownerId: owner.id,
              color: 0xff3333,
              speed: 0.14,
              maxSpeed: 0.54,
              turnRate: 0.15,
              payload: e.p.payload,
              vfx: { radius: 1.5 }
            }
          });

          // Shoulder recoil punch on Iron Man
          owner.aS.tX = 1.25;
          owner.aS.tY = 0.85;
        } else {
          e.p.shotTimer--;
        }
      } else {
        e.dead = true;
      }
    },

    // Homing micro-missiles guidance with multi-layered trails
    homingMissile: (e, a) => {
      const tgt = a.players.find((p) => p.id !== e.p.ownerId && p.hp > 0);
      if (tgt) {
        const desiredAngle = Math.atan2(tgt.y - e.y, tgt.x - e.x);
        let curAngle = Math.atan2(e.dy, e.dx);
        let diff = desiredAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const turn = Math.max(-e.p.turnRate, Math.min(e.p.turnRate, diff));
        curAngle += turn;

        e.p.speed = Math.min(e.p.maxSpeed, e.p.speed + 0.014);
        e.dx = Math.cos(curAngle) * e.p.speed;
        e.dy = Math.sin(curAngle) * e.p.speed;
      }

      e.x += e.dx;
      e.y += e.dy;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Micro-missile sprite
      a.fxPool.spawnPhysics('fx_iron_missile', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      // Trailing multi-layered smoke, rocket flame & tracking sparks
      a.fxPool.spawnPhysics('fx_missile_smoke', pX, pY, -e.dx * 1.5, -e.dy * 1.5, 9, 0.85, 0.85, true, 0xaaaaaa);
      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics('fx_missile_fire', pX, pY, -e.dx * 0.8, -e.dy * 0.8, 5, 0.9, 0.9, true, 0xffaa00);
      }
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics(
          'fx_missile_spark',
          pX + FastMath.randRange(-2, 2),
          pY + FastMath.randRange(-2, 2),
          -e.dx * 1.2,
          -e.dy * 1.2,
          6,
          0.9,
          0.9,
          true,
          0x00ffff
        );
      }
    },

    // ----------------------------------------------------
    // ABILITY 2: Thruster Foot Boost -> Supersonic Ram -> Massive Knockback
    // ----------------------------------------------------
    ironThrusterRam: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const tgt = a.players.find((p) => p.id !== owner.id && p.hp > 0);
      if (!tgt) {
        e.dead = true;
        return;
      }

      const elapsed = e.maxL - e.l;
      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const footY = pY + 10;

      // PHASE 1: THRUSTER FOOT BOOST (0 - 18 frames)
      if (elapsed < 18) {
        if (elapsed === 0) {
          AudioSys.play('iron_boost');
        }

        owner.dx = 0;
        owner.dy = 0;
        owner.aS.tX = 1.35;
        owner.aS.tY = 0.72;

        // Dual foot thruster plumes under left & right boots
        a.fxPool.spawnPhysics('fx_iron_boost', pX - 4, footY, 0, 0, 2, 1, 1, false, 0xffffff);
        a.fxPool.spawnPhysics('fx_iron_boost', pX + 4, footY, 0, 0, 2, 1, 1, false, 0xffffff);

        // Ground scorch sparks
        if (e.l % 2 === 0) {
          for (let i = 0; i < 3; i++) {
            a.fxPool.spawnPhysics(
              'fx_iron_sparks',
              pX + FastMath.randRange(-6, 6),
              footY + FastMath.randRange(0, 3),
              FastMath.randRange(-1.5, 1.5),
              FastMath.randRange(1.8, 3.8),
              10,
              0.9,
              0.9,
              true,
              0xffdd00
            );
          }
        }
      }
      // PHASE 2: SUPERSONIC RAM RUSH (18 - 50 frames)
      else {
        if (elapsed === 18) {
          AudioSys.play('iron_dash');
          a.triggerFlash(0.35);
          a.shake = Math.max(a.shake, 5);

          const ramAngle = Math.atan2(tgt.y - owner.y, tgt.x - owner.x);
          e.p.ramVx = Math.cos(ramAngle) * 0.68;
          e.p.ramVy = Math.sin(ramAngle) * 0.68;

          owner.aS.tX = 1.5;
          owner.aS.tY = 0.78;

          // Sonic boom expansion ring at launch point
          a.fxPool.spawnPhysics('fx_iron_boom_ring', pX, pY, 0, 0, 8, 1, 1, true, 0x00e5ff);
        }

        owner.dx = e.p.ramVx || 0;
        owner.dy = e.p.ramVy || 0;
        owner.x += owner.dx;
        owner.y += owner.dy;

        // Supersonic jet flame and smoke trail
        a.fxPool.spawnPhysics('fx_iron_boost', pX, footY, -owner.dx * 2.2, -owner.dy * 2.2, 4, 0.85, 0.85, true, 0xffffff);
        if (e.l % 2 === 0) {
          a.fxPool.spawnPhysics('fx_missile_smoke', pX, pY, -owner.dx * 1.5, -owner.dy * 1.5, 8, 0.85, 0.85, true, 0xaaaaaa);
        }

        // Ram Collision Detection
        const distToTarget = FastMath.dist(owner.x, owner.y, tgt.x, tgt.y);
        if (distToTarget <= 1.4) {
          AudioSys.play('iron_ram_impact');
          a.triggerFlash(0.65);
          a.hitStop = 4;

          // Heavy slam damage
          a.damagePlayer(
            tgt.id,
            {
              dmg: e.p.payload.ramDmg,
              hitVfx: {
                shake: 14,
                flash: 0.45,
                particleCount: 10,
                playSound: false
              }
            },
            0xff3333
          );

          // MODULAR KNOCKBACK: Heavy impulse sending target across the arena
          a.applyKnockback(tgt.id, {
            fromX: owner.x,
            fromY: owner.y,
            force: e.p.payload.knockbackForce,
            shake: 12,
            playSound: true
          });

          // Impact shockwaves & shrapnel burst
          a.fxPool.spawnShockwave(pX, pY, 0xff3333, 95, 6);
          a.fxPool.spawnShockwave(pX, pY, 0xffffff, 55, 3);

          for (let i = 0; i < 18; i++) {
            const spd = FastMath.randRange(2.5, 6.5);
            const ang = Math.random() * Math.PI * 2;
            a.fxPool.spawnPhysics('fx_iron_sparks', pX, pY, Math.cos(ang) * spd, Math.sin(ang) * spd, 16, 0.9, 0.9, true, 0xffee33);
          }

          owner.dx *= -0.4;
          owner.dy *= -0.4;
          owner.aS.tX = 1.35;
          owner.aS.tY = 1.35;

          e.dead = true;
          return;
        }
      }

      if (--e.l <= 0) e.dead = true;
    },

    // ----------------------------------------------------
    // ABILITY 3: UNIBEAM CHEST LASER BLAST
    // Charges Arc Reactor -> Fires piercing high-density Unibeam ray
    // ----------------------------------------------------
    ironUnibeamBlast: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const elapsed = e.maxL - e.l;
      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Lock on initial target vector
      if (elapsed === 0) {
        AudioSys.play('iron_unibeam_charge');
        const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
        e.p.targetId = tgt ? tgt.id : null;
        e.p.aimAngle = tgt ? Math.atan2(tgt.y - owner.y, tgt.x - owner.x) : 0;
      }

      const target = a.players.find((p) => p.id === e.p.targetId);
      if (target && target.hp > 0) {
        e.p.aimAngle = Math.atan2(target.y - owner.y, target.x - owner.x);
      }
      const angle = e.p.aimAngle;

      // PHASE 1: ARC REACTOR CHARGE (0 - 20 frames)
      if (elapsed < 20) {
        owner.dx = 0;
        owner.dy = 0;

        // Arc reactor charging pulse at chest
        a.fxPool.spawnPhysics('fx_unibeam_charge', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

        // Inward gathering energy sparks
        if (e.l % 2 === 0) {
          const spkAng = Math.random() * Math.PI * 2;
          const dist = 18;
          a.fxPool.spawnPhysics(
            'fx_unibeam_spark',
            pX + Math.cos(spkAng) * dist,
            pY + Math.sin(spkAng) * dist,
            -Math.cos(spkAng) * 2.2,
            -Math.sin(spkAng) * 2.2,
            8,
            0.9,
            0.9,
            true,
            0x00e5ff
          );
        }

        // Breathing recoil preparation
        owner.aS.tX = 1.1 + Math.sin(elapsed * 0.4) * 0.12;
        owner.aS.tY = 1.1 + Math.sin(elapsed * 0.4) * 0.12;
      }
      // PHASE 2: UNIBEAM REAL VECTOR FIRING (20 - 65 frames)
      else {
        if (elapsed === 20) {
          AudioSys.play('iron_unibeam_fire');
          a.triggerFlash(0.5);
          a.hitStop = 4;
          a.shake = Math.max(a.shake, 8);
          e.p.beamId = 'iron_unibeam_' + e.p.ownerId;
          // Locked firing trajectory as confirmed by user
          e.p.fixedAngle = angle;
        }

        const fireAngle = e.p.fixedAngle !== undefined ? e.p.fixedAngle : angle;

        // Recoil pushback on Iron Man
        owner.x -= Math.cos(fireAngle) * 0.03;
        owner.y -= Math.sin(fireAngle) * 0.03;
        owner.aS.tX = 1.35;
        owner.aS.tY = 0.85;

        // Render high-intensity Arc Reactor Unibeam
        const beamLength = 480;
        const endX = pX + Math.cos(fireAngle) * beamLength;
        const endY = pY + Math.sin(fireAngle) * beamLength;

        if (a.beamRenderer) {
          a.beamRenderer.renderBeam(e.p.beamId, {
            startX: pX,
            startY: pY,
            endX,
            endY,
            coreColor: 0xffffff,
            sheathColor: 0x00ffff,
            glowColor: 0x0099ff,
            coreWidth: 5,
            sheathWidth: 14,
            glowWidth: 30,
            glowAlpha: 0.42,
            sheathAlpha: 0.85,
            hasLightning: true,
            lightningColor: 0x88ffff,
            lightningBranches: 2,
            jitter: 1.0
          });
        }

        // Energy pulses & thruster sparks
        if (e.l % 3 === 0) {
          const sparkDist = FastMath.randRange(30, beamLength * 0.8);
          a.fxPool.spawnPhysics(
            'fx_unibeam_spark',
            pX + Math.cos(fireAngle) * sparkDist,
            pY + Math.sin(fireAngle) * sparkDist,
            FastMath.randRange(-1.5, 1.5),
            FastMath.randRange(-1.5, 1.5),
            6,
            0.9,
            0.9,
            true,
            0x00ffff
          );
        }

        // Ray collision and directional knockback
        if (e.l % 4 === 0) {
          AudioSys.play('iron_unibeam_sizzle');
          const dMult = owner.dmgMult || 1.0;
          a.players.forEach((p) => {
            if (p.id !== owner.id && p.hp > 0) {
              const p_pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const p_pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

              const dist = Math.abs(Math.sin(fireAngle) * (pX - p_pX) - Math.cos(fireAngle) * (pY - p_pY));
              const dot = Math.cos(fireAngle) * (p_pX - pX) + Math.sin(fireAngle) * (p_pY - pY);

              if (dist <= 26 && dot > 0) {
                a.damagePlayer(
                  p.id,
                  {
                    dmg: (e.p.payload.beamTickDmg || 13) * dMult,
                    hitVfx: {
                      shake: 4,
                      flash: 0.15,
                      particleCount: 4,
                      particleTex: 'fx_unibeam_spark',
                      hitStop: 1,
                      playSound: false
                    },
                    knockback: {
                      forceX: Math.cos(fireAngle) * (e.p.payload.knockbackForce || 0.65),
                      forceY: Math.sin(fireAngle) * (e.p.payload.knockbackForce || 0.65),
                      shake: 6
                    }
                  },
                  0x00e5ff
                );
              }
            }
          });
        }
      }

      if (--e.l <= 0) {
        if (e.p.beamId && a.beamRenderer) a.beamRenderer.removeBeam(e.p.beamId);
        e.dead = true;
      }
    }
  }
};
