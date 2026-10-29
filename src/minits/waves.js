// ============================================================
// MINIT: WAVES (ES Module)
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
    shake: 8,
    flash: 0.5,
    particleCount: 25,
    shockRad: 130,
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
        dmg: 20,
        tick: 8,
        vfxTex: 'fx_paralysis_spark',
        hitVfx: { particleCount: 2, playSound: false, showText: true, shake: 0, flash: 0, hitStop: 1 }
      }
    }
  },

  action: { cd: 140, count: 1, speed: 0, life: 60, traitList: ['wavesChargePhase'] },

  textures: {
    base: './assets/minit_icon/waves.png'
  },

  customTextures: {
    icon_paralysis: (g) => {
      g.beginFill(0x009dd1)
        .drawRect(0, 0, 12, 12)
        .beginFill(0xffff00)
        .moveTo(6, 2)
        .lineTo(8, 6)
        .lineTo(6, 6)
        .lineTo(6, 10)
        .lineTo(4, 6)
        .lineTo(6, 6)
        .endFill();
    },
    fx_waves_eq: (g) => g.beginFill(0x009dd1).drawRect(-1, -4, 2, 8).endFill(),
    fx_paralysis_spark: (g) => g.beginFill(0xffff00).drawRect(-1, -1, 2, 2).endFill()
  },

  customAudio: {
    waves_beat: { t: 'square', f0: 100, f1: 40, v: 0.15, d: 0.1, ramp: 'exp', throttle: 0 },
    waves_fast_beat: { t: 'square', f0: 180, f1: 50, v: 0.2, d: 0.05, ramp: 'exp', throttle: 0 },
    waves_melody: {
      t: 'sine',
      f0: 440,
      seq: [554.37, 659.25, 880],
      v: 0.2,
      d: 0.6,
      ramp: 'lin_exp',
      throttle: 0
    },
    waves_zap: { t: 'sawtooth', f0: 600, f1: 200, v: 0.05, d: 0.1, ramp: 'exp', throttle: 0.05 }
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

      if (e.l % 12 === 0 && e.l > 0) {
        AudioSys.play('waves_beat');
        const bS = owner.baseScale || 1.0;
        owner.aS.tX = bS * 1.5;
        owner.aS.tY = bS * 1.5;

        for (let i = 0; i < 4; i++) {
          const ang = (Math.PI / 2) * i;
          a.fxPool.spawnPhysics(
            'fx_waves_eq',
            pX + Math.cos(ang) * 8,
            pY + Math.sin(ang) * 8,
            Math.cos(ang) * 2,
            Math.sin(ang) * 2,
            8,
            0.8,
            0.8,
            true,
            0x009dd1
          );
        }
      }

      if (e.l === 5) {
        AudioSys.play('waves_fast_beat');
      }

      if (--e.l <= 0) {
        e.dead = true;
        AudioSys.play('waves_melody');

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
      if (e.l % 2 === 0) {
        a.fxPool.spawnShockwave(pX, pY, e.p.color, currentRad * CFG.GRID.TS, 4);
      }

      a.players.forEach((p) => {
        if (p.id !== e.p.ownerId && p.hp > 0 && !e.p.hitSet.has(p.id)) {
          if (FastMath.dist(p.x, p.y, e.x, e.y) <= currentRad) {
            e.p.hitSet.add(p.id);
            const debuff = e.p.payload.debuff;
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

      if (e.l % 5 === 0) {
        const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        a.fxPool.spawnPhysics(
          pay.vfxTex,
          pX + FastMath.randRange(-10, 10),
          pY + FastMath.randRange(-10, 10),
          0,
          -1,
          10,
          1,
          1,
          true,
          0xffffff
        );
      }

      if (e.l % pay.tick === 0) {
        AudioSys.play('waves_zap');
        a.damagePlayer(tgt.id, { dmg: pay.dmg * dMult, hitVfx: pay.hitVfx }, e.p.color);
      }

      if (--e.l <= 0) {
        tgt.debuffs[pay.id] = false;
        e.dead = true;
      }
    }
  }
};
