// ============================================================
// ARENA & COMBAT SIMULATION (ES Module - Crisp HD Pixel Edition)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { AudioSys } from './AudioSys.js';
import { VFXPool } from './VFXPool.js';
import { MinitEngine } from './Registry.js';

export class Arena extends PIXI.Container {
  constructor(pIds, texturesRef, options = {}) {
    super();
    this.textures = texturesRef || {};
    this.isHeadless = options.headless || false;
    this.shake = 0;
    this.hitStop = 0;
    const AW = CFG.GRID.COLS * CFG.GRID.TS;
    const AH = CFG.GRID.ROWS * CFG.GRID.TS;

    this.view = new PIXI.Container();
    this.addChild(this.view);

    // Background Arena Board with crisp borders (No outline shaders)
    const bg = new PIXI.Graphics()
      .beginFill(CFG.ARENA.BG_COLOR, CFG.ARENA.BG_ALPHA)
      .lineStyle(2, CFG.ARENA.GUARD_COLOR, 1)
      .drawRect(-2, -2, AW + 4, AH + 4)
      .endFill();

    // Arena Corner Guards
    const gL = 16;
    const gT = 4;
    bg.beginFill(CFG.ARENA.GUARD_COLOR)
      .drawRect(-gT, -gT, gL, gT)
      .drawRect(-gT, -gT, gT, gL)
      .drawRect(AW + gT - gL, -gT, gL, gT)
      .drawRect(AW, -gT, gT, gL)
      .drawRect(-gT, AH, gL, gT)
      .drawRect(-gT, AH + gT - gL, gT, gL)
      .drawRect(AW + gT - gL, AH, gL, gT)
      .drawRect(AW, AH + gT - gL, gT, gL)
      .endFill();

    this.view.addChild(bg);

    // Arena Interior Layer
    const mask = new PIXI.Graphics().beginFill(0xffffff).drawRect(0, 0, AW, AH).endFill();
    this.view.addChild(mask);
    this.layer = new PIXI.Container();
    this.layer.mask = mask;
    this.view.addChild(this.layer);

    // Grid Floor
    const grid = new PIXI.Graphics().lineStyle(1, CFG.ARENA.GRID_COLOR, CFG.ARENA.GRID_ALPHA);
    for (let x = 1; x < CFG.GRID.COLS; x++) {
      grid.moveTo(x * CFG.GRID.TS, 0).lineTo(x * CFG.GRID.TS, AH);
    }
    for (let y = 1; y < CFG.GRID.ROWS; y++) {
      grid.moveTo(0, y * CFG.GRID.TS).lineTo(AW, y * CFG.GRID.TS);
    }
    this.layer.addChild(grid);

    this.fxU = new PIXI.Container();
    this.layer.addChild(this.fxU);

    // Players - 100% shader-free for crystal-clear HD pixel sprites
    this.players = [];
    pIds.forEach((id, idx) => {
      const md = MinitEngine.Registry.minits[id];
      const tex = this.textures[`minit_${id}_base`];
      const spr = new PIXI.Sprite(tex || PIXI.Texture.WHITE);
      spr.anchor.set(0.5);
      this.layer.addChild(spr);

      const sX = idx === 0 ? 3 : CFG.GRID.COLS - 4;
      const sY = Math.floor(CFG.GRID.ROWS / 2);
      const sSpX = idx === 0 ? md.stats.speed : -md.stats.speed;

      this.players.push({
        id: `P${idx + 1}`,
        def: md,
        hp: md.stats.hp,
        maxHp: md.stats.hp,
        x: sX,
        y: sY,
        dx: sSpX,
        dy: md.stats.speed,
        t: 0,
        spr: spr,
        baseScale: 1.0,
        aS: { x: 1, y: 1, tX: 1, tY: 1 },
        fT: 0,
        activeStatuses: new Set(),
        debuffs: {}
      });
    });

    this.fxO = new PIXI.Container();
    this.layer.addChild(this.fxO);
    this.fxPool = new VFXPool(this.fxU, this.fxO, this.textures);

    this.actE = [];
    this.deadE = Array.from({ length: 300 }, () => ({
      active: false,
      dead: false,
      x: 0,
      y: 0,
      curX: 0,
      curY: 0,
      dx: 0,
      dy: 0,
      l: 0,
      maxL: 0,
      traits: [],
      p: {}
    }));

    this.fA = 0;
    this.sF = new PIXI.Graphics().beginFill(0xffffff).drawRect(0, 0, AW, AH).endFill();
    this.sF.alpha = 0;
    this.view.addChild(this.sF);
  }

  getPixelCoords(gx, gy) {
    return {
      px: gx * CFG.GRID.TS + CFG.GRID.HALF_TS,
      py: gy * CFG.GRID.TS + CFG.GRID.HALF_TS
    };
  }

  getValidTarget(oId, rule) {
    const lg = MinitEngine.Registry.targeting[rule?.type];
    return lg ? lg(this.players.find((p) => p.id === oId), this) : null;
  }

  spawnEnt(props) {
    if (this.deadE.length === 0) return;
    const e = this.deadE.pop();
    Object.assign(e, {
      active: true,
      dead: false,
      x: props.x ?? 0,
      y: props.y ?? 0,
      curX: props.x ?? 0,
      curY: props.y ?? 0,
      dx: props.dx ?? 0,
      dy: props.dy ?? 0,
      l: props.l ?? 0,
      maxL: props.maxL ?? props.l ?? 0,
      traits: props.traits || [],
      p: props.p || {}
    });
    this.actE.push(e);
  }

  triggerFlash(a = 0.5) {
    this.fA = Math.max(this.fA, a);
  }

  // Modular & Flexible Knockback System for any Minit
  applyKnockback(targetId, { fromX, fromY, forceX, forceY, force = 0.65, shake = 6, playSound = false }) {
    const p = this.players.find((pl) => pl.id === targetId);
    if (!p || p.hp <= 0) return;

    let kx = forceX || 0;
    let ky = forceY || 0;

    // Calculate radial knockback away from source coordinates if provided
    if (fromX !== undefined && fromY !== undefined) {
      const angle = Math.atan2(p.y - fromY, p.x - fromX);
      kx = Math.cos(angle) * force;
      ky = Math.sin(angle) * force;
    }

    // Apply high-velocity knockback impulse to the player
    p.dx = kx;
    p.dy = ky;

    // Visual juice feedback
    const bS = p.baseScale || 1.0;
    p.aS.tX = bS * 0.7;
    p.aS.tY = bS * 1.35;
    if (shake) this.shake = Math.max(this.shake, shake);
    if (playSound) AudioSys.play('hit', 0.8);
  }

  damagePlayer(pid, payload, fxC) {
    const p = this.players.find((pl) => pl.id === pid);
    if (!p || p.hp <= 0) return;

    p.hp = Math.max(0, p.hp - payload.dmg);
    const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
    if (!this.isHeadless) {
      if (vfx.showText !== false) this.fxPool.spawnDmgText(pX, pY, payload.dmg, fxC);
      if (vfx.playSound !== false) AudioSys.play(vfx.sound || 'hit', 0.6);
    }

    // Modular knockback handling from attack payload
    if (payload.knockback) {
      const kb = payload.knockback;
      this.applyKnockback(pid, {
        fromX: kb.fromX,
        fromY: kb.fromY,
        forceX: kb.forceX,
        forceY: kb.forceY,
        force: kb.force ?? 0.7,
        shake: kb.shake ?? vfx.shake ?? 6
      });
    }

    const bS = p.baseScale || 1.0;
    p.aS.tX = bS * CFG.JUICE.HIT.tX;
    p.aS.tY = bS * CFG.JUICE.HIT.tY;

    if (p.fT <= 0) p.fT = vfx.unitFlashDur ?? CFG.JUICE.HIT_FLASH_DUR;
    if (vfx.shake) this.shake = Math.max(this.shake, vfx.shake);
    if (vfx.flash) this.triggerFlash(vfx.flash);
    if (vfx.hitStop) this.hitStop = Math.max(this.hitStop, vfx.hitStop);

    if (!this.isHeadless) {
      const pC = vfx.particleCount ?? CFG.VFX.HIT.PARTICLE_COUNT;
      for (let i = 0; i < pC; i++) {
        const vx = FastMath.randRange(-CFG.VFX.HIT.BURST_FORCE, CFG.VFX.HIT.BURST_FORCE);
        const vy = FastMath.randRange(-CFG.VFX.HIT.BURST_FORCE, CFG.VFX.HIT.BURST_FORCE);
        this.fxPool.spawnPhysics(
          vfx.particleTex || CFG.VFX.HIT.DEFAULT_TEX,
          pX,
          pY,
          vx,
          vy,
          CFG.VFX.HIT.LIFE,
          0.9,
          0.9,
          true,
          fxC
        );
      }
    }

    if (vfx.debuff && !p.debuffs[vfx.debuff.payload.id]) {
      p.debuffs[vfx.debuff.payload.id] = true;
      this.spawnEnt({
        x: p.x,
        y: p.y,
        l: vfx.debuff.duration,
        traits: [vfx.debuff.trait],
        p: { targetId: p.id, color: fxC, payload: vfx.debuff.payload }
      });
    }

    if (p.hp <= 0) {
      const dVfx = p.def.deathVfx || {};
      if (!this.isHeadless) {
        AudioSys.play(dVfx.sound || 'crush');
        if (dVfx.flash) this.triggerFlash(dVfx.flash);
        if (dVfx.shake) this.shake = Math.max(this.shake, dVfx.shake);
        this.hitStop = Math.max(this.hitStop, dVfx.hitStop || CFG.JUICE.DEATH_HIT_STOP);
        this.fxPool.spawnShockwave(pX, pY, p.def.color, dVfx.shockRad || CFG.VFX.DEATH.SHOCK_RAD, 6);

        const dpC = dVfx.particleCount ?? CFG.VFX.DEATH.PARTICLE_COUNT;
        for (let i = 0; i < dpC; i++) {
          this.fxPool.spawnPhysics(
            CFG.VFX.HIT.DEFAULT_TEX,
            pX,
            pY,
            FastMath.randRange(-CFG.VFX.DEATH.BURST_FORCE, CFG.VFX.DEATH.BURST_FORCE),
            FastMath.randRange(-CFG.VFX.DEATH.BURST_FORCE, CFG.VFX.DEATH.BURST_FORCE),
            CFG.VFX.DEATH.PARTICLE_LIFE,
            0.9,
            0.9,
            true,
            p.def.color
          );
        }
      }
    }
  }

  executeAction(owner, tgt) {
    const act = owner.def.action;
    const bA = Math.atan2(tgt.y - owner.y, tgt.x - owner.x);
    if (act.sound) AudioSys.play(act.sound);

    const count = act.count || 1;
    for (let i = 0; i < count; i++) {
      const ang = bA + (act.scatterSpread ? FastMath.randRange(-act.scatterSpread, act.scatterSpread) : 0);
      this.spawnEnt({
        x: owner.x,
        y: owner.y,
        dx: Math.cos(ang) * act.speed,
        dy: Math.sin(ang) * act.speed,
        l: act.life,
        traits: act.traitList,
        p: { ownerId: owner.id, color: owner.def.color, vfx: act.vfx || {}, payload: owner.def.payload }
      });
    }
  }

  update(tS) {
    if (this.hitStop > 0) {
      this.hitStop -= tS;
    } else {
      this.tickAcc = (this.tickAcc || 0) + tS;
      let iter = 0;
      while (this.tickAcc >= 1 && iter < CFG.SIM.MAX_ITERATIONS) {
        this.tickLogic();
        this.tickAcc -= 1;
        iter++;
      }
    }
    this.updateVisuals(tS);
  }

  tickLogic() {
    this.players.forEach((p) => {
      if (p.hp <= 0) return;
      p.activeStatuses.clear();
      const w = CFG.PHYSICS.WANDER;
      const s = p.def.stats.speed;

      if (w > 0 && s > 0) {
        let a = p.dx === 0 && p.dy === 0 ? FastMath.randRange(0, Math.PI * 2) : Math.atan2(p.dy, p.dx);
        a += FastMath.randRange(-w, w);
        p.dx = Math.cos(a) * s;
        p.dy = Math.sin(a) * s;
      }

      p.x += p.dx;
      p.y += p.dy;
      const bS = p.baseScale || 1.0;

      if (p.x < CFG.ARENA_BOUNDS.MIN_X || p.x > CFG.ARENA_BOUNDS.MAX_X) {
        p.x = Math.max(CFG.ARENA_BOUNDS.MIN_X, Math.min(p.x, CFG.ARENA_BOUNDS.MAX_X));
        p.dx *= CFG.PHYSICS.BOUNCE;
        p.aS.tX = bS * CFG.JUICE.BOUNCE_X.tX;
        p.aS.tY = bS * CFG.JUICE.BOUNCE_X.tY;
        AudioSys.play('hit', 0.2);
      }
      if (p.y < CFG.ARENA_BOUNDS.MIN_Y || p.y > CFG.ARENA_BOUNDS.MAX_Y) {
        p.y = Math.max(CFG.ARENA_BOUNDS.MIN_Y, Math.min(p.y, CFG.ARENA_BOUNDS.MAX_Y));
        p.dy *= CFG.PHYSICS.BOUNCE;
        p.aS.tX = bS * CFG.JUICE.BOUNCE_Y.tX;
        p.aS.tY = bS * CFG.JUICE.BOUNCE_Y.tY;
        AudioSys.play('hit', 0.2);
      }

      if (p.def.action && ++p.t >= p.def.action.cd) {
        p.t = 0;
        p.aS.tX = bS * CFG.JUICE.ACTION.tX;
        p.aS.tY = bS * CFG.JUICE.ACTION.tY;
        const tgt = this.getValidTarget(p.id, p.def.targeting);
        if (tgt) this.executeAction(p, tgt);
      }
    });

    for (let i = this.actE.length - 1; i >= 0; i--) {
      const e = this.actE[i];
      for (let j = 0; j < e.traits.length; j++) {
        const tl = MinitEngine.Registry.traits[e.traits[j]];
        if (tl) tl(e, this);
      }
      if (e.dead) {
        this.actE[i] = this.actE[this.actE.length - 1];
        this.actE.pop();
        this.deadE.push(e);
      }
    }
  }

  updateVisuals(tS) {
    this.players.forEach((p) => {
      if (p.hp <= 0) {
        p.spr.visible = false;
        return;
      }
      const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Smooth lerp without jitter
      p.spr.x += (pX - p.spr.x) * CFG.RENDER.LERP * tS;
      p.spr.y += (pY - p.spr.y) * CFG.RENDER.LERP * tS;

      const bS = p.baseScale || 1.0;
      p.aS.tX += (bS - p.aS.tX) * CFG.RENDER.SPRING_TENSION * tS;
      p.aS.tY += (bS - p.aS.tY) * CFG.RENDER.SPRING_TENSION * tS;
      p.aS.x += (p.aS.tX - p.aS.x) * CFG.RENDER.SPRING_DAMP * tS;
      p.aS.y += (p.aS.tY - p.aS.y) * CFG.RENDER.SPRING_DAMP * tS;
      p.spr.scale.set(p.aS.x, p.aS.y);

      // Damage flash matching texture silhouette (tweakable in config.js)
      if (p.fT > 0) {
        p.fT -= tS;
        p.spr.tint = CFG.JUICE.HIT_FLASH_COLOR;
      } else {
        p.spr.tint = 0xffffff;
      }
    });

    this.fxPool.update(tS);

    if (this.fA > 0) {
      this.sF.alpha = this.fA;
      this.fA -= 0.05 * tS;
    } else {
      this.sF.alpha = 0;
    }

    if (this.shake > 0) {
      const sx = Math.round(FastMath.randRange(-this.shake / 2, this.shake / 2));
      const sy = Math.round(FastMath.randRange(-this.shake / 2, this.shake / 2));
      this.view.position.set(sx, sy);
      this.shake *= Math.pow(0.8, tS);
      if (this.shake < 0.5) {
        this.shake = 0;
        this.view.position.set(0, 0);
      }
    } else {
      this.view.position.set(0, 0);
    }
  }
}
