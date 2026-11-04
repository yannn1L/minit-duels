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

const NOOP_FN = () => {};
const HEADLESS_FX_POOL = {
  initTex: NOOP_FN,
  spawnPhysics: NOOP_FN,
  spawnShockwave: NOOP_FN,
  spawnDmgText: NOOP_FN,
  update: NOOP_FN,
  act: { phys: [], sws: [], txts: [] },
  pool: { phys: [], sws: [], txts: [] }
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
    this.hitStop = 0;
    this.totalTicks = 0;
    this.combatLog = [];
    this.summons = [];
    this._summonCounter = 0;
    this.SDK = MinitSDK;

    const AW = CFG.GRID.COLS * CFG.GRID.TS;
    const AH = CFG.GRID.ROWS * CFG.GRID.TS;

    if (!this.isHeadless) {
      this.view = new PIXI.Container();
      this.addChild(this.view);

      // Background Arena Board with crisp borders
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

      this.summonLayer = new PIXI.Container();
      this.layer.addChild(this.summonLayer);
    }

    // Players
    this.players = [];
    this.playerMap = {};

    pIds.forEach((id, idx) => {
      const md = MinitEngine.Registry.getMinit(id) || MinitEngine.Registry.minits[id];
      let spr;
      if (!this.isHeadless) {
        const tex = this.textures[`minit_${id}_base`];
        spr = new PIXI.Sprite(tex || PIXI.Texture.WHITE);
        spr.anchor.set(0.5);
        this.layer.addChild(spr);
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
        baseScale: initialScale,
        dmgMult: 1.0,
        aS: { x: initialScale, y: initialScale, tX: initialScale, tY: initialScale },
        fT: 0,
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
      this.fA = Math.max(this.fA, a);
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
    if (shake && !this.isHeadless) this.shake = Math.max(this.shake, shake);
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

    if (!this.isHeadless) {
      const popupColor = shieldAbsorbed > 0 && actualHpDmg === 0 ? 0x00e5ff : fxC;
      if (vfx.showText !== false) {
        this.fxPool.spawnDmgText(pX, pY, totalEffectiveDmg, popupColor, vfx.textScale || 1.0);
      }
      if (vfx.playSound !== false) {
        AudioSys.play(vfx.sound || 'hit', 0.6);
      }
    }

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
    }

    const bS = p.baseScale || 1.0;
    if (p.aS) {
      p.aS.tX = bS * CFG.JUICE.HIT.tX;
      p.aS.tY = bS * CFG.JUICE.HIT.tY;
    }

    if (!this.isHeadless) {
      if (p.fT <= 0) p.fT = vfx.unitFlashDur ?? CFG.JUICE.HIT_FLASH_DUR;
      if (vfx.shake) this.shake = Math.max(this.shake, vfx.shake);
      if (vfx.flash) this.triggerFlash(vfx.flash);
      if (vfx.hitStop) this.hitStop = Math.max(this.hitStop, vfx.hitStop);

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
        if (!p.isSummon && dVfx.flash) this.triggerFlash(dVfx.flash);
        if (dVfx.shake) this.shake = Math.max(this.shake, p.isSummon ? 4 : dVfx.shake);
        if (!p.isSummon) {
          this.hitStop = Math.max(this.hitStop, dVfx.hitStop || CFG.JUICE.DEATH_HIT_STOP);
        }
        this.fxPool.spawnShockwave(
          pX,
          pY,
          p.def.color,
          p.isSummon ? 45 : dVfx.shockRad || CFG.VFX.DEATH.SHOCK_RAD,
          p.isSummon ? 3 : 6
        );

        const dpC = p.isSummon ? 8 : (dVfx.particleCount ?? CFG.VFX.DEATH.PARTICLE_COUNT);
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

  // Backward-compatible wrapper used by existing Minit traits
  damagePlayer(pid, payload = {}, fxC) {
    return this.damageActor(pid, payload, fxC);
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

  update(tS) {
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

    // Status timer countdowns
    if (p.stunTicks > 0) p.stunTicks--;
    if (p.slowTicks > 0) p.slowTicks--;
    if (p.invulnTicks > 0) p.invulnTicks--;

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

    const bS = p.baseScale || 1.0;

    // Arena Boundary Collisions & `onWallBounce` Hook
    if (p.x < CFG.ARENA_BOUNDS.MIN_X || p.x > CFG.ARENA_BOUNDS.MAX_X) {
      p.x = FastMath.clamp(p.x, CFG.ARENA_BOUNDS.MIN_X, CFG.ARENA_BOUNDS.MAX_X);
      p.dx *= CFG.PHYSICS.BOUNCE;
      if (p.aS) {
        p.aS.tX = bS * CFG.JUICE.BOUNCE_X.tX;
        p.aS.tY = bS * CFG.JUICE.BOUNCE_X.tY;
      }
      if (!this.isHeadless && !p.isSummon) AudioSys.play('hit', 0.2);
      invokeMinitHook(p, 'onWallBounce', 'x', this);
    }
    if (p.y < CFG.ARENA_BOUNDS.MIN_Y || p.y > CFG.ARENA_BOUNDS.MAX_Y) {
      p.y = FastMath.clamp(p.y, CFG.ARENA_BOUNDS.MIN_Y, CFG.ARENA_BOUNDS.MAX_Y);
      p.dy *= CFG.PHYSICS.BOUNCE;
      if (p.aS) {
        p.aS.tX = bS * CFG.JUICE.BOUNCE_Y.tX;
        p.aS.tY = bS * CFG.JUICE.BOUNCE_Y.tY;
      }
      if (!this.isHeadless && !p.isSummon) AudioSys.play('hit', 0.2);
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
                hitVfx: { shake: 2, flash: 0, particleCount: 3, playSound: true }
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

  updateVisuals(tS) {
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

      // Draw Fighter Shields & Stun Indicators
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.hp <= 0) continue;
        const pX = p.spr.x;
        const pY = p.spr.y;

        if (p.shield > 0) {
          const shieldAlpha = 0.35 + 0.15 * Math.sin(this.totalTicks * 0.15);
          this.unitOverlayGfx
            .lineStyle(1.5, 0x00e5ff, shieldAlpha + 0.25)
            .beginFill(0x00e5ff, shieldAlpha * 0.3)
            .drawCircle(pX, pY, 13 * (p.baseScale || 1))
            .endFill();
        }
        if (p.invulnTicks > 0) {
          this.unitOverlayGfx
            .lineStyle(1.5, 0xffdd00, 0.85)
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
          .lineStyle(2, col, 0.75 * hpRatio)
          .beginFill(col, 0.14 * hpRatio)
          .drawCircle(bX, bY, radPx)
          .endFill();
      }
    }

    this.fxPool.update(tS);
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

  _updateActorSprite(p, tS) {
    if (!p.spr) return;
    if (p.hp <= 0) {
      p.spr.visible = false;
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

    if (p.fT > 0) {
      p.fT -= tS;
      p.spr.tint = CFG.JUICE.HIT_FLASH_COLOR;
    } else {
      p.spr.tint = 0xffffff;
    }
  }

  destroy(options) {
    if (this.beamRenderer) {
      this.beamRenderer.clear();
    }
    super.destroy(options);
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
