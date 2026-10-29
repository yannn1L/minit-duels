// ============================================================
// MINIT: MURASAKI / GOJO (ES Module - Hollow Purple)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_MURASAKI = {
  id: 'murasaki',
  name: 'Gojo',
  color: 0x9900ff,
  desc: 'Murasaki. Creates Red and Blue singularities, merging them into an unstoppable Hollow Purple beam.',
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
    dmg: 25
  },

  action: { cd: 360, count: 1, speed: 0, life: 180, traitList: ['hollowPurpleSequence'] },

  textures: {
    base: './assets/minit_icon/murasaki.png'
  },

  customTextures: {
    fx_murasaki_blue: (g) =>
      g.beginFill(0x0044ff).drawCircle(0, 0, 10).beginFill(0xffffff).drawCircle(0, 0, 3).endFill(),
    fx_murasaki_red: (g) =>
      g.beginFill(0xff0044).drawCircle(0, 0, 10).beginFill(0xffffff).drawCircle(0, 0, 3).endFill(),
    fx_murasaki_beam: (g) => {
      g.beginFill(0xcc66ff, 0.35)
        .drawCircle(0, 0, 14)
        .beginFill(0x9900ff, 0.75)
        .drawCircle(0, 0, 7)
        .beginFill(0xffffff, 1.0)
        .drawCircle(0, 0, 3.5)
        .endFill();
    },
    fx_murasaki_spark: (g) => g.beginFill(0xdd88ff).drawRect(-1.5, -1.5, 3, 3).endFill(),
    fx_murasaki_lightning: (g) =>
      g.lineStyle(2, 0xffffff, 1).moveTo(0, -4).lineTo(2, 0).lineTo(-2, 2).lineTo(0, 6).endFill()
  },

  customAudio: {
    murasaki_charge: { t: 'sawtooth', f0: 40, f1: 1200, v: 0.2, d: 1.5, ramp: 'exp' },
    murasaki_merge: { t: 'square', f0: 1500, f1: 30, v: 0.4, d: 0.3, ramp: 'exp' },
    murasaki_fire: { t: 'sawtooth', f0: 3000, f1: 400, f2: 50, v: 0.3, d: 1.2, ramp: 'lin_exp' },
    murasaki_hit: {
      t: 'square',
      f0: () => 1000 + Math.random() * 800,
      f1: 100,
      v: 0.15,
      d: 0.08,
      ramp: 'exp',
      throttle: 0.05
    }
  },

  customTraits: {
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
      const elapsed = e.maxL - e.l;

      // --------------------------------------------------
      // PHASE 1: FORMING ORBS (0 - 80 frames)
      // --------------------------------------------------
      if (elapsed < 80) {
        const offset = 28;
        const leftX = pX + Math.cos(angle - Math.PI / 2) * offset;
        const leftY = pY + Math.sin(angle - Math.PI / 2) * offset;
        const rightX = pX + Math.cos(angle + Math.PI / 2) * offset;
        const rightY = pY + Math.sin(angle + Math.PI / 2) * offset;

        a.fxPool.spawnPhysics('fx_murasaki_blue', leftX, leftY, 0, 0, 2, 1, 1, false, 0xffffff);
        a.fxPool.spawnPhysics('fx_murasaki_red', rightX, rightY, 0, 0, 2, 1, 1, false, 0xffffff);

        if (e.l % 3 === 0) {
          const a1 = Math.random() * Math.PI * 2;
          a.fxPool.spawnPhysics(
            'fx_murasaki_spark',
            leftX + Math.cos(a1) * 16,
            leftY + Math.sin(a1) * 16,
            -Math.cos(a1) * 2,
            -Math.sin(a1) * 2,
            6,
            1,
            1,
            false,
            0x0088ff
          );
          const a2 = Math.random() * Math.PI * 2;
          a.fxPool.spawnPhysics(
            'fx_murasaki_spark',
            rightX + Math.cos(a2) * 16,
            rightY + Math.sin(a2) * 16,
            -Math.cos(a2) * 2,
            -Math.sin(a2) * 2,
            6,
            1,
            1,
            false,
            0xff0044
          );
        }
      }
      // --------------------------------------------------
      // PHASE 2: MERGE (80 - 100 frames)
      // --------------------------------------------------
      else if (elapsed < 100) {
        const progress = (elapsed - 80) / 20;
        const offset = 28 * (1 - Math.pow(progress, 2));

        const leftX = pX + Math.cos(angle - Math.PI / 2) * offset;
        const leftY = pY + Math.sin(angle - Math.PI / 2) * offset;
        const rightX = pX + Math.cos(angle + Math.PI / 2) * offset;
        const rightY = pY + Math.sin(angle + Math.PI / 2) * offset;

        a.fxPool.spawnPhysics('fx_murasaki_blue', leftX, leftY, 0, 0, 2, 1, 1, false, 0xffffff);
        a.fxPool.spawnPhysics('fx_murasaki_red', rightX, rightY, 0, 0, 2, 1, 1, false, 0xffffff);

        if (elapsed === 99) {
          AudioSys.play('murasaki_merge');
          a.triggerFlash(0.9);
          a.shake = Math.max(a.shake, 12);
        }
      }
      // --------------------------------------------------
      // PHASE 3: MURASAKI BEAM! (100 - 180 frames)
      // --------------------------------------------------
      else {
        if (elapsed === 100) {
          AudioSys.play('murasaki_fire');
          a.hitStop = 8;
        }

        owner.x -= Math.cos(angle) * 0.03;
        owner.y -= Math.sin(angle) * 0.03;

        // Optimized beam: 20 beam points spaced 24px apart instead of 40 points
        // Eliminates the 3,200 particle flood while looking equally luminous!
        const beamSteps = 20;
        const stepDist = 24;
        for (let i = 1; i <= beamSteps; i++) {
          const bx = pX + Math.cos(angle) * (i * stepDist);
          const by = pY + Math.sin(angle) * (i * stepDist);

          a.fxPool.spawnPhysics('fx_murasaki_beam', bx, by, 0, 0, 2, 1, 1, false, 0xffffff);

          if (Math.random() > 0.85) {
            const lx = bx + FastMath.randRange(-16, 16);
            const ly = by + FastMath.randRange(-16, 16);
            a.fxPool.spawnPhysics('fx_murasaki_lightning', lx, ly, 0, 0, 3, 1, 1, true, 0xffffff);
          }
        }

        // Line collision damage
        if (e.l % 4 === 0) {
          const dMult = owner.dmgMult || 1.0;
          a.players.forEach((p) => {
            if (p.id !== owner.id && p.hp > 0) {
              const p_pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const p_pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

              const dist = Math.abs(Math.sin(angle) * (pX - p_pX) - Math.cos(angle) * (pY - p_pY));
              const dot = Math.cos(angle) * (p_pX - pX) + Math.sin(angle) * (p_pY - pY);
              if (dist <= 26 && dot > 0) {
                a.damagePlayer(
                  p.id,
                  {
                    dmg: e.p.payload.dmg * dMult,
                    hitVfx: {
                      shake: 8,
                      flash: 0.2,
                      particleCount: 4,
                      particleTex: 'fx_murasaki_spark',
                      hitStop: 2,
                      sound: 'murasaki_hit'
                    }
                  },
                  0x9900ff
                );
              }
            }
          });
        }
      }

      if (--e.l <= 0) e.dead = true;
    }
  }
};
