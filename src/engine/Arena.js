// ============================================================
// ARENA & COMBAT SIMULATION (ES Module - Universal Builder Edition)
// Supports Lifecycle Hooks, Multi-Ability Slots, Movement AI,
// Summons/Clones/Turrets, Shields/Barriers & Headless Balance Mode
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { AudioSys } from './AudioSys.js';
import { VFXPool } from './VFXPool.js';
import { BeamRenderer } from './BeamRenderer.js';
import { MinitEngine } from './Registry.js';
import { normalizeActionSlot } from './MinitContract.js';
import { MinitSDK, executeMovementAI, invokeMinitHook } from './MinitSDK.js';
import { DebugConfig } from './DebugConfig.js';

const NOOP_FN = () => {};
const HEADLESS_FX_POOL = {
  initTex: NOOP_FN,
  spawnPhysics: NOOP_FN,
  spawnSparkBurst: NOOP_FN,
  spawnGlow: NOOP_FN,
  spawnAfterimage: NOOP_FN,
  spawnScorch: NOOP_FN,
  spawnShockwave: NOOP_FN,
  spawnDmgText: NOOP_FN,
  getBudgetMult: () => 1.0,
  update: NOOP_FN,
  act: { phys: [], sws: [], txts: [], decals: [] },
  pool: { phys: [], sws: [], txts: [], decals: [] }
};
const HEADLESS_BEAM_RENDERER = {
  renderBeam: NOOP_FN,
  removeBeam: NOOP_FN,
  update: NOOP_FN,
  clear: NOOP_FN
};

function createDummySprite() {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
    tint: 0xffffff,
    texture: null,
    scale: {
      x: 1,
      y: 1,
      set(sx, sy = sx) {
        this.x = sx;
        this.y = sy;
      }
    },
    destroy: NOOP_FN
  };
}

export class Arena extends PIXI.Container {
  constructor(pIds, texturesRef, options = {}) {
    super();
    this.textures = texturesRef || {};
    this.isHeadless = Boolean(options.headless);
    this.shake = 0;
    this.shakeDirX = 0;
    this.shakeDirY = 0;
    this.hitStop = 0;
    this.totalTicks = 0;
    this.combatLog = [];
    this.summons = [];
    this._summonCounter = 0;
    this.gridRipples = [];
    this.wallRipples = [];
    this._gridDirty = true;
    this.SDK = MinitSDK;

    const AW = CFG.GRID.COLS * CFG.GRID.TS;
    const AH = CFG.GRID.ROWS * CFG.GRID.TS;

    if (!this.isHeadless) {
      this.view = new PIXI.Container();
      this.addChild(this.view);

      // Background Arena Board with crisp borders
      this.bgGfx = new PIXI.Graphics();
      this.view.addChild(this.bgGfx);

      // Arena Interior Layer
      this.maskGfx = new PIXI.Graphics();
      this.view.addChild(this.maskGfx);
      this.layer = new PIXI.Container();
      this.layer.mask = this.maskGfx;
      this.view.addChild(this.layer);

      this._drawBoardFrame(AW, AH);

      // Reactive Grid Floor & Wall Ripple Graphics
      this.gridGfx = new PIXI.Graphics();
      this.layer.addChild(this.gridGfx);
      this._renderReactiveGrid(1.0);

      this.fxU = new PIXI.Container();
      this.layer.addChild(this.fxU);

      this.unitGlowLayer = new PIXI.Container();
      this.layer.addChild(this.unitGlowLayer);

      this.summonLayer = new PIXI.Container();
      this.layer.addChild(this.summonLayer);
    }

    // Players
    this.players = [];
    this.playerMap = {};

    pIds.forEach((id, idx) => {
      const md = MinitEngine.Registry.getMinit(id) || MinitEngine.Registry.minits[id];
      let spr;
      let glowSpr = null;
      if (!this.isHeadless) {
        const tex = this.textures[`minit_${id}_base`];
        spr = new PIXI.Sprite(tex || PIXI.Texture.WHITE);
        spr.anchor.set(0.5);
        this.layer.addChild(spr);

        if (this.textures['fx_glow']) {
          glowSpr = new PIXI.Sprite(this.textures['fx_glow']);
          glowSpr.anchor.set(0.5);
          glowSpr.blendMode = PIXI.BLEND_MODES.ADD;
          glowSpr.tint = md.color || 0x00e5ff;
          glowSpr.alpha = 0.42;
          this.unitGlowLayer.addChild(glowSpr);
        }
      } else {
        spr = createDummySprite();
      }

      const sX = idx === 0 ? 3 : CFG.GRID.COLS - 4;
      const sY = Math.floor(CFG.GRID.ROWS / 2);
      const sSpX = idx === 0 ? md.stats.speed : -md.stats.speed;

      // Clone def safely so mid-battle transformations or phase changes never mutate global Registry
      const clonedDef = {
        ...md,
        stats: { ...md.stats },
        movement: md.movement ? { ...md.movement } : { type: 'wander' },
        action: md.action ? { ...md.action } : null,
        actions: Array.isArray(md.actions) ? md.actions.map((s) => ({ ...s })) : [],
        hooks: md.hooks ? { ...md.hooks } : {}
      };

      const initialScale = clonedDef.stats.scale || 1.0;
      const initialShield = clonedDef.stats.shield || 0;
      const maxShield = Math.max(clonedDef.stats.maxShield || 0, initialShield);
      let clonedState = {};
      try {
        clonedState = JSON.parse(JSON.stringify(md.initialState || {}));
      } catch (e) {
        clonedState = { ...(md.initialState || {}) };
      }

      const pData = {
        id: `P${idx + 1}`,
        team: `P${idx + 1}`,
        isSummon: false,
        def: clonedDef,
        hp: clonedDef.stats.hp,
        maxHp: clonedDef.stats.hp,
        shield: initialShield,
        maxShield,
        energy: clonedDef.stats.energy || 0,
        maxEnergy: clonedDef.stats.maxEnergy || 100,
        x: sX,
        y: sY,
        dx: sSpX,
        dy: clonedDef.stats.speed,
        t: 0,
        actionSlots: this._buildActionSlots(clonedDef),
        spr,
        glowSpr,
        baseScale: initialScale,
        dmgMult: 1.0,
        aS: { x: initialScale, y: initialScale, tX: initialScale, tY: initialScale },
        fT: 0,
        hudJolt: 0,
        stunTicks: 0,
        slowTicks: 0,
        slowMult: 0.5,
        invulnTicks: 0,
        dashTicks: 0,
        untargetable: false,
        state: clonedState,
        activeStatuses: new Set(),
        debuffs: {},
        telemetry: {
          dmgDealt: 0,
          dmgTaken: 0,
          hitsLanded: 0,
          hitsTaken: 0,
          actionsUsed: 0
        }
      };

      this.players.push(pData);
      this.playerMap[pData.id] = pData;
    });

    if (!this.isHeadless) {
      this.unitOverlayGfx = new PIXI.Graphics();
      this.layer.addChild(this.unitOverlayGfx);

      this.fxO = new PIXI.Container();
      this.layer.addChild(this.fxO);
      this.fxPool = new VFXPool(this.fxU, this.fxO, this.textures);
      this.beamRenderer = new BeamRenderer(this.layer, this.fxPool, this.textures);

      this.fA = 0;
      this.sF = new PIXI.Graphics().beginFill(0xffffff).drawRect(0, 0, AW, AH).endFill();
      this.sF.alpha = 0;
      this.view.addChild(this.sF);
    } else {
      this.fxPool = HEADLESS_FX_POOL;
      this.beamRenderer = HEADLESS_BEAM_RENDERER;
    }

    this.actE = [];
    const poolSize = this.isHeadless ? 300 : 650;
    this.deadE = Array.from({ length: poolSize }, () => ({
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

    // Invoke `onInit` hook for each fighter once the arena is ready
    for (let i = 0; i < this.players.length; i++) {
      invokeMinitHook(this.players[i], 'onInit', this);
    }
  }

  _drawBoardFrame(AW, AH) {
    if (this.isHeadless || !this.bgGfx || !this.maskGfx) return;
    this.bgGfx
      .clear()
      .beginFill(CFG.ARENA.BG_COLOR, CFG.ARENA.BG_ALPHA)
      .lineStyle(2, CFG.ARENA.GUARD_COLOR, 1)
      .drawRect(-2, -2, AW + 4, AH + 4)
      .endFill();

    const gL = 16;
    const gT = 4;
    this.bgGfx
      .beginFill(CFG.ARENA.GUARD_COLOR)
      .drawRect(-gT, -gT, gL, gT)
      .drawRect(-gT, -gT, gT, gL)
      .drawRect(AW + gT - gL, -gT, gL, gT)
      .drawRect(AW, -gT, gT, gL)
      .drawRect(-gT, AH, gL, gT)
      .drawRect(-gT, AH + gT - gL, gT, gL)
      .drawRect(AW + gT - gL, AH, gL, gT)
      .drawRect(AW, AH + gT - gL, gT, gL)
      .endFill();

    this.maskGfx.clear().beginFill(0xffffff).drawRect(0, 0, AW, AH).endFill();

    if (this.sF) {
      this.sF.clear().beginFill(0xffffff).drawRect(0, 0, AW, AH).endFill();
    }
  }

  rebuildBoardVisuals() {
    if (this.isHeadless) return;
    const AW = CFG.GRID.COLS * CFG.GRID.TS;
    const AH = CFG.GRID.ROWS * CFG.GRID.TS;
    this._drawBoardFrame(AW, AH);
    this._gridDirty = true;
    this._renderReactiveGrid(0);
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      p.x = FastMath.clamp(p.x, CFG.ARENA_BOUNDS.MIN_X, CFG.ARENA_BOUNDS.MAX_X);
      p.y = FastMath.clamp(p.y, CFG.ARENA_BOUNDS.MIN_Y, CFG.ARENA_BOUNDS.MAX_Y);
    }
  }

  _buildActionSlots(def) {
    const rawList =
      Array.isArray(def.actions) && def.actions.length > 0
        ? def.actions
        : def.action
          ? [def.action]
          : [];
    return rawList
      .map((slot, idx) => {
        const norm = normalizeActionSlot(slot, idx);
        if (!norm) return null;
        return {
          ...norm,
          timer: norm.initialCd > 0 ? Math.max(0, norm.cd - norm.initialCd) : 0
        };
      })
      .filter(Boolean);
  }

  // ============================================================
  // DIRECT MINIT SDK CONVENIENCE METHODS ON ARENA INSTANCE
  // ============================================================
  teleport(actor, x, y, options) {
    return MinitSDK.teleport(this, actor, x, y, options);
  }

  dash(actor, targetOrAngle, speed, durationTicks, options) {
    return MinitSDK.dash(this, actor, targetOrAngle, speed, durationTicks, options);
  }

  shootProjectile(owner, options) {
    return MinitSDK.shootProjectile(this, owner, options);
  }

  fireBeam(owner, options) {
    return MinitSDK.fireBeam(this, owner, options);
  }

  dealAreaDamage(owner, x, y, radius, dmg, options) {
    return MinitSDK.dealAreaDamage(this, owner, x, y, radius, dmg, options);
  }

  heal(actor, amount, options) {
    return MinitSDK.heal(this, actor, amount, options);
  }

  addShield(actor, amount, maxShield) {
    return MinitSDK.addShield(this, actor, amount, maxShield);
  }

  applyStatus(owner, target, statusCfg) {
    return MinitSDK.applyStatus(this, owner, target, statusCfg);
  }

  setPhase(owner, phasePatch) {
    return MinitSDK.setPhase(this, owner, phasePatch);
  }

  spawnClone(owner, cfg) {
    return MinitSDK.spawnClone(this, owner, cfg);
  }

  spawnTurret(owner, cfg) {
    return MinitSDK.spawnTurret(this, owner, cfg);
  }

  spawnBarrier(owner, cfg) {
    return MinitSDK.spawnBarrier(this, owner, cfg);
  }

  // ============================================================
  // ACTOR & SUMMON MANAGEMENT
  // ============================================================
  getActorById(id) {
    if (!id) return null;
    if (this.playerMap[id]) return this.playerMap[id];
    return (
      this.players.find((p) => p.id === id) ||
      this.summons.find((s) => s.id === id) ||
      null
    );
  }

  getAllActors() {
    if (this.summons.length === 0) return this.players;
    return [...this.players, ...this.summons];
  }

  getOpposingActors(teamId) {
    const out = [];
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.team !== teamId && p.id !== teamId && p.hp > 0) out.push(p);
    }
    for (let i = 0; i < this.summons.length; i++) {
      const s = this.summons[i];
      if (s.team !== teamId && s.ownerId !== teamId && s.hp > 0) out.push(s);
    }
    return out;
  }

  spawnSummon(owner, cfg = {}) {
    if (!owner || owner.hp <= 0) return null;
    const ownerTeam = owner.team || owner.id;

    // Cap active summons per team at 8 to prevent runaway infinite loops
    const activeTeamSummons = this.summons.filter((s) => s.team === ownerTeam && s.hp > 0).length;
    if (activeTeamSummons >= (cfg.maxActive ?? 8)) return null;

    this._summonCounter++;
    const summonId = `${ownerTeam}_sum_${this._summonCounter}`;
    const hp = cfg.hp ?? 180;
    const speed = cfg.speed ?? 0.14;
    const scale = cfg.scale ?? 0.75;
    const color = cfg.color ?? owner.def?.color ?? 0x00e5ff;

    let spr;
    if (!this.isHeadless) {
      const texKey = cfg.texture || `minit_${owner.def?.id}_base`;
      const tex = this.textures[texKey] || this.textures[`minit_${owner.def?.id}_base`];
      spr = new PIXI.Sprite(tex || PIXI.Texture.WHITE);
      spr.anchor.set(0.5);
      spr.scale.set(scale);
      this.summonLayer.addChild(spr);
    } else {
      spr = createDummySprite();
    }

    const summonDef = {
      id: cfg.id || summonId,
      name: cfg.name || 'Summon',
      color,
      stats: {
        hp,
        speed,
        shield: cfg.shield ?? 0,
        armor: cfg.armor ?? 0,
        scale
      },
      targeting: cfg.targeting || { type: 'closest_enemy' },
      movement:
        typeof cfg.movement === 'string'
          ? { type: cfg.movement }
          : cfg.movement || { type: 'chase', stopDist: 0.4 },
      action: cfg.action ? normalizeActionSlot(cfg.action, 0) : null,
      actions: Array.isArray(cfg.actions)
        ? cfg.actions.map((a, idx) => normalizeActionSlot(a, idx)).filter(Boolean)
        : [],
      payload: cfg.payload || owner.def?.payload || { dmg: 20, zoneRadius: 1.0 },
      hooks: cfg.hooks || {}
    };

    const sX = FastMath.clamp(
      cfg.x ?? owner.x + FastMath.randRange(-0.8, 0.8),
      CFG.ARENA_BOUNDS.MIN_X,
      CFG.ARENA_BOUNDS.MAX_X
    );
    const sY = FastMath.clamp(
      cfg.y ?? owner.y + FastMath.randRange(-0.8, 0.8),
      CFG.ARENA_BOUNDS.MIN_Y,
      CFG.ARENA_BOUNDS.MAX_Y
    );
    const ang = FastMath.randRange(0, FastMath.TWO_PI);

    const summonActor = {
      id: summonId,
      ownerId: owner.id,
      team: ownerTeam,
      isSummon: true,
      def: summonDef,
      hp,
      maxHp: hp,
      shield: cfg.shield ?? 0,
      maxShield: cfg.shield ?? 0,
      x: sX,
      y: sY,
      dx: Math.cos(ang) * speed,
      dy: Math.sin(ang) * speed,
      life: cfg.life ?? 480,
      maxLife: cfg.life ?? 480,
      contactDmg: cfg.contactDmg ?? 0,
      contactCd: cfg.contactCd ?? 20,
      t: 0,
      actionSlots: this._buildActionSlots(summonDef),
      spr,
      baseScale: scale,
      dmgMult: cfg.dmgMult ?? (owner.dmgMult || 1.0),
      aS: { x: scale, y: scale, tX: scale, tY: scale },
      fT: 0,
      stunTicks: 0,
      slowTicks: 0,
      slowMult: 0.5,
      invulnTicks: 0,
      dashTicks: 0,
      state: { ...(cfg.initialState || {}) },
      activeStatuses: new Set(),
      debuffs: {}
    };

    if (!this.isHeadless) {
      const pX = sX * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = sY * CFG.GRID.TS + CFG.GRID.HALF_TS;
      this.fxPool.spawnShockwave(pX, pY, color, 40, 3);
      if (cfg.sound) AudioSys.play(cfg.sound, 0.5);
    }

    this.summons.push(summonActor);
    invokeMinitHook(summonActor, 'onInit', this);
    return summonActor;
  }

  logCombatEvent(msg) {
    if (this.isHeadless) return;
    this.combatLog.push({ tick: this.totalTicks, msg });
    if (this.combatLog.length > 18) {
      this.combatLog.shift();
    }
  }

  getPixelCoords(gx, gy) {
    return {
      px: gx * CFG.GRID.TS + CFG.GRID.HALF_TS,
      py: gy * CFG.GRID.TS + CFG.GRID.HALF_TS
    };
  }

  getValidTarget(oId, rule) {
    const lg = MinitEngine.Registry.targeting[rule?.type] || MinitEngine.Registry.targeting.closest_enemy;
    const owner = this.getActorById(oId);
    return lg && owner ? lg(owner, this) : null;
  }

  spawnEnt(props) {
    if (this.deadE.length === 0) return;
    const e = this.deadE.pop();
    e.active = true;
    e.dead = false;
    e.x = props.x ?? 0;
    e.y = props.y ?? 0;
    e.curX = props.x ?? 0;
    e.curY = props.y ?? 0;
    e.dx = props.dx ?? 0;
    e.dy = props.dy ?? 0;
    e.l = props.l ?? 0;
    e.maxL = props.maxL ?? props.l ?? 0;
    e.traits = props.traits || [];
    e.p = props.p || {};
    this.actE.push(e);
  }

  triggerFlash(a = 0.5) {
    if (!this.isHeadless) {
      const flashMult = DebugConfig.state.vfxFlashScale ?? 1.0;
      this.fA = Math.max(this.fA, a * flashMult);
    }
  }

  applyKnockback(
    targetIdOrActor,
    { fromX, fromY, forceX, forceY, force = 0.65, shake = 6, playSound = false }
  ) {
    const p =
      typeof targetIdOrActor === 'object'
        ? targetIdOrActor
        : this.getActorById(targetIdOrActor);
    if (!p || p.hp <= 0) return;

    let kx = forceX || 0;
    let ky = forceY || 0;

    if (fromX !== undefined && fromY !== undefined) {
      const angle = FastMath.angle(fromX, fromY, p.x, p.y);
      kx = Math.cos(angle) * force;
      ky = Math.sin(angle) * force;
    }

    p.dx = kx;
    p.dy = ky;

    const bS = p.baseScale || 1.0;
    if (p.aS) {
      p.aS.tX = bS * 0.7;
      p.aS.tY = bS * 1.35;
    }
    const shakeMult = DebugConfig.state.vfxShakeScale ?? 1.0;
    if (shake && !this.isHeadless) this.shake = Math.max(this.shake, shake * shakeMult);
    if (playSound && !this.isHeadless) AudioSys.play('hit', 0.8);
  }

  /**
   * Universal damage pipeline supporting both fighters and summons,
   * with `onBeforeDamaged`, `armor`, `shield`, `onDamaged`, and `onBeforeDeath` (Revive).
   */
  damageActor(targetOrId, payload = {}, fxC, attackerActor = null) {
    const p =
      typeof targetOrId === 'object' ? targetOrId : this.getActorById(targetOrId);
    if (!p || p.hp <= 0) return;

    // Respect invulnerability frames
    if (p.invulnTicks > 0 && !payload.pierceInvuln) return;

    const attacker =
      attackerActor ||
      this.players.find((pl) => pl.id !== (p.team || p.id)) ||
      null;

    const dmgCtx = {
      dmg: Math.max(0, payload.dmg || 0),
      payload,
      attacker,
      target: p,
      cancel: false
    };

    if (attacker) {
      invokeMinitHook(attacker, 'onBeforeDealDamage', dmgCtx, this);
    }
    invokeMinitHook(p, 'onBeforeDamaged', dmgCtx, this);
    if (dmgCtx.cancel || dmgCtx.dmg <= 0) return;

    // Apply Armor flat reduction (if defined)
    let rawDmg = dmgCtx.dmg;
    const armor = p.def?.stats?.armor || 0;
    if (armor > 0) {
      rawDmg = Math.max(1, rawDmg - armor);
    }

    // Absorb against Shield first
    let shieldAbsorbed = 0;
    if (p.shield > 0) {
      shieldAbsorbed = Math.min(p.shield, rawDmg);
      p.shield -= shieldAbsorbed;
      rawDmg -= shieldAbsorbed;
    }

    const actualHpDmg = Math.min(p.hp, rawDmg);
    p.hp = Math.max(0, p.hp - rawDmg);
    const totalEffectiveDmg = shieldAbsorbed + actualHpDmg;

    // Record telemetry on primary fighters
    const targetMainPlayer = p.isSummon ? this.playerMap[p.team] : p;
    if (!p.isSummon && targetMainPlayer?.telemetry) {
      targetMainPlayer.telemetry.dmgTaken += actualHpDmg;
      targetMainPlayer.telemetry.hitsTaken += 1;
    }
    const attackerMainPlayer = attacker?.isSummon
      ? this.playerMap[attacker.team]
      : attacker;
    if (attackerMainPlayer?.telemetry) {
      attackerMainPlayer.telemetry.dmgDealt += totalEffectiveDmg;
      attackerMainPlayer.telemetry.hitsLanded += 1;
    }

    if (!this.isHeadless && totalEffectiveDmg >= 15) {
      this.logCombatEvent(
        `${attacker ? attacker.def.name : 'ATK'} → ${p.def.name} -${Math.round(totalEffectiveDmg)}`
      );
    }

    const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const vfx = payload.hitVfx || {};

    const isCrit =
      totalEffectiveDmg >= (CFG.VFX.CRIT_DMG_THRESHOLD || 24) ||
      totalEffectiveDmg >= (p.maxHp || 1000) * 0.11;

    // Trigger HUD card jolt on main fighters
    if (!p.isSummon) {
      p.hudJolt = Math.min(12, Math.max(p.hudJolt || 0, isCrit ? 8 : 3.5));
    }

    if (!this.isHeadless) {
      const popupColor = shieldAbsorbed > 0 && actualHpDmg === 0 ? 0x00e5ff : fxC;
      if (vfx.showText !== false) {
        this.fxPool.spawnDmgText(pX, pY, totalEffectiveDmg, popupColor, vfx.textScale || 1.0, {
          isCrit
        });
      }
      if (vfx.playSound !== false) {
        AudioSys.play(vfx.sound || 'hit', isCrit ? 0.8 : 0.6);
      }
    }

    // Impact direction angle (from attacker toward victim)
    const hitAngle = attacker
      ? FastMath.angle(attacker.x, attacker.y, p.x, p.y)
      : FastMath.randRange(0, FastMath.TWO_PI);

    if (payload.knockback) {
      const kb = payload.knockback;
      this.applyKnockback(p, {
        fromX: kb.fromX,
        fromY: kb.fromY,
        forceX: kb.forceX,
        forceY: kb.forceY,
        force: kb.force ?? 0.7,
        shake: kb.shake ?? vfx.shake ?? 6
      });
    } else if (totalEffectiveDmg >= 12) {
      // Subtle micro-nudge along hit direction for tactile impact
      const nudge = Math.min(0.28, totalEffectiveDmg * 0.005);
      p.x = FastMath.clamp(p.x + Math.cos(hitAngle) * nudge, CFG.ARENA_BOUNDS.MIN_X, CFG.ARENA_BOUNDS.MAX_X);
      p.y = FastMath.clamp(p.y + Math.sin(hitAngle) * nudge, CFG.ARENA_BOUNDS.MIN_Y, CFG.ARENA_BOUNDS.MAX_Y);
    }

    const bS = p.baseScale || 1.0;
    if (p.aS) {
      const hitStretch = isCrit ? 1.45 : CFG.JUICE.HIT.tX;
      const hitSquash = isCrit ? 0.72 : 0.86;
      p.aS.tX = bS * hitStretch;
      p.aS.tY = bS * hitSquash;
    }

    if (!this.isHeadless) {
      if (p.fT <= 0) p.fT = vfx.unitFlashDur ?? CFG.JUICE.HIT_FLASH_DUR;
      const shakeMult = DebugConfig.state.vfxShakeScale ?? 1.0;
      const targetShake = (vfx.shake ?? (isCrit ? 6 : 2.5)) * shakeMult;
      if (targetShake > 0) {
        this.shake = Math.max(this.shake, targetShake);
        this.shakeDirX = Math.cos(hitAngle);
        this.shakeDirY = Math.sin(hitAngle);
      }
      if (vfx.flash) this.triggerFlash(vfx.flash);

      // Dynamic hit-stop freeze on heavy hits
      const hitStopMult = DebugConfig.state.vfxHitStopScale ?? 1.0;
      const dynamicHitStop = (vfx.hitStop ?? (isCrit ? 3 : 0)) * hitStopMult;
      if (dynamicHitStop > 0) {
        this.hitStop = Math.max(this.hitStop, dynamicHitStop);
      }

      const pC = vfx.particleCount ?? CFG.VFX.HIT.PARTICLE_COUNT;
      if (pC > 0) {
        // Directional spark cone + core glow burst
        this.fxPool.spawnSparkBurst(
          pX,
          pY,
          hitAngle,
          shieldAbsorbed > 0 && actualHpDmg === 0 ? 0x00e5ff : fxC,
          isCrit ? Math.round(pC * 1.4) : pC,
          isCrit ? CFG.VFX.HIT.BURST_FORCE * 1.3 : CFG.VFX.HIT.BURST_FORCE,
          0.95,
          CFG.VFX.HIT.LIFE
        );
      }

      // Heavy hits ripple the arena grid & leave a light scorch mark
      if (isCrit) {
        this.spawnGridRipple(pX, pY, 56, 4.5, fxC);
        if (totalEffectiveDmg >= 35) {
          this.fxPool.spawnScorch(pX, pY, fxC, 0.75, 160);
        }
      }
    }

    if (vfx.debuff && p.debuffs && !p.debuffs[vfx.debuff.payload.id]) {
      p.debuffs[vfx.debuff.payload.id] = true;
      this.spawnEnt({
        x: p.x,
        y: p.y,
        l: vfx.debuff.duration,
        traits: [vfx.debuff.trait],
        p: { targetId: p.id, color: fxC, payload: vfx.debuff.payload }
      });
    }

    // Post-damage hooks
    if (attacker) {
      invokeMinitHook(attacker, 'onDealDamage', p, totalEffectiveDmg, this);
    }
    invokeMinitHook(p, 'onDamaged', totalEffectiveDmg, attacker, this);

    // Death & Revive check
    if (p.hp <= 0) {
      invokeMinitHook(p, 'onBeforeDeath', this);
      // If `onBeforeDeath` healed the unit above 0 HP (e.g. Phoenix Revive / Second Phase), cancel KO!
      if (p.hp > 0) {
        if (!this.isHeadless) {
          this.logCombatEvent(`${p.def.name} revived!`);
          this.fxPool.spawnShockwave(pX, pY, p.def.color, 95, 5);
          this.spawnGridRipple(pX, pY, 95, 7, p.def.color);
        }
        return;
      }

      invokeMinitHook(p, 'onDeath', attacker, this);
      if (attacker) {
        invokeMinitHook(attacker, 'onKill', p, this);
      }

      if (!this.isHeadless) {
        if (!p.isSummon) {
          this.logCombatEvent(`KO! ${p.def.name} defeated`);
        }
        const dVfx = p.def.deathVfx || {};
        AudioSys.play(dVfx.sound || (p.isSummon ? 'hit' : 'crush'));
        if (!p.isSummon) {
          this.triggerFlash(dVfx.flash || CFG.JUICE.DEATH_FLASH_INTENSITY);
        }
        const shakeMult = DebugConfig.state.vfxShakeScale ?? 1.0;
        const hitStopMult = DebugConfig.state.vfxHitStopScale ?? 1.0;
        this.shake = Math.max(
          this.shake,
          (p.isSummon ? 4 : dVfx.shake || CFG.JUICE.DEATH_SHAKE) * shakeMult
        );
        if (!p.isSummon) {
          this.hitStop = Math.max(
            this.hitStop,
            (dVfx.hitStop || CFG.JUICE.DEATH_HIT_STOP) * hitStopMult
          );
        }

        const koRad = p.isSummon ? 45 : dVfx.shockRad || CFG.VFX.DEATH.SHOCK_RAD;
        this.fxPool.spawnShockwave(pX, pY, p.def.color, koRad, p.isSummon ? 3 : 6);
        this.fxPool.spawnScorch(pX, pY, p.def.color, p.isSummon ? 0.8 : 1.45, 320);
        this.spawnGridRipple(pX, pY, koRad, p.isSummon ? 4 : 9.5, p.def.color);

        const dpC = p.isSummon ? 10 : (dVfx.particleCount ?? CFG.VFX.DEATH.PARTICLE_COUNT);
        this.fxPool.spawnSparkBurst(
          pX,
          pY,
           null,
          p.def.color,
          dpC,
          CFG.VFX.DEATH.BURST_FORCE,
          Math.PI,
          CFG.VFX.DEATH.PARTICLE_LIFE
        );
      }
    }
  }

  // Backward-compatible wrapper used by existing Minit traits
  damagePlayer(pid, payload = {}, fxC) {
    return this.damageActor(pid, payload, fxC);
  }

  /**
   * Triggers a radial spring-displacement ripple across the arena floor grid.
   */
  spawnGridRipple(px, py, maxRadius = 75, strength = 5.5, color = 0x00e5ff) {
    if (this.isHeadless || DebugConfig.state.vfxShowGridRipples === false) return;
    if (!this.gridRipples) this.gridRipples = [];
    if (this.gridRipples.length >= 10) {
      this.gridRipples.shift();
    }
    this.gridRipples.push({
      x: px,
      y: py,
      r: 4,
      maxR: maxRadius,
      strength,
      color,
      life: 24,
      maxLife: 24
    });
    this._gridDirty = true;
  }

  /**
   * Triggers a glowing impact wave along an arena border wall (`'left' | 'right' | 'top' | 'bottom'`).
   */
  spawnWallRipple(wallSide, px, py, color = 0x00e5ff) {
    if (this.isHeadless || DebugConfig.state.vfxShowGridRipples === false) return;
    if (!this.wallRipples) this.wallRipples = [];
    if (this.wallRipples.length >= 8) {
      this.wallRipples.shift();
    }
    this.wallRipples.push({
      side: wallSide,
      x: px,
      y: py,
      color,
      life: 18,
      maxLife: 18
    });
    this._gridDirty = true;
  }

  executeAction(owner, tgt, slot = null) {
    const act = slot || owner.def.action;
    if (!act) return;

    const bA = tgt ? FastMath.angle(owner.x, owner.y, tgt.x, tgt.y) : 0;
    if (act.sound && !this.isHeadless) AudioSys.play(act.sound);

    if (owner.telemetry) {
      owner.telemetry.actionsUsed += 1;
    }
    if (!this.isHeadless && !owner.isSummon) {
      this.logCombatEvent(`${owner.def.name} used ${act.name || 'ability'}`);
    }

    // Subtle ability cast burst
    if (!this.isHeadless) {
      const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      this.fxPool.spawnGlow(oX, oY, owner.def.color, 0.75, 10, 0.45);
    }

    // Invoke custom `onExecute` on the slot or `onAction` hook on the Minit
    if (typeof act.onExecute === 'function') {
      act.onExecute(owner, tgt, this);
    }
    invokeMinitHook(owner, 'onAction', tgt, act, this);

    // Spawn entities if traitList is provided
    if (Array.isArray(act.traitList) && act.traitList.length > 0) {
      const count = act.count || 1;
      const slotPayload = act.payload
        ? { ...(owner.def.payload || {}), ...act.payload }
        : owner.def.payload;

      for (let i = 0; i < count; i++) {
        const ang =
          bA + (act.scatterSpread ? FastMath.randRange(-act.scatterSpread, act.scatterSpread) : 0);
        this.spawnEnt({
          x: owner.x,
          y: owner.y,
          dx: Math.cos(ang) * act.speed,
          dy: Math.sin(ang) * act.speed,
          l: act.life,
          traits: act.traitList,
          p: {
            ownerId: owner.team || owner.id,
            sourceActorId: owner.id,
            color: owner.def.color,
            vfx: act.vfx || {},
            payload: slotPayload
          }
        });
      }
    }
  }

  update(tS, currentFps = 60) {
    this.currentFps = currentFps;
    if (this.hitStop > 0) {
      this.hitStop -= tS;
    } else {
      this.tickAcc = (this.tickAcc || 0) + tS;
      let iter = 0;
      const maxIter = Math.max(CFG.SIM.MAX_ITERATIONS, Math.ceil(tS) + 1);
      while (this.tickAcc >= 1 && iter < maxIter) {
        this.tickLogic();
        this.tickAcc -= 1;
        iter++;
      }
    }
    if (!this.isHeadless) {
      this.updateVisuals(tS);
    }
  }

  _stepActorPhysicsAndActions(p) {
    if (p.hp <= 0) return;
    if (p.activeStatuses) p.activeStatuses.clear();

    // Status timer countdowns & status icon registration
    if (p.stunTicks > 0) {
      p.stunTicks--;
      if (p.activeStatuses) p.activeStatuses.add('icon_stun');
    }
    if (p.slowTicks > 0) {
      p.slowTicks--;
      if (p.activeStatuses) p.activeStatuses.add('icon_slow');
    }
    if (p.invulnTicks > 0) p.invulnTicks--;

    // Ambient Status Aura Particles (Shield, Slow, Stun)
    if (!this.isHeadless && this.totalTicks % 5 === 0) {
      const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      if (p.shield > 0 && this.totalTicks % 10 === 0) {
        const ang = FastMath.randRange(0, FastMath.TWO_PI);
        this.fxPool.spawnPhysics(
          'fx_star',
          pX + Math.cos(ang) * 11,
          pY + Math.sin(ang) * 11,
          0,
          -0.65,
          14,
          0.95,
          0.95,
          true,
          0x00e5ff,
          0.75,
          { additive: true, grav: -0.04, scale: 0.55 }
        );
      }
      if (p.slowTicks > 0) {
        this.fxPool.spawnPhysics(
          'fx_shard',
          pX + FastMath.randRange(-7, 7),
          pY + FastMath.randRange(-5, 5),
          FastMath.randRange(-0.4, 0.4),
          0.55,
          14,
          0.95,
          0.95,
          true,
          0x00ccff,
          0.8,
          { additive: true, grav: 0.05, scale: 0.65 }
        );
      }
      if (p.stunTicks > 0) {
        const starAng = this.totalTicks * 0.25;
        this.fxPool.spawnPhysics(
          'fx_star',
          pX + Math.cos(starAng) * 9,
          pY - 10 + Math.sin(starAng) * 3,
          0,
          -0.2,
          8,
          1,
          1,
          true,
          0xffdd00,
          0.95,
          { additive: true, grav: 0, scale: 0.65 }
        );
      }
    }

    // Shield & Energy regeneration
    if (p.def.stats.shieldRegen && p.shield < (p.maxShield || p.def.stats.maxShield || 0)) {
      p.shield = Math.min(p.maxShield || p.def.stats.maxShield, p.shield + p.def.stats.shieldRegen);
    }
    if (p.def.stats.energyRegen && p.energy < (p.maxEnergy || 100)) {
      p.energy = Math.min(p.maxEnergy || 100, p.energy + p.def.stats.energyRegen);
    }

    // Passive & Per-Tick Hook
    if (p.def.passive && typeof p.def.passive.onTick === 'function') {
      const rate = p.def.passive.tickRate || 1;
      if (this.totalTicks % rate === 0) {
        p.def.passive.onTick(p, this);
      }
    }
    invokeMinitHook(p, 'onTick', this);

    // If stunned, skip movement and ability triggers
    if (p.stunTicks > 0) return;

    // Execute Pluggable Movement AI
    executeMovementAI(p, this);

    // Emit ghost afterimage trails during dashes or high-velocity knockbacks
    const curSpd = Math.hypot(p.dx, p.dy);
    if (
      !this.isHeadless &&
      p.spr?.texture &&
      (p.dashTicks > 0 || curSpd > (p.def.stats.speed || 0.12) * 1.45) &&
      this.totalTicks % 2 === 0
    ) {
      this.fxPool.spawnAfterimage(
        p.spr.texture,
        p.spr.x || p.x * CFG.GRID.TS + CFG.GRID.HALF_TS,
        p.spr.y || p.y * CFG.GRID.TS + CFG.GRID.HALF_TS,
        p.spr.scale.x,
        p.spr.scale.y,
        p.spr.rotation,
        p.def.color || 0x00e5ff,
        0.42,
        11,
        true
      );
    }

    const bS = p.baseScale || 1.0;

    // Arena Boundary Collisions, Wall Impact Ripples & `onWallBounce` Hook
    if (p.x < CFG.ARENA_BOUNDS.MIN_X || p.x > CFG.ARENA_BOUNDS.MAX_X) {
      const hitLeft = p.x < CFG.ARENA_BOUNDS.MIN_X;
      p.x = FastMath.clamp(p.x, CFG.ARENA_BOUNDS.MIN_X, CFG.ARENA_BOUNDS.MAX_X);
      p.dx *= CFG.PHYSICS.BOUNCE;
      if (p.aS) {
        p.aS.tX = bS * 0.76;
        p.aS.tY = bS * 1.28;
      }
      if (!this.isHeadless && !p.isSummon) {
        AudioSys.play('hit', 0.2);
        const wX = hitLeft ? 0 : CFG.GRID.COLS * CFG.GRID.TS;
        const wY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        this.spawnWallRipple(hitLeft ? 'left' : 'right', wX, wY, p.def.color);
        this.spawnGridRipple(wX, wY, 42, 3.2, p.def.color);
        this.fxPool.spawnSparkBurst(wX, wY, hitLeft ? 0 : Math.PI, p.def.color, 4, 2.4, 0.85, 14);
      }
      invokeMinitHook(p, 'onWallBounce', 'x', this);
    }
    if (p.y < CFG.ARENA_BOUNDS.MIN_Y || p.y > CFG.ARENA_BOUNDS.MAX_Y) {
      const hitTop = p.y < CFG.ARENA_BOUNDS.MIN_Y;
      p.y = FastMath.clamp(p.y, CFG.ARENA_BOUNDS.MIN_Y, CFG.ARENA_BOUNDS.MAX_Y);
      p.dy *= CFG.PHYSICS.BOUNCE;
      if (p.aS) {
        p.aS.tX = bS * 1.28;
        p.aS.tY = bS * 0.76;
      }
      if (!this.isHeadless && !p.isSummon) {
        AudioSys.play('hit', 0.2);
        const wX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const wY = hitTop ? 0 : CFG.GRID.ROWS * CFG.GRID.TS;
        this.spawnWallRipple(hitTop ? 'top' : 'bottom', wX, wY, p.def.color);
        this.spawnGridRipple(wX, wY, 42, 3.2, p.def.color);
        this.fxPool.spawnSparkBurst(
          wX,
          wY,
          hitTop ? Math.PI * 0.5 : -Math.PI * 0.5,
          p.def.color,
          4,
          2.4,
          0.85,
          14
        );
      }
      invokeMinitHook(p, 'onWallBounce', 'y', this);
    }

    // Evaluate Multi-Slot Abilities (or Single Primary Action if mutated dynamically like Moth)
    const hasCustomMultiSlots = Array.isArray(p.def.actions) && p.def.actions.length > 1;
    if (hasCustomMultiSlots && p.actionSlots && p.actionSlots.length > 0) {
      const hpPct = p.hp / (p.maxHp || 1);
      for (let sIdx = 0; sIdx < p.actionSlots.length; sIdx++) {
        const slot = p.actionSlots[sIdx];
        slot.timer = (slot.timer || 0) + 1;
        if (idxSlotReady(p, slot, hpPct, this)) {
          slot.timer = 0;
          if (slot.energyCost > 0) p.energy = Math.max(0, (p.energy || 0) - slot.energyCost);
          if (p.aS) {
            p.aS.tX = bS * CFG.JUICE.ACTION.tX;
            p.aS.tY = bS * CFG.JUICE.ACTION.tY;
          }
          const tgt = this.getValidTarget(p.id, p.def.targeting);
          if (tgt) this.executeAction(p, tgt, slot);
        }
      }
    } else if (p.def.action) {
      // Classic single-action timer (`p.t`) — 100% compatible with existing traits that modify `p.t` or `p.def.action`
      if (++p.t >= p.def.action.cd) {
        const tgt = this.getValidTarget(p.id, p.def.targeting);
        const condOk =
          typeof p.def.action.condition === 'function'
            ? p.def.action.condition(p, tgt, this)
            : true;
        if (condOk && tgt) {
          p.t = 0;
          if (p.aS) {
            p.aS.tX = bS * CFG.JUICE.ACTION.tX;
            p.aS.tY = bS * CFG.JUICE.ACTION.tY;
          }
          this.executeAction(p, tgt, p.def.action);
        }
      }
    }
  }

  tickLogic() {
    this.totalTicks++;

    // 1. Update Main Fighters
    for (let pIdx = 0; pIdx < this.players.length; pIdx++) {
      this._stepActorPhysicsAndActions(this.players[pIdx]);
    }

    // 2. Update Summons / Clones / Turrets
    for (let sIdx = this.summons.length - 1; sIdx >= 0; sIdx--) {
      const s = this.summons[sIdx];
      const master = this.playerMap[s.team];
      if (s.hp <= 0 || --s.life <= 0 || (master && master.hp <= 0)) {
        if (!this.isHeadless && s.spr && !s.spr.destroyed) {
          s.spr.destroy();
        }
        this.summons.splice(sIdx, 1);
        continue;
      }

      this._stepActorPhysicsAndActions(s);

      // Optional summon contact damage
      if (s.contactDmg > 0 && s.life % (s.contactCd || 20) === 0) {
        const enemies = this.getOpposingActors(s.team);
        for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
          const en = enemies[eIdx];
          if (en.hp > 0 && FastMath.dist(s.x, s.y, en.x, en.y) <= 1.0) {
            this.damageActor(
              en,
              {
                dmg: s.contactDmg * (s.dmgMult || 1.0),
                hitVfx: { shake: 2, flash: 0, particleCount: 4, playSound: true }
              },
              s.def.color,
              s
            );
          }
        }
      }
    }

    // 3. Update Active Entities & Barriers
    for (let i = this.actE.length - 1; i >= 0; i--) {
      const e = this.actE[i];
      const traitCount = e.traits.length;
      for (let j = 0; j < traitCount; j++) {
        const tl = MinitEngine.Registry.traits[e.traits[j]];
        if (tl) {
          try {
            tl(e, this);
          } catch (err) {
            console.warn(`[Arena] Trait "${e.traits[j]}" threw error:`, err);
            e.dead = true;
          }
        }
      }
      if (e.dead) {
        if (e.p && e.p.beamId && this.beamRenderer) {
          this.beamRenderer.removeBeam(e.p.beamId);
        }
        this.actE[i] = this.actE[this.actE.length - 1];
        this.actE.pop();
        this.deadE.push(e);
      }
    }
  }

  /**
   * Renders the reactive arena grid and wall impact ripples.
   * Only recomputes geometry when active ripples exist (`_gridDirty`).
   */
  _renderReactiveGrid(tS) {
    if (!this.gridGfx) return;
    const hasRipples = this.gridRipples.length > 0 || this.wallRipples.length > 0;
    if (!hasRipples && !this._gridDirty) return;

    const AW = CFG.GRID.COLS * CFG.GRID.TS;
    const AH = CFG.GRID.ROWS * CFG.GRID.TS;
    const TS = CFG.GRID.TS;

    // Step active floor ripples
    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const rp = this.gridRipples[i];
      rp.life -= tS;
      rp.r += (rp.maxR - rp.r) * 0.22 * tS;
      if (rp.life <= 0) {
        this.gridRipples.splice(i, 1);
      }
    }

    // Step active wall ripples
    for (let i = this.wallRipples.length - 1; i >= 0; i--) {
      const wr = this.wallRipples[i];
      wr.life -= tS;
      if (wr.life <= 0) {
        this.wallRipples.splice(i, 1);
      }
    }

    this.gridGfx.clear();

    // Fast path when no ripples are active
    if (this.gridRipples.length === 0 && this.wallRipples.length === 0) {
      this.gridGfx.lineStyle(1, CFG.ARENA.GRID_COLOR, CFG.ARENA.GRID_ALPHA);
      for (let x = 1; x < CFG.GRID.COLS; x++) {
        this.gridGfx.moveTo(x * TS, 0).lineTo(x * TS, AH);
      }
      for (let y = 1; y < CFG.GRID.ROWS; y++) {
        this.gridGfx.moveTo(0, y * TS).lineTo(AW, y * TS);
      }
      this._gridDirty = false;
      return;
    }

    // Displaced reactive grid vertices
    const segStep = 8;
    const displacePt = (bx, by) => {
      let ox = bx;
      let oy = by;
      for (let r = 0; r < this.gridRipples.length; r++) {
        const rp = this.gridRipples[r];
        const dx = bx - rp.x;
        const dy = by - rp.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const band = Math.abs(d - rp.r);
        if (band < 24 && d > 0.1) {
          const env = (1 - band / 24) * (rp.life / rp.maxLife) * rp.strength;
          ox += (dx / d) * env;
          oy += (dy / d) * env;
        }
      }
      return { x: ox, y: oy };
    };

    this.gridGfx.lineStyle(1, CFG.ARENA.GRID_COLOR, CFG.ARENA.GRID_ALPHA);
    for (let x = 1; x < CFG.GRID.COLS; x++) {
      const baseX = x * TS;
      const p0 = displacePt(baseX, 0);
      this.gridGfx.moveTo(p0.x, p0.y);
      for (let py = segStep; py <= AH; py += segStep) {
        const pt = displacePt(baseX, py);
        this.gridGfx.lineTo(pt.x, pt.y);
      }
    }
    for (let y = 1; y < CFG.GRID.ROWS; y++) {
      const baseY = y * TS;
      const p0 = displacePt(0, baseY);
      this.gridGfx.moveTo(p0.x, p0.y);
      for (let px = segStep; px <= AW; px += segStep) {
        const pt = displacePt(px, baseY);
        this.gridGfx.lineTo(pt.x, pt.y);
      }
    }

    // Highlight energized ripple rings on the floor grid
    for (let r = 0; r < this.gridRipples.length; r++) {
      const rp = this.gridRipples[r];
      const alpha = (rp.life / rp.maxLife) * 0.28;
      this.gridGfx.lineStyle(1.2, rp.color, alpha).drawCircle(rp.x, rp.y, rp.r);
    }

    // Render glowing wall impact ripples along perimeter borders
    for (let w = 0; w < this.wallRipples.length; w++) {
      const wr = this.wallRipples[w];
      const norm = wr.life / wr.maxLife;
      const span = (1.0 - norm * 0.4) * 34;
      this.gridGfx.lineStyle(3, wr.color, norm * 0.85);
      if (wr.side === 'left' || wr.side === 'right') {
        const wx = wr.side === 'left' ? 1 : AW - 1;
        this.gridGfx.moveTo(wx, Math.max(0, wr.y - span)).lineTo(wx, Math.min(AH, wr.y + span));
      } else {
        const wy = wr.side === 'top' ? 1 : AH - 1;
        this.gridGfx.moveTo(Math.max(0, wr.x - span), wy).lineTo(Math.min(AW, wr.x + span), wy);
      }
    }
  }

  updateVisuals(tS) {
    // 0. Update Reactive Grid & Wall Ripples
    this._renderReactiveGrid(tS);

    // 1. Interpolate Players
    for (let i = 0; i < this.players.length; i++) {
      this._updateActorSprite(this.players[i], tS);
    }

    // 2. Interpolate Summons
    for (let i = 0; i < this.summons.length; i++) {
      this._updateActorSprite(this.summons[i], tS);
    }

    // 3. Render Shields, Barriers & Summon HP Bars on `unitOverlayGfx`
    if (this.unitOverlayGfx) {
      this.unitOverlayGfx.clear();

      // Draw Fighter Shields & Invulnerability Halos
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.hp <= 0) continue;
        const pX = p.spr.x;
        const pY = p.spr.y;

        if (p.shield > 0) {
          const shieldAlpha = 0.38 + 0.16 * Math.sin(this.totalTicks * 0.15);
          const rad = 13 * (p.baseScale || 1);
          this.unitOverlayGfx
            .lineStyle(1.8, 0x00e5ff, shieldAlpha + 0.28)
            .beginFill(0x00e5ff, shieldAlpha * 0.25)
            .drawCircle(pX, pY, rad)
            .endFill();

          // Rotating inner energy arcs
          const arcAng = this.totalTicks * 0.08;
          this.unitOverlayGfx
            .lineStyle(1.2, 0xffffff, shieldAlpha + 0.2)
            .arc(pX, pY, rad - 1.5, arcAng, arcAng + 1.4)
            .arc(pX, pY, rad - 1.5, arcAng + Math.PI, arcAng + Math.PI + 1.4);
        }
        if (p.invulnTicks > 0) {
          this.unitOverlayGfx
            .lineStyle(1.8, 0xffdd00, 0.88)
            .drawCircle(pX, pY, 15 * (p.baseScale || 1));
        }
      }

      // Draw Summon Mini HP Bars
      for (let i = 0; i < this.summons.length; i++) {
        const s = this.summons[i];
        if (s.hp <= 0) continue;
        const sX = s.spr.x;
        const sY = s.spr.y - 12;
        const barW = 16;
        const pct = Math.max(0, Math.min(1, s.hp / (s.maxHp || 1)));
        this.unitOverlayGfx
          .lineStyle(0)
          .beginFill(0x090912, 0.85)
          .drawRect(sX - barW / 2, sY, barW, 2.5)
          .beginFill(s.def.color || 0x00ff66, 0.95)
          .drawRect(sX - barW / 2, sY, barW * pct, 2.5)
          .endFill();
      }

      // Draw Active SDK Barriers
      for (let i = 0; i < this.actE.length; i++) {
        const e = this.actE[i];
        if (e.dead || !e.p?.isBarrier || !e.p?.barrierCfg) continue;
        const bCfg = e.p.barrierCfg;
        const bX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const bY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const radPx = (bCfg.radius || 1.4) * CFG.GRID.TS;
        const hpRatio = Math.max(0.2, Math.min(1, bCfg.hp / (bCfg.maxHp || 1)));
        const col = e.p.color || 0x00e5ff;
        this.unitOverlayGfx
          .lineStyle(2.2, col, 0.8 * hpRatio)
          .beginFill(col, 0.16 * hpRatio)
          .drawCircle(bX, bY, radPx)
          .endFill();
        this.unitOverlayGfx
          .lineStyle(1, 0xffffff, 0.55 * hpRatio)
          .drawCircle(bX, bY, Math.max(2, radPx - 2));
      }
    }

    this.fxPool.update(tS, this.currentFps || 60);
    if (this.beamRenderer) {
      this.beamRenderer.update(tS);
    }

    if (this.fA > 0) {
      this.sF.alpha = this.fA;
      this.fA -= 0.05 * tS;
    } else {
      this.sF.alpha = 0;
    }

    if (this.shake > 0) {
      const jitterX = FastMath.randRange(-this.shake * 0.5, this.shake * 0.5);
      const jitterY = FastMath.randRange(-this.shake * 0.5, this.shake * 0.5);
      const dirBiasX = (this.shakeDirX || 0) * this.shake * 0.35;
      const dirBiasY = (this.shakeDirY || 0) * this.shake * 0.35;
      this.view.position.set(Math.round(jitterX + dirBiasX), Math.round(jitterY + dirBiasY));
      this.shake *= Math.pow(0.8, tS);
      if (this.shake < 0.5) {
        this.shake = 0;
        this.shakeDirX = 0;
        this.shakeDirY = 0;
        this.view.position.set(0, 0);
      }
    } else {
      this.view.position.set(0, 0);
    }
  }

  _updateActorSprite(p, tS) {
    if (!p.spr) return;
    if (p.hp <= 0) {
      p.spr.visible = false;
      if (p.glowSpr) p.glowSpr.visible = false;
      return;
    }
    const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

    if (p.spr.x === 0 && p.spr.y === 0) {
      p.spr.x = pX;
      p.spr.y = pY;
    } else {
      p.spr.x += (pX - p.spr.x) * CFG.RENDER.LERP * tS;
      p.spr.y += (pY - p.spr.y) * CFG.RENDER.LERP * tS;
    }

    const bS = p.baseScale || 1.0;
    p.aS.tX += (bS - p.aS.tX) * CFG.RENDER.SPRING_TENSION * tS;
    p.aS.tY += (bS - p.aS.tY) * CFG.RENDER.SPRING_TENSION * tS;
    p.aS.x += (p.aS.tX - p.aS.x) * CFG.RENDER.SPRING_DAMP * tS;
    p.aS.y += (p.aS.tY - p.aS.y) * CFG.RENDER.SPRING_DAMP * tS;
    p.spr.scale.set(p.aS.x, p.aS.y);

    // Sync soft additive unit under-glow
    if (p.glowSpr) {
      p.glowSpr.visible = true;
      p.glowSpr.x = p.spr.x;
      p.glowSpr.y = p.spr.y;
      p.glowSpr.tint = p.def.color || 0x00e5ff;
      const pulse = 0.68 + 0.1 * Math.sin(this.totalTicks * 0.12);
      p.glowSpr.scale.set(bS * pulse);
      p.glowSpr.alpha = p.fT > 0 ? 0.75 : 0.38;
    }

    if (p.fT > 0) {
      p.fT -= tS;
      p.spr.tint = CFG.JUICE.HIT_FLASH_COLOR;
    } else {
      p.spr.tint = 0xffffff;
    }
  }

  destroy(options) {
    if (this.beamRenderer) {
      try {
        this.beamRenderer.clear();
      } catch (e) {}
    }
    if (this.summons) {
      this.summons.forEach((s) => {
        try {
          if (s.spr && !s.spr.destroyed) s.spr.destroy();
        } catch (e) {}
      });
      this.summons = [];
    }
    try {
      super.destroy(options);
    } catch (e) {}
  }
}

function idxSlotReady(p, slot, hpPct, arena) {
  if (slot.timer < slot.cd) return false;
  if (slot.energyCost > 0 && (p.energy || 0) < slot.energyCost) return false;
  if (hpPct < (slot.minHpPct ?? 0) || hpPct > (slot.maxHpPct ?? 1)) return false;
  if (typeof slot.condition === 'function') {
    const tgt = arena.getValidTarget(p.id, p.def.targeting);
    return Boolean(slot.condition(p, tgt, arena));
  }
  return true;
}
