// ============================================================
// MINIT: PULSAR (ES Module - Enhanced Cyber-Plasma Turret VFX/SFX)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_PULSAR = {
  id: 'pulsar',
  name: 'PULSAR',
  color: 0xff00aa,
  desc: 'Constant 360° rapid fire drone.',
  stats: { hp: 1100, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 10,
    flash: 0.5,
    particleCount: 28,
    shockRad: 125,
    sound: 'explosion',
    hitStop: 10
  },

  payload: {
    droneOffset: 1,
    fireRate: 2,
    angleStep: 0.22,
    bulletDmg: 12,
    bulletLife: 40,
    bulletSpeed: 0.65,
    hitVfx: {
      shake: 1.5,
      flash: 0.06,
      particleCount: 4,
      particleTex: 'fx_pulsar_spark',
      playSound: true,
      sound: 'pulsar_hit',
      hitStop: 0
    }
  },

  action: {
    cd: 180,
    count: 1,
    speed: 0,
    life: 1,
    sound: 'pulsar_deploy',
    traitList: ['pulsarDeployDrone']
  },

  textures: {
    base: './assets/minit_icon/pulsar.png',
    // High-detail Cyber-Plasma Orbital Turret
    turret: (g, c) => {
      // Outer neon glow aura
      g.beginFill(c, 0.25).drawCircle(0, 0, 9).endFill();
      // Stabilizer cross-fins
      g.beginFill(0x00ffff, 0.9)
        .drawRect(-8, -1.5, 16, 3)
        .drawRect(-1.5, -8, 3, 16)
        .endFill();
      // Armored octagonal/square chassis
      g.lineStyle(1.5, 0xffffff, 1).beginFill(0x220018, 0.95).drawRoundedRect(-5, -5, 10, 10, 2).endFill();
      g.lineStyle(1, c, 1).drawRoundedRect(-6, -6, 12, 12, 2);
      // Glowing plasma reactor core
      g.lineStyle(0).beginFill(c, 1).drawCircle(0, 0, 3).endFill();
      g.beginFill(0xffffff, 1).drawCircle(0, 0, 1.5).endFill();
    }
  },

  customTextures: {
    // Hyper-Plasma Diamond Bolt Projectile
    fx_pulsar_bullet: (g) => {
      // Outer magenta plasma wake
      g.beginFill(0xff00aa, 0.42).drawCircle(0, 0, 6).endFill();
      // Cyan ionized halo
      g.beginFill(0x00ffff, 0.7).moveTo(0, -5.5).lineTo(3.5, 0).lineTo(0, 5.5).lineTo(-3.5, 0).closePath().endFill();
      // Blinding white diamond core
      g.beginFill(0xffffff, 1.0).moveTo(0, -3.5).lineTo(2, 0).lineTo(0, 3.5).lineTo(-2, 0).closePath().endFill();
    },

    // Directional Star Muzzle Flash
    fx_pulsar_muzzle: (g) => {
      g.beginFill(0xff00aa, 0.65).drawCircle(0, 0, 6).endFill();
      g.beginFill(0x00ffff, 0.9)
        .drawPolygon([-7, 0, 0, -2, 7, 0, 0, 2])
        .drawPolygon([0, -7, 2, 0, 0, 7, -2, 0])
        .endFill();
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 2.5).endFill();
    },

    // Holographic Orbital Halo under the Drone
    fx_pulsar_drone_halo: (g) => {
      g.lineStyle(1.5, 0xff00aa, 0.75).drawCircle(0, 0, 11);
      g.lineStyle(1, 0x00ffff, 0.6).drawCircle(0, 0, 7.5);
    },

    // Energy Tether Node between Owner and Drone
    fx_pulsar_tether: (g) => {
      g.beginFill(0x00ffff, 0.85).drawCircle(0, 0, 2).endFill();
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 1).endFill();
    },

    // Ejected Spent Plasma Casing / Spark
    fx_pulsar_shell: (g) => {
      g.beginFill(0xffaa00, 0.95).drawRect(-1.5, -1, 3, 2).endFill();
    },

    // Neon Impact Cross-Spark
    fx_pulsar_spark: (g) => {
      g.beginFill(0xff00aa, 0.9)
        .drawRect(-3.5, -1, 7, 2)
        .drawRect(-1, -3.5, 2, 7)
        .endFill();
      g.beginFill(0x00ffff, 1.0).drawRect(-1.5, -1.5, 3, 3).endFill();
    }
  },

  customAudio: {
    // Sci-Fi Turret Materialization & Spin-Up
    pulsar_deploy: {
      t: 'sawtooth',
      f0: 240,
      seq: [360, 540, 720, 1080],
      v: 0.16,
      d: 0.32,
      ramp: 'lin_exp',
      throttle: 0.1
    },
    // Crisp, futuristic high-RPM plasma repeater
    pulsar_mg: {
      t: 'sawtooth',
      f0: () => 1350 + Math.random() * 550,
      f1: 140,
      v: 0.055,
      d: 0.055,
      ramp: 'exp',
      throttle: 0.045
    },
    // Snappy plasma impact sizzle
    pulsar_hit: {
      t: 'triangle',
      f0: () => 850 + Math.random() * 450,
      f1: 110,
      v: 0.07,
      d: 0.06,
      ramp: 'exp',
      throttle: 0.03
    }
  },

  customTraits: {
    pulsarDeployDrone: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) return;

      const dX = owner.x;
      const dY = owner.y - e.p.payload.droneOffset;
      const pX = dX * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = dY * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Holographic deployment burst
      a.fxPool.spawnShockwave(pX, pY, 0x00ffff, 46, 3);
      a.fxPool.spawnShockwave(pX, pY, 0xff00aa, 32, 2);
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        a.fxPool.spawnPhysics(
          'fx_pulsar_spark',
          pX,
          pY,
          Math.cos(ang) * 2.8,
          Math.sin(ang) * 2.8,
          10,
          0.85,
          0.85,
          true,
          i % 2 === 0 ? 0x00ffff : 0xff00aa
        );
      }

      a.spawnEnt({
        x: dX,
        y: dY,
        l: 120,
        traits: ['pulsarDroneLogic'],
        p: {
          ownerId: owner.id,
          color: 0xff00aa,
          payload: e.p.payload,
          currentAngle: 0,
          shotTimer: 0
        }
      });
      e.dead = true;
    },

    pulsarDroneLogic: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      e.x += (owner.x - e.x) * 0.25;
      e.y += (owner.y - e.p.payload.droneOffset - e.y) * 0.25;
      owner.spr.rotation += 0.05;
      e.rotation = (e.rotation || 0) + 0.15;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const oPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const oPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Energy tether connecting Owner and Drone
      if (e.l % 2 === 0) {
        const tRatio = (e.l % 6) / 6;
        const linkX = oPX + (pX - oPX) * tRatio;
        const linkY = oPY + (pY - oPY) * tRatio;
        a.fxPool.spawnPhysics('fx_pulsar_tether', linkX, linkY, 0, 0, 3, 1, 1, true, 0x00ffff, 0.85);
      }

      // Holographic targeting halo & turret body
      a.fxPool.spawnPhysics('fx_pulsar_drone_halo', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff, 0.8);
      a.fxPool.spawnPhysics('minit_pulsar_turret', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      if (++e.p.shotTimer >= e.p.payload.fireRate) {
        e.p.shotTimer = 0;
        e.p.currentAngle += e.p.payload.angleStep;

        const cosA = Math.cos(e.p.currentAngle);
        const sinA = Math.sin(e.p.currentAngle);
        const vx = cosA * e.p.payload.bulletSpeed;
        const vy = sinA * e.p.payload.bulletSpeed;

        // Directional muzzle flash at barrel tip
        a.fxPool.spawnPhysics(
          'fx_pulsar_muzzle',
          pX + cosA * 8,
          pY + sinA * 8,
          cosA * 0.8,
          sinA * 0.8,
          3,
          0.85,
          0.85,
          true,
          0xffffff
        );

        // Tangential ejected energy casing spark
        const shellAng = e.p.currentAngle - Math.PI * 0.5 + FastMath.randRange(-0.25, 0.25);
        a.fxPool.spawnPhysics(
          'fx_pulsar_shell',
          pX,
          pY,
          Math.cos(shellAng) * 2.2,
          Math.sin(shellAng) * 2.2 - 1.0,
          9,
          0.9,
          0.9,
          true,
          0xffcc00
        );

        // Occasional rotary overdrive pulse ring
        if (e.l % 16 === 0) {
          a.fxPool.spawnShockwave(pX, pY, 0xff00aa, 30, 2);
        }

        a.spawnEnt({
          x: e.x,
          y: e.y,
          dx: vx,
          dy: vy,
          l: e.p.payload.bulletLife,
          traits: ['moveAndBounce', 'ageLife', 'damageRadiusOnHit', 'trailParticles'],
          p: {
            ownerId: e.p.ownerId,
            color: 0xff00aa,
            payload: { dmg: e.p.payload.bulletDmg, hitVfx: e.p.payload.hitVfx },
            vfx: { trailTex: 'fx_pulsar_bullet', radius: 0.8 }
          }
        });
        AudioSys.play('pulsar_mg');
        owner.aS.tX = 1.15;
        owner.aS.tY = 0.85;
      }

      // Drone de-materialization burst when expiring
      if (--e.l <= 0) {
        a.fxPool.spawnShockwave(pX, pY, 0x00ffff, 36, 2);
        e.dead = true;
      }
    }
  }
};
