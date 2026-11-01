// ============================================================
// MINIT: ABSORB (ES Module - Enhanced Singularity Vortex & Siphon VFX/SFX)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_ABSORB = {
  id: 'absorb',
  name: 'ABSORB',
  color: 0xff4422,
  desc: 'Creates a gravity vortex. Drains HP and grows in size & power.',
  stats: { hp: 1250, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 14,
    flash: 0.65,
    particleCount: 35,
    shockRad: 155,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    zoneRadius: 2.3,       // Balanced radius (allows enemies with good movement to evade)
    zoneDuration: 180,
    tickRate: 7,           // 7 ticks per second
    drain: {
      speed: 0.9,          // Gentle gravitational pull instead of paralyzing stun
      hp: 4.3,             // Fair drain damage per tick
      vfxLeech: 'fx_absorb_energy',
      vfxLeechColor: 0xffaa00,
      hitVfx: {
        flash: 0.1,
        particleCount: 4,
        particleTex: 'fx_absorb_dust',
        shake: 1.5,
        playSound: false
      }
    },
    buff: {
      scale: 0.008,
      maxScale: 1.8,       // Balanced visual growth
      dmgMult: 0.03,
      maxDmgMult: 9.0,     // Capped multiplier
      sound: 'absorb_ding'
    }
  },

  action: {
    cd: 220,
    count: 1,
    speed: 0,
    life: 1,
    sound: 'absorb_hum',
    traitList: ['spawnAbsorbZone']
  },

  textures: {
    base: './assets/minit_icon/absorb.png'
  },

  customTextures: {
    // Central Dark Singularity / Event Horizon Core
    fx_absorb_core: (g) => {
      // Outer crimson accretion glow
      g.beginFill(0xff2200, 0.28).drawCircle(0, 0, 18);
      // Bright orange-gold photon ring
      g.lineStyle(2, 0xffaa00, 0.9).drawCircle(0, 0, 10);
      g.lineStyle(1.5, 0xff4422, 0.85).drawCircle(0, 0, 13);
      // Dark event horizon void center
      g.lineStyle(0).beginFill(0x140005, 0.95).drawCircle(0, 0, 8).endFill();
    },

    // Gravitational Distortion Boundary Ring
    fx_absorb_ring: (g) => {
      g.lineStyle(2.5, 0xff4422, 0.55).drawCircle(0, 0, 36);
      g.lineStyle(1.2, 0xffaa00, 0.4).drawCircle(0, 0, 31);
      g.beginFill(0xff2200, 0.07).drawCircle(0, 0, 36).endFill();
    },

    // Swirling Accretion Plasma Streak
    fx_absorb_spiral: (g) => {
      g.beginFill(0xff4422, 0.85)
        .drawPolygon([-6, -1.5, 6, 0, -6, 1.5])
        .endFill();
      g.beginFill(0xffaa00, 0.95)
        .drawRect(0, -1, 4, 2)
        .endFill();
    },

    // Glowing Gravitational Ember / Debris
    fx_absorb_dust: (g) => {
      g.beginFill(0xff4422, 0.6).drawCircle(0, 0, 3);
      g.beginFill(0xffaa00, 1.0).drawRect(-1.2, -1.2, 2.4, 2.4).endFill();
    },

    // Siphoned Life-Force Soul Orb
    fx_absorb_energy: (g) => {
      g.beginFill(0xff4422, 0.5).drawCircle(0, 0, 5);
      g.beginFill(0xffaa00, 0.95).drawCircle(0, 0, 3);
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 1.5).endFill();
    },

    // Power-Up Crimson-Gold Aura Wisp on Owner
    fx_absorb_buff_aura: (g) => {
      g.beginFill(0xff4422, 0.8).drawPolygon([0, -5, 3, 2, 0, 5, -3, 2]);
      g.beginFill(0xffdd44, 0.95).drawPolygon([0, -3, 1.5, 1, 0, 3, -1.5, 1]).endFill();
    }
  },

  customAudio: {
    // Deep ominous gravitational singularity drone
    absorb_hum: {
      t: 'sawtooth',
      f0: 70,
      f1: 210,
      f2: 48,
      v: 0.22,
      d: 0.65,
      ramp: 'lin_exp',
      throttle: 0.15
    },
    // Vacuum implosion thud on vortex spawn
    absorb_implode: {
      noise: true,
      d: 0.38,
      fType: 'lowpass',
      f0: 950,
      f1: 42,
      v: 0.32,
      oF0: 150,
      oF1: 32,
      throttle: 0.1
    },
    // Harmonic power-absorption chime when draining & growing
    absorb_ding: {
      t: 'sine',
      f0: 587.33,
      seq: [783.99, 1174.66],
      v: 0.09,
      d: 0.14,
      ramp: 'exp',
      throttle: 0.08
    },
    // Subtle dark gravitational pulse while vortex is active
    absorb_pulse: {
      t: 'triangle',
      f0: 130,
      f1: 52,
      v: 0.1,
      d: 0.16,
      ramp: 'exp',
      throttle: 0.12
    }
  },

  customTraits: {
    spawnAbsorbZone: (e, a) => {
      e.dead = true;
      const tgt = a.getValidTarget(e.p.ownerId, { type: 'closest_enemy' });
      if (!tgt) return;

      const tPX = tgt.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const tPY = tgt.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Gravitational implosion feedback on deployment
      AudioSys.play('absorb_implode');
      a.shake = Math.max(a.shake, 6);
      a.fxPool.spawnShockwave(tPX, tPY, 0xff4422, e.p.payload.zoneRadius * CFG.GRID.TS * 1.15, 4);
      a.fxPool.spawnShockwave(tPX, tPY, 0xffaa00, e.p.payload.zoneRadius * CFG.GRID.TS * 0.65, 3);

      a.spawnEnt({
        x: tgt.x,
        y: tgt.y,
        l: e.p.payload.zoneDuration,
        traits: ['drainEnemyStats', 'buffOwnerStats', 'absorbVortexVisual', 'ageLife'],
        p: { ownerId: e.p.ownerId, color: e.p.color, payload: e.p.payload }
      });
    },

    absorbVortexVisual: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const radPx = e.p.payload.zoneRadius * CFG.GRID.TS;

      // Render outer boundary ring & dark singularity event horizon core
      a.fxPool.spawnPhysics('fx_absorb_ring', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff, 0.85);
      a.fxPool.spawnPhysics('fx_absorb_core', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff, 0.95);

      // Periodic gravitational pulse ripple & low bass hum
      if (e.l % 24 === 0) {
        AudioSys.play('absorb_pulse', 0.8);
        a.fxPool.spawnShockwave(pX, pY, 0xff4422, radPx * 0.95, 3);
      }

      // Swirling accretion disk particles spiraling into the singularity
      if (e.l % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          const ang = FastMath.rand() * 6.28;
          const distRatio = FastMath.randRange(0.55, 1.05);
          const spawnDist = radPx * distRatio;
          const startX = pX + Math.cos(ang) * spawnDist;
          const startY = pY + Math.sin(ang) * spawnDist;

          // Combine inward pull + tangential swirl for true vortex motion
          const inwardAngle = ang + Math.PI + 0.42;
          const speed = (spawnDist / 13) * FastMath.randRange(0.85, 1.15);

          a.fxPool.spawnPhysics(
            i === 0 ? 'fx_absorb_spiral' : 'fx_absorb_dust',
            startX,
            startY,
            Math.cos(inwardAngle) * speed,
            Math.sin(inwardAngle) * speed,
            13,
            0.9,
            0.9,
            true,
            i === 0 ? 0xffaa00 : 0xff4422
          );
        }
      }

      // Extra siphon & power-up aura VFX when actively draining an enemy
      if (e.p.leechSuccess) {
        const owner = a.playerMap?.[e.p.ownerId] || a.players.find((pl) => pl.id === e.p.ownerId);
        if (owner && owner.hp > 0) {
          const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

          // Rising crimson-gold power wisps around Absorb owner
          if (e.l % 3 === 0) {
            a.fxPool.spawnPhysics(
              'fx_absorb_buff_aura',
              oX + FastMath.randRange(-10, 10),
              oY + FastMath.randRange(-6, 8),
              FastMath.randRange(-0.4, 0.4),
              -FastMath.randRange(1.4, 2.6),
              12,
              0.9,
              0.9,
              true,
              0xffaa00
            );
          }

          // Stream of siphoned energy orbs from the vortex core to owner
          if (e.l % 4 === 0) {
            const toOwnerAng = Math.atan2(oY - pY, oX - pX) + FastMath.randRange(-0.2, 0.2);
            const orbSpd = FastMath.randRange(4.5, 6.5);
            a.fxPool.spawnPhysics(
              'fx_absorb_energy',
              pX,
              pY,
              Math.cos(toOwnerAng) * orbSpd,
              Math.sin(toOwnerAng) * orbSpd,
              14,
              0.96,
              0.96,
              true,
              0xffdd44
            );
          }
        }
      }
    }
  }
};
