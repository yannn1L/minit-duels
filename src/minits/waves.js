// ============================================================
// MINIT: WAVES (ES Module - Enhanced Sonic & High-Voltage VFX/SFX)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_WAVES = {
  id: 'waves',
  name: 'WAVES',
  color: 0x009dd1,
  desc: 'Charges with a rhythmic beat, melody-infused shockwave.',
  stats: { hp: 1100, speed: 0.12 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 12,
    flash: 0.6,
    particleCount: 32,
    shockRad: 150,
    sound: 'explosion',
    hitStop: 20
  },

  payload: {
    maxRadius: 8.0,
    debuff: {
      id: 'paralysis',
      duration: 50,
      trait: 'wavesParalysisStatus',
      payload: {
        id: 'paralysis',
        icon: 'icon_paralysis',
        dmg: 23.5,
        tick: 8,
        vfxTex: 'fx_paralysis_spark',
        hitVfx: {
          particleCount: 5,
          particleTex: 'fx_paralysis_spark',
          playSound: false,
          showText: true,
          shake: 2,
          flash: 0.06,
          hitStop: 1
        }
      }
    }
  },

  action: { cd: 130, count: 1, speed: 0, life: 60, traitList: ['wavesChargePhase'] },

  textures: {
    base: './assets/minit_icon/waves.png'
  },

  customTextures: {
    // High-contrast status icon
    icon_paralysis: (g) => {
      g.beginFill(0x002b3d)
        .drawRoundedRect(0, 0, 12, 12, 2)
        .lineStyle(1, 0x00e5ff, 0.9)
        .drawRoundedRect(0, 0, 12, 12, 2)
        .lineStyle(0)
        .beginFill(0xffff00)
        .moveTo(7, 1)
        .lineTo(3, 6.5)
        .lineTo(6, 6.5)
        .lineTo(5, 11)
        .lineTo(9, 5.5)
        .lineTo(6, 5.5)
        .closePath()
        .endFill();
    },

    // Glowing Equalizer Spectrum Bar
    fx_waves_eq: (g) => {
      g.beginFill(0x009dd1, 0.45).drawRoundedRect(-2.5, -6, 5, 12, 1.5);
      g.beginFill(0x00e5ff, 0.95).drawRect(-1.5, -5, 3, 10);
      g.beginFill(0xffffff, 1.0).drawRect(-1.5, -5, 3, 2.5);
      g.endFill();
    },

    // Musical Note / Acoustic Glyph
    fx_waves_note: (g) => {
      g.beginFill(0x00ffff, 0.95)
        .drawCircle(-2, 3, 2.5)
        .drawRect(-0.5, -4, 1.8, 7)
        .drawPolygon([0, -4, 5, -2.5, 5, -0.5, 0, -2])
        .endFill();
      g.beginFill(0xffffff, 0.9).drawCircle(-2, 2.5, 1).endFill();
    },

    // Concentric Sub-Bass Speaker Aura Ring
    fx_waves_aura_ring: (g) => {
      g.lineStyle(2, 0x00e5ff, 0.75).drawCircle(0, 0, 16);
      g.lineStyle(1, 0xffffff, 0.5).drawCircle(0, 0, 11);
      g.beginFill(0x009dd1, 0.15).drawCircle(0, 0, 16).endFill();
    },

    // Sonic Crescent Wave Arc
    fx_waves_sonic_arc: (g) => {
      g.lineStyle(2.5, 0x00ffff, 0.9)
        .arc(0, 0, 8, -0.7, 0.7);
      g.lineStyle(1.2, 0xffffff, 0.95)
        .arc(0, 0, 6, -0.5, 0.5);
    },

    // Jagged High-Voltage Paralysis Lightning Bolt
    fx_paralysis_arc: (g) => {
      g.lineStyle(2.2, 0xffff00, 1.0)
        .moveTo(-7, -8)
        .lineTo(-1, -2)
        .lineTo(-4, 1)
        .lineTo(3, 4)
        .lineTo(7, 9);
      g.lineStyle(1, 0xffffff, 0.95)
        .moveTo(-7, -8)
        .lineTo(-1, -2)
        .lineTo(3, 4);
    },

    // Crisp Electric Spark
    fx_paralysis_spark: (g) => {
      g.beginFill(0x00ffff, 0.5).drawCircle(0, 0, 3.5);
      g.beginFill(0xffff00, 1.0).moveTo(0, -3).lineTo(3, 0).lineTo(0, 3).lineTo(-3, 0).closePath();
      g.beginFill(0xffffff, 1.0).drawRect(-1, -1, 2, 2).endFill();
    }
  },

  customAudio: {
    // Deep punchy electronic kick beat
    waves_beat: {
      t: 'triangle',
      f0: 170,
      f1: 36,
      v: 0.24,
      d: 0.14,
      ramp: 'exp',
      throttle: 0.02
    },
    // High-energy snare/synth build-up pulse
    waves_fast_beat: {
      t: 'sawtooth',
      f0: 240,
      f1: 580,
      v: 0.22,
      d: 0.08,
      ramp: 'exp',
      throttle: 0.02
    },
    // Euphoric harmonic chord arpeggio on shockwave release
    waves_melody: {
      t: 'sawtooth',
      f0: 440,
      seq: [554.37, 659.25, 880, 1108.73, 1318.51],
      v: 0.22,
      d: 0.65,
      ramp: 'lin_exp',
      throttle: 0
    },
    // Heavy sub-bass drop layered with the melody release
    waves_bass_drop: {
      noise: true,
      d: 0.48,
      fType: 'lowpass',
      f0: 1100,
      f1: 35,
      v: 0.42,
      oF0: 190,
      oF1: 28,
      throttle: 0.05
    },
    // Sonic impact when wave catches an enemy
    waves_hit_drop: {
      t: 'square',
      f0: 520,
      f1: 65,
      v: 0.2,
      d: 0.15,
      ramp: 'exp',
      throttle: 0.04
    },
    // High-voltage electric snap on paralysis tick
    waves_zap: {
      t: 'sawtooth',
      f0: () => 950 + Math.random() * 550,
      f1: 110,
      v: 0.11,
      d: 0.09,
      ramp: 'exp',
      throttle: 0.04
    }
  },

  customTraits: {
    wavesChargePhase: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      e.x = owner.x;
      e.y = owner.y;
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const bS = owner.baseScale || 1.0;

      // Ambient acoustic speaker ring around Waves while charging
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics('fx_waves_aura_ring', pX, pY, 0, 0, 3, 1, 1, false, 0x00e5ff, 0.75);
      }

      // Inward-pulling bass energy particles during charge build-up
      if (e.l % 2 === 0) {
        const inAng = FastMath.rand() * 6.28;
        const dist = FastMath.randRange(18, 34);
        a.fxPool.spawnPhysics(
          'fx_waves_eq',
          pX + Math.cos(inAng) * dist,
          pY + Math.sin(inAng) * dist,
          -Math.cos(inAng) * 2.2,
          -Math.sin(inAng) * 2.2,
          9,
          0.88,
          0.88,
          true,
          0x00ffff,
          0.7
        );
      }

      // Rhythmic Beat Pulse every 12 frames
      if (e.l % 12 === 0 && e.l > 0) {
        AudioSys.play('waves_beat');
        owner.aS.tX = bS * 1.55;
        owner.aS.tY = bS * 0.72;
        a.shake = Math.max(a.shake, 2.5);

        // Mini beat shockwave ripple
        a.fxPool.spawnShockwave(pX, pY, 0x00e5ff, 44, 2);

        // 8-way Equalizer Spectrum Burst
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI / 4) * i + (e.l * 0.05);
          const spd = i % 2 === 0 ? 2.6 : 1.8;
          a.fxPool.spawnPhysics(
            'fx_waves_eq',
            pX + Math.cos(ang) * 8,
            pY + Math.sin(ang) * 8,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd,
            11,
            0.84,
            0.84,
            true,
            i % 2 === 0 ? 0x00ffff : 0x009dd1
          );
        }

        // Floating musical notes on each beat
        for (let n = 0; n < 2; n++) {
          const nAng = FastMath.randRange(-2.4, -0.7);
          a.fxPool.spawnPhysics(
            'fx_waves_note',
            pX + FastMath.randRange(-8, 8),
            pY - 4,
            Math.cos(nAng) * 1.6,
            Math.sin(nAng) * 1.8 - 0.8,
            16,
            0.92,
            0.92,
            true,
            0x00ffff
          );
        }
      }

      // Rapid pre-drop riser in the final 12 frames
      if (e.l <= 12 && e.l % 3 === 0) {
        AudioSys.play('waves_fast_beat');
        owner.aS.tX = bS * 0.8;
        owner.aS.tY = bS * 1.45;
        a.shake = Math.max(a.shake, 3.5);
      }

      // BASS DROP & SHOCKWAVE RELEASE
      if (--e.l <= 0) {
        e.dead = true;
        AudioSys.play('waves_melody');
        AudioSys.play('waves_bass_drop');

        owner.aS.tX = bS * 1.75;
        owner.aS.tY = bS * 0.65;
        a.triggerFlash(0.35);
        a.shake = Math.max(a.shake, 11);

        // Initial dual-color drop burst
        a.fxPool.spawnShockwave(pX, pY, 0xffffff, 85, 5);
        a.fxPool.spawnShockwave(pX, pY, 0x00ffff, 120, 4);

        for (let i = 0; i < 12; i++) {
          const bAng = (Math.PI * 2 * i) / 12;
          a.fxPool.spawnPhysics(
            'fx_waves_note',
            pX,
            pY,
            Math.cos(bAng) * 4.2,
            Math.sin(bAng) * 4.2,
            18,
            0.88,
            0.88,
            true,
            i % 3 === 0 ? 0xffff00 : 0x00ffff
          );
        }

        a.spawnEnt({
          x: e.x,
          y: e.y,
          l: 40,
          traits: ['wavesShockwaveExpansion'],
          p: { ownerId: e.p.ownerId, color: e.p.color, payload: e.p.payload, hitSet: new Set() }
        });
      }
    },

    wavesShockwaveExpansion: (e, a) => {
      const maxRad = e.p.payload.maxRadius;
      const progress = 1.0 - e.l / 20;
      const currentRad = maxRad * progress;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const radPx = Math.max(8, currentRad * CFG.GRID.TS);

      // Multi-layered harmonic shockwave rings
      if (e.l % 2 === 0) {
        a.fxPool.spawnShockwave(pX, pY, e.p.color, radPx, 4);
        if (e.l % 4 === 0) {
          a.fxPool.spawnShockwave(pX, pY, 0x00ffff, radPx * 0.88, 3);
        }
      }

      // Sonic wave arcs & equalizer sparks riding the shockwave perimeter
      if (currentRad > 0.4 && currentRad <= maxRad) {
        for (let i = 0; i < 3; i++) {
          const waveAng = FastMath.rand() * 6.28;
          const rimX = pX + Math.cos(waveAng) * (radPx * 0.75);
          const rimY = pY + Math.sin(waveAng) * (radPx * 0.75);
          a.fxPool.spawnPhysics(
            i === 0 ? 'fx_waves_sonic_arc' : 'fx_waves_eq',
            rimX,
            rimY,
            Math.cos(waveAng) * 2.4,
            Math.sin(waveAng) * 2.4,
            8,
            0.86,
            0.86,
            true,
            i === 0 ? 0x00ffff : 0x009dd1
          );
        }
      }

      a.players.forEach((p) => {
        if (p.id !== e.p.ownerId && p.hp > 0 && !e.p.hitSet.has(p.id)) {
          if (FastMath.dist(p.x, p.y, e.x, e.y) <= currentRad) {
            e.p.hitSet.add(p.id);
            const debuff = e.p.payload.debuff;

            // Sonic impact feedback on target catch
            const tPX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
            const tPY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
            AudioSys.play('waves_hit_drop');
            a.fxPool.spawnShockwave(tPX, tPY, 0xffff00, 48, 3);
            for (let s = 0; s < 8; s++) {
              const sAng = (Math.PI * 2 * s) / 8;
              a.fxPool.spawnPhysics(
                'fx_paralysis_spark',
                tPX,
                tPY,
                Math.cos(sAng) * 3.5,
                Math.sin(sAng) * 3.5,
                12,
                0.85,
                0.85,
                true,
                0xffff00
              );
            }

            if (!p.debuffs[debuff.payload.id]) {
              p.debuffs[debuff.payload.id] = true;
              a.spawnEnt({
                x: p.x,
                y: p.y,
                l: debuff.duration,
                traits: [debuff.trait],
                p: { targetId: p.id, ownerId: e.p.ownerId, color: e.p.color, payload: debuff.payload }
              });
            }
          }
        }
      });

      if (--e.l <= 0) e.dead = true;
    },

    wavesParalysisStatus: (e, a) => {
      const tgt = a.players.find((p) => p.id === e.p.targetId);
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;
      const pay = e.p.payload;

      if (!tgt || tgt.hp <= 0) {
        if (tgt) tgt.debuffs[pay.id] = false;
        e.dead = true;
        return;
      }

      e.x = tgt.x;
      e.y = tgt.y;
      tgt.activeStatuses.add(pay.icon);

      tgt.dx = 0;
      tgt.dy = 0;
      tgt.t = Math.max(0, tgt.t - 1);

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // High-voltage crackling lightning arcs & sparks around paralyzed target
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics(
          'fx_paralysis_arc',
          pX + FastMath.randRange(-9, 9),
          pY + FastMath.randRange(-9, 9),
          FastMath.randRange(-0.5, 0.5),
          FastMath.randRange(-0.8, 0.4),
          5,
          0.9,
          0.9,
          true,
          e.l % 6 === 0 ? 0xffff00 : 0x00ffff
        );
      }

      if (e.l % 4 === 0) {
        a.fxPool.spawnPhysics(
          pay.vfxTex,
          pX + FastMath.randRange(-11, 11),
          pY + FastMath.randRange(-11, 11),
          FastMath.randRange(-1.2, 1.2),
          -FastMath.randRange(1.0, 2.2),
          10,
          0.9,
          0.9,
          true,
          0xffffff
        );
      }

      if (e.l % pay.tick === 0) {
        AudioSys.play('waves_zap');
        // Paralyzed muscle-spasm squash jitter
        const tBS = tgt.baseScale || 1.0;
        tgt.aS.tX = tBS * 1.22;
        tgt.aS.tY = tBS * 0.82;
        a.fxPool.spawnShockwave(pX, pY, 0xffff00, 28, 2);
        a.damagePlayer(tgt.id, { dmg: pay.dmg * dMult, hitVfx: pay.hitVfx }, e.p.color);
      }

      if (--e.l <= 0) {
        tgt.debuffs[pay.id] = false;
        e.dead = true;
      }
    }
  }
};
