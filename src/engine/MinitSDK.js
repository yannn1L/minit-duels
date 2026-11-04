// ============================================================
// UNIVERSAL MINIT SDK & MOVEMENT / COMBAT TOOLKIT (ES Module)
// High-level helpers for custom Minit creators: Movement AI,
// Projectiles, Beams, Summons, Clones, Turrets, Shields & Phases
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { AudioSys } from './AudioSys.js';
import { MinitEngine } from './Registry.js';

/**
 * Helper to resolve all top-level and nested hooks on a Minit definition.
 */
export function invokeMinitHook(actor, hookName, ...args) {
  if (!actor || !actor.def) return undefined;
  const fn = actor.def.hooks?.[hookName] || actor.def[hookName];
  if (typeof fn === 'function') {
    try {
      return fn(actor, ...args);
    } catch (err) {
      console.warn(`[MinitSDK] Hook "${hookName}" on "${actor.def.id}" threw error:`, err);
    }
  }
  return undefined;
}

/**
 * Built-in Pluggable Movement AI Controller.
 * Supports: 'wander', 'chase', 'kite', 'orbit', 'strafe', 'stationary', 'teleport_step', 'custom'
 */
export function executeMovementAI(actor, arena) {
  const mov = actor.def.movement || { type: 'wander' };
  const movType = typeof mov === 'string' ? mov : mov.type || 'wander';
  const baseSpeed = actor.def.stats?.speed ?? 0.12;
  const slowMult = actor.slowTicks > 0 ? (actor.slowMult ?? 0.5) : 1.0;
  const spd = baseSpeed * slowMult;

  // If actor is mid-dash, let dash velocity govern movement
  if (actor.dashTicks > 0) {
    actor.dashTicks--;
    actor.x += actor.dx;
    actor.y += actor.dy;
    return;
  }

  // Custom movement hook override
  const customMoveFn = mov.onMove || actor.def.hooks?.onMove || actor.def.onMove;
  if (movType === 'custom' || typeof customMoveFn === 'function') {
    if (typeof customMoveFn === 'function') {
      const tgt = arena.getValidTarget(actor.team || actor.id, actor.def.targeting);
      customMoveFn(actor, tgt, arena);
    }
    actor.x += actor.dx;
    actor.y += actor.dy;
    return;
  }

  if (movType === 'stationary' || spd <= 0) {
    // Decay any residual knockback velocity smoothly
    actor.dx *= 0.75;
    actor.dy *= 0.75;
    if (Math.abs(actor.dx) < 0.005) actor.dx = 0;
    if (Math.abs(actor.dy) < 0.005) actor.dy = 0;
    actor.x += actor.dx;
    actor.y += actor.dy;
    return;
  }

  const tgt = arena.getValidTarget(actor.team || actor.id, actor.def.targeting);

  if (movType === 'chase' && tgt) {
    const dist = FastMath.dist(actor.x, actor.y, tgt.x, tgt.y);
    const stopDist = mov.stopDist ?? 0.6;
    const turnRate = mov.turnRate ?? 0.18;
    if (dist > stopDist) {
      MinitSDK.steerToward(actor, tgt.x, tgt.y, spd, turnRate);
    } else if (mov.weave !== false) {
      const ang = FastMath.angle(actor.x, actor.y, tgt.x, tgt.y) + Math.PI * 0.5;
      actor.dx = Math.cos(ang) * spd;
      actor.dy = Math.sin(ang) * spd;
    }
  } else if (movType === 'kite' && tgt) {
    const dist = FastMath.dist(actor.x, actor.y, tgt.x, tgt.y);
    const minDist = mov.minDist ?? 3.2;
    const maxDist = mov.maxDist ?? 5.5;
    const angToTgt = FastMath.angle(actor.x, actor.y, tgt.x, tgt.y);

    if (dist < minDist) {
      // Retreat away from enemy, steering slightly toward arena center so we don't corner-trap ourselves
      const centerX = (CFG.ARENA_BOUNDS.MIN_X + CFG.ARENA_BOUNDS.MAX_X) * 0.5;
      const centerY = (CFG.ARENA_BOUNDS.MIN_Y + CFG.ARENA_BOUNDS.MAX_Y) * 0.5;
      const angAway = angToTgt + Math.PI;
      const angCenter = FastMath.angle(actor.x, actor.y, centerX, centerY);
      const blendAng = Math.atan2(
        Math.sin(angAway) * 0.75 + Math.sin(angCenter) * 0.25,
        Math.cos(angAway) * 0.75 + Math.cos(angCenter) * 0.25
      );
      MinitSDK.steerAngle(actor, blendAng, spd, mov.turnRate ?? 0.22);
    } else if (dist > maxDist) {
      // Close in to firing range
      MinitSDK.steerAngle(actor, angToTgt, spd, mov.turnRate ?? 0.18);
    } else {
      // Strafe perpendicular at ideal range
      const dir = actor.state?._strafeDir || 1;
      const strafeAng = angToTgt + (Math.PI * 0.5) * dir;
      MinitSDK.steerAngle(actor, strafeAng, spd, 0.2);
    }
  } else if (movType === 'orbit') {
    const centerX =
      mov.around === 'center' || !tgt
        ? (CFG.ARENA_BOUNDS.MIN_X + CFG.ARENA_BOUNDS.MAX_X) * 0.5
        : tgt.x;
    const centerY =
      mov.around === 'center' || !tgt
        ? (CFG.ARENA_BOUNDS.MIN_Y + CFG.ARENA_BOUNDS.MAX_Y) * 0.5
        : tgt.y;
    const orbitRad = mov.radius ?? 3.4;
    const dir = mov.clockwise === false ? -1 : 1;
    const curAng = Math.atan2(actor.y - centerY, actor.x - centerX);
    const dist = FastMath.dist(actor.x, actor.y, centerX, centerY);
    const tangentAng = curAng + (Math.PI * 0.5) * dir;
    const radialCorrection = FastMath.clamp((orbitRad - dist) * 0.35, -0.6, 0.6);
    const desiredAng = tangentAng - radialCorrection * dir;
    MinitSDK.steerAngle(actor, desiredAng, spd, mov.turnRate ?? 0.25);
  } else if (movType === 'strafe' && tgt) {
    const angToTgt = FastMath.angle(actor.x, actor.y, tgt.x, tgt.y);
    const period = mov.switchInterval ?? 75;
    if (arena.totalTicks % period === 0 && actor.state) {
      actor.state._strafeDir = (actor.state._strafeDir || 1) * -1;
    }
    const dir = actor.state?._strafeDir || 1;
    const desiredAng = angToTgt + (Math.PI * 0.5) * dir;
    MinitSDK.steerAngle(actor, desiredAng, spd, 0.22);
  } else if (movType === 'teleport_step') {
    const interval = mov.interval ?? 90;
    if (arena.totalTicks > 0 && arena.totalTicks % interval === 0) {
      const margin = 1.5;
      const nx = FastMath.randRange(
        CFG.ARENA_BOUNDS.MIN_X + margin,
        CFG.ARENA_BOUNDS.MAX_X - margin
      );
      const ny = FastMath.randRange(
        CFG.ARENA_BOUNDS.MIN_Y + margin,
        CFG.ARENA_BOUNDS.MAX_Y - margin
      );
      MinitSDK.teleport(arena, actor, nx, ny, {
        color: actor.def.color,
        shockRad: 55,
        sound: mov.sound || 'pew'
      });
    }
    // Gentle drift between teleports
    const w = CFG.PHYSICS.WANDER;
    let a =
      actor.dx === 0 && actor.dy === 0
        ? FastMath.randRange(0, FastMath.TWO_PI)
        : Math.atan2(actor.dy, actor.dx);
    a += FastMath.randRange(-w, w);
    actor.dx = Math.cos(a) * (spd * 0.5);
    actor.dy = Math.sin(a) * (spd * 0.5);
  } else {
    // Default 'wander' physics
    const w = mov.wander ?? CFG.PHYSICS.WANDER;
    let a =
      actor.dx === 0 && actor.dy === 0
        ? FastMath.randRange(0, FastMath.TWO_PI)
        : Math.atan2(actor.dy, actor.dx);
    a += FastMath.randRange(-w, w);
    actor.dx = Math.cos(a) * spd;
    actor.dy = Math.sin(a) * spd;
  }

  actor.x += actor.dx;
  actor.y += actor.dy;
}

export const MinitSDK = {
  /**
   * Smoothly steers an actor's velocity toward a target angle.
   */
  steerAngle(actor, targetAngle, speed, turnRate = 0.2) {
    const curAngle =
      actor.dx === 0 && actor.dy === 0 ? targetAngle : Math.atan2(actor.dy, actor.dx);
    let diff = targetAngle - curAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const nextAngle = curAngle + FastMath.clamp(diff, -turnRate, turnRate);
    actor.dx = Math.cos(nextAngle) * speed;
    actor.dy = Math.sin(nextAngle) * speed;
  },

  /**
   * Smoothly steers an actor toward grid coordinates (targetX, targetY).
   */
  steerToward(actor, targetX, targetY, speed, turnRate = 0.2) {
    const targetAngle = FastMath.angle(actor.x, actor.y, targetX, targetY);
    this.steerAngle(actor, targetAngle, speed, turnRate);
  },

  /**
   * Instantly teleports an actor to grid coordinates (x, y) with departure/arrival VFX.
   */
  teleport(arena, actor, x, y, options = {}) {
    if (!actor || actor.hp <= 0) return;
    const oldPx = actor.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const oldPy = actor.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

    actor.x = FastMath.clamp(x, CFG.ARENA_BOUNDS.MIN_X, CFG.ARENA_BOUNDS.MAX_X);
    actor.y = FastMath.clamp(y, CFG.ARENA_BOUNDS.MIN_Y, CFG.ARENA_BOUNDS.MAX_Y);

    const newPx = actor.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const newPy = actor.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

    if (!arena.isHeadless) {
      const col = options.color || actor.def?.color || 0x00e5ff;
      arena.fxPool.spawnShockwave(oldPx, oldPy, col, options.shockRad || 45, 3);
      arena.fxPool.spawnShockwave(newPx, newPy, col, options.shockRad || 55, 3);
      for (let i = 0; i < (options.particleCount ?? 8); i++) {
        arena.fxPool.spawnPhysics(
          options.particleTex || 'fx_spark',
          newPx,
          newPy,
          FastMath.randRange(-3, 3),
          FastMath.randRange(-3, 3),
          12,
          0.88,
          0.88,
          true,
          col
        );
      }
      if (options.sound) AudioSys.play(options.sound, 0.5);
      if (actor.spr) {
        actor.spr.x = newPx;
        actor.spr.y = newPy;
      }
    }
  },

  /**
   * Propels an actor in a high-speed dash along an angle or toward a target actor/point.
   */
  dash(arena, actor, targetOrAngle, speed = 0.32, durationTicks = 15, options = {}) {
    if (!actor || actor.hp <= 0) return;
    let angle = 0;
    if (typeof targetOrAngle === 'number') {
      angle = targetOrAngle;
    } else if (targetOrAngle && typeof targetOrAngle.x === 'number') {
      angle = FastMath.angle(actor.x, actor.y, targetOrAngle.x, targetOrAngle.y);
    } else {
      angle = Math.atan2(actor.dy || 0, actor.dx || 1);
    }

    actor.dx = Math.cos(angle) * speed;
    actor.dy = Math.sin(angle) * speed;
    actor.dashTicks = Math.max(actor.dashTicks || 0, durationTicks);

    const bS = actor.baseScale || 1.0;
    if (actor.aS) {
      actor.aS.tX = bS * 1.35;
      actor.aS.tY = bS * 0.75;
    }
    if (!arena.isHeadless && options.sound) {
      AudioSys.play(options.sound, 0.6);
    }
  },

  /**
   * Fires one or more customizable projectiles without requiring boilerplate traits.
   */
  shootProjectile(arena, owner, options = {}) {
    if (!owner || owner.hp <= 0) return;
    const tgt =
      options.target ||
      arena.getValidTarget(owner.team || owner.id, owner.def?.targeting || { type: 'closest_enemy' });

    const baseAngle =
      options.angle !== undefined
        ? options.angle
        : tgt
          ? FastMath.angle(owner.x, owner.y, tgt.x, tgt.y)
          : Math.atan2(owner.dy || 0, owner.dx || 1);

    const count = options.count ?? 1;
    const spread = options.spread ?? 0;
    const speed = options.speed ?? 0.38;
    const life = options.life ?? 55;
    const color = options.color ?? owner.def?.color ?? 0x00e5ff;

    if (options.sound && !arena.isHeadless) {
      AudioSys.play(options.sound, options.soundVol ?? 0.6);
    }

    for (let i = 0; i < count; i++) {
      let ang = baseAngle;
      if (count > 1 && options.evenSpread !== false) {
        ang = baseAngle + (i - (count - 1) * 0.5) * (spread || 0.2);
      } else if (spread > 0) {
        ang = baseAngle + FastMath.randRange(-spread, spread);
      }

      const traits = options.traits ? [...options.traits] : ['sdkProjectile'];
      if (options.bounce && !traits.includes('moveAndBounce')) {
        traits.unshift('moveAndBounce');
      }
      if (!traits.includes('ageLife')) {
        traits.push('ageLife');
      }

      arena.spawnEnt({
        x: options.x ?? owner.x,
        y: options.y ?? owner.y,
        dx: Math.cos(ang) * speed,
        dy: Math.sin(ang) * speed,
        l: life,
        traits,
        p: {
          ownerId: owner.team || owner.id,
          sourceActorId: owner.id,
          color,
          isProjectile: options.isProjectile !== false,
          sdkProjCfg: {
            dmg: options.dmg ?? owner.def?.payload?.dmg ?? 30,
            radius: options.radius ?? options.zoneRadius ?? 1.1,
            speed,
            homing: options.homing ?? false,
            turnRate: options.turnRate ?? 0.08,
            bounce: Boolean(options.bounce),
            pierce: Boolean(options.pierce),
            destroyOnHit: options.pierce ? false : (options.destroyOnHit ?? true),
            knockbackForce: options.knockbackForce ?? 0,
            tex: options.tex || options.particleTex || 'fx_spark',
            trailTex: options.trailTex || null,
            tint: options.tint ?? color,
            debuff: options.debuff || null,
            hitVfx: options.hitVfx || owner.def?.payload?.hitVfx || {
              shake: 3,
              flash: 0.1,
              particleCount: 5,
              sound: 'hit',
              playSound: true
            },
            onTick: options.onTick || null,
            onHit: options.onHit || null,
            onExpire: options.onExpire || null
          },
          payload: {
            dmg: options.dmg ?? owner.def?.payload?.dmg ?? 30,
            zoneRadius: options.radius ?? options.zoneRadius ?? 1.1,
            destroyOnHit: options.pierce ? false : (options.destroyOnHit ?? true),
            knockbackForce: options.knockbackForce ?? 0,
            hitVfx: options.hitVfx || owner.def?.payload?.hitVfx
          }
        }
      });
    }
  },

  /**
   * Fires a glowing multi-layered vector laser beam using `modularBeam`.
   */
  fireBeam(arena, owner, options = {}) {
    if (!owner || owner.hp <= 0) return;
    if (options.sound && !arena.isHeadless) {
      AudioSys.play(options.sound, 0.7);
    }
    const color = options.color ?? owner.def?.color ?? 0x00e5ff;
    arena.spawnEnt({
      x: owner.x,
      y: owner.y,
      l: options.life ?? 40,
      traits: ['modularBeam'],
      p: {
        ownerId: owner.team || owner.id,
        color,
        beamConfig: {
          trackTarget: options.trackTarget ?? false,
          aimAngle: options.aimAngle,
          beamLength: options.beamLength ?? 460,
          coreColor: options.coreColor ?? 0xffffff,
          sheathColor: options.sheathColor ?? color,
          glowColor: options.glowColor ?? color,
          coreWidth: options.coreWidth ?? 5,
          sheathWidth: options.sheathWidth ?? 13,
          glowWidth: options.glowWidth ?? 26,
          hasLightning: options.hasLightning !== false,
          lightningColor: options.lightningColor ?? 0xffffff,
          recoilForce: options.recoilForce ?? 0.01,
          tickRate: options.tickRate ?? 4,
          damage: options.dmg ?? options.damage ?? 14,
          rampingDamage: options.rampingDamage ?? 0,
          knockbackForce: options.knockbackForce ?? 0.3,
          sparkTex: options.sparkTex || 'fx_spark',
          hitSound: options.hitSound || 'hit'
        }
      }
    });
  },

  /**
   * Deals instant AOE damage around grid coordinates (x, y) to opposing fighters & summons.
   */
  dealAreaDamage(arena, owner, x, y, radius = 2.0, dmg = 45, options = {}) {
    const ownerTeam = owner?.team || owner?.id;
    const dMult = owner?.dmgMult || 1.0;
    const radSq = radius * radius;
    const color = options.color ?? owner?.def?.color ?? 0x00e5ff;

    const pX = x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const pY = y * CFG.GRID.TS + CFG.GRID.HALF_TS;

    if (!arena.isHeadless) {
      if (options.shockwave !== false) {
        arena.fxPool.spawnShockwave(pX, pY, color, options.shockRad || radius * CFG.GRID.TS * 2.2, 4);
      }
      if (options.sound) {
        AudioSys.play(options.sound, 0.7);
      }
    }

    const targets = arena.getOpposingActors(ownerTeam);
    for (let i = 0; i < targets.length; i++) {
      const tgt = targets[i];
      if (tgt.hp > 0 && FastMath.distSq(x, y, tgt.x, tgt.y) <= radSq) {
        arena.damageActor(
          tgt,
          {
            dmg: dmg * dMult,
            hitVfx: options.hitVfx || {
              shake: 5,
              flash: 0.15,
              particleCount: 6,
              sound: 'hit',
              playSound: true
            },
            knockback: options.knockbackForce
              ? { fromX: x, fromY: y, force: options.knockbackForce, shake: 5 }
              : null
          },
          color,
          owner
        );
      }
    }
  },

  /**
   * Heals a fighter or summon up to maxHp.
   */
  heal(arena, actor, amount, options = {}) {
    if (!actor || actor.hp <= 0 || amount <= 0) return 0;
    const prev = actor.hp;
    actor.hp = Math.min(actor.maxHp, actor.hp + amount);
    const healed = actor.hp - prev;
    if (healed >= 1 && !arena.isHeadless && options.showText !== false) {
      const pX = actor.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = actor.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      arena.fxPool.spawnDmgText(pX, pY, healed, options.color || 0x00ff66, 0.95);
    }
    return healed;
  },

  /**
   * Grants absorption shield points to a fighter or summon.
   */
  addShield(arena, actor, amount, maxShield = null) {
    if (!actor || actor.hp <= 0 || amount <= 0) return;
    if (maxShield !== null) {
      actor.maxShield = Math.max(actor.maxShield || 0, maxShield);
    } else if (!actor.maxShield) {
      actor.maxShield = Math.max(actor.maxHp * 0.5, amount);
    }
    actor.shield = Math.min(actor.maxShield, (actor.shield || 0) + amount);
  },

  /**
   * Applies a status condition (stun, slow, invulnerability, or DoT debuff) to an actor.
   */
  applyStatus(arena, owner, target, statusCfg = {}) {
    if (!target || target.hp <= 0) return;
    if (statusCfg.stunTicks) {
      target.stunTicks = Math.max(target.stunTicks || 0, statusCfg.stunTicks);
    }
    if (statusCfg.slowTicks) {
      target.slowTicks = Math.max(target.slowTicks || 0, statusCfg.slowTicks);
      target.slowMult = statusCfg.slowMult ?? 0.5;
    }
    if (statusCfg.invulnTicks) {
      target.invulnTicks = Math.max(target.invulnTicks || 0, statusCfg.invulnTicks);
    }
    if (statusCfg.dmg && statusCfg.duration) {
      const debuffId = statusCfg.id || 'custom_dot';
      if (!target.debuffs[debuffId]) {
        target.debuffs[debuffId] = true;
        arena.spawnEnt({
          x: target.x,
          y: target.y,
          l: statusCfg.duration,
          traits: ['statusEffect'],
          p: {
            targetId: target.id,
            ownerId: owner?.team || owner?.id,
            color: statusCfg.color || owner?.def?.color || 0xff0055,
            payload: {
              id: debuffId,
              icon: statusCfg.icon || 'icon_poison',
              dmg: statusCfg.dmg,
              tick: statusCfg.tickRate || 10,
              vfxTex: statusCfg.vfxTex || 'fx_spark'
            }
          }
        });
      }
    }
  },

  /**
   * Transitions a fighter into a new phase or stance mid-battle (updating stats, sprite, movement, or actions).
   */
  setPhase(arena, owner, phasePatch = {}) {
    if (!owner || owner.hp <= 0) return;
    if (phasePatch.name) {
      owner.currentPhase = phasePatch.name;
    }
    if (phasePatch.color !== undefined) {
      owner.def.color = phasePatch.color;
    }
    if (phasePatch.texture && !arena.isHeadless) {
      const tex =
        arena.textures[phasePatch.texture] ||
        arena.textures[`minit_${owner.def.id}_${phasePatch.texture}`];
      if (tex && owner.spr) owner.spr.texture = tex;
    }
    if (phasePatch.stats) {
      Object.assign(owner.def.stats, phasePatch.stats);
      if (phasePatch.stats.hpAdd) {
        owner.maxHp += phasePatch.stats.hpAdd;
        owner.hp += phasePatch.stats.hpAdd;
      }
      if (phasePatch.stats.shieldAdd) {
        this.addShield(arena, owner, phasePatch.stats.shieldAdd);
      }
    }
    if (phasePatch.movement) {
      owner.def.movement =
        typeof phasePatch.movement === 'string'
          ? { type: phasePatch.movement }
          : { ...phasePatch.movement };
    }
    if (phasePatch.action) {
      owner.def.action = { ...phasePatch.action };
      owner.actionSlots = arena._buildActionSlots(owner.def);
    }
    if (phasePatch.actions) {
      owner.def.actions = [...phasePatch.actions];
      owner.actionSlots = arena._buildActionSlots(owner.def);
    }
    if (phasePatch.hooks) {
      owner.def.hooks = { ...(owner.def.hooks || {}), ...phasePatch.hooks };
    }
    if (!arena.isHeadless && phasePatch.vfx !== false) {
      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      arena.fxPool.spawnShockwave(pX, pY, owner.def.color, 95, 5);
      if (phasePatch.sound) AudioSys.play(phasePatch.sound, 0.8);
    }
  },

  /**
   * Spawns a destroyable Summon / Minion / Clone / Turret unit into `arena.summons`.
   */
  spawnSummon(arena, owner, cfg = {}) {
    return arena.spawnSummon(owner, cfg);
  },

  /**
   * Spawns a Clone of the owner Minit with a fraction of HP and damage.
   */
  spawnClone(arena, owner, cfg = {}) {
    if (!owner || owner.hp <= 0) return null;
    const hpPct = cfg.hpPct ?? 0.35;
    return arena.spawnSummon(owner, {
      name: cfg.name || `${owner.def.name} Clone`,
      x: cfg.x ?? owner.x + FastMath.randRange(-1.2, 1.2),
      y: cfg.y ?? owner.y + FastMath.randRange(-1.2, 1.2),
      hp: cfg.hp ?? Math.max(80, Math.round(owner.maxHp * hpPct)),
      speed: cfg.speed ?? owner.def.stats.speed,
      scale: cfg.scale ?? 0.8,
      color: cfg.color ?? owner.def.color,
      texture: cfg.texture || `minit_${owner.def.id}_base`,
      life: cfg.life ?? 360,
      dmgMult: cfg.dmgMult ?? 0.5,
      movement: cfg.movement || owner.def.movement || { type: 'wander' },
      action: cfg.action || owner.def.action,
      contactDmg: cfg.contactDmg ?? 0
    });
  },

  /**
   * Spawns a stationary Turret unit that fires at enemies.
   */
  spawnTurret(arena, owner, cfg = {}) {
    if (!owner || owner.hp <= 0) return null;
    return arena.spawnSummon(owner, {
      name: cfg.name || 'Turret',
      x: cfg.x ?? owner.x,
      y: cfg.y ?? owner.y,
      hp: cfg.hp ?? 280,
      speed: 0,
      scale: cfg.scale ?? 0.85,
      color: cfg.color ?? owner.def.color,
      texture: cfg.texture || `minit_${owner.def.id}_base`,
      life: cfg.life ?? 420,
      movement: { type: 'stationary' },
      action: cfg.action || {
        cd: cfg.cd ?? 45,
        onExecute: (turret, tgt, a) => {
          MinitSDK.shootProjectile(a, turret, {
            target: tgt,
            dmg: cfg.dmg ?? 22,
            speed: cfg.projSpeed ?? 0.45,
            life: cfg.projLife ?? 45,
            color: turret.def.color,
            sound: cfg.sound || 'pew'
          });
        }
      }
    });
  },

  /**
   * Spawns a projectile-blocking Shield / Barrier zone or orbital shield.
   */
  spawnBarrier(arena, owner, cfg = {}) {
    if (!owner || owner.hp <= 0) return;
    const color = cfg.color ?? owner.def?.color ?? 0x00e5ff;
    arena.spawnEnt({
      x: cfg.x ?? owner.x,
      y: cfg.y ?? owner.y,
      l: cfg.life ?? 180,
      traits: ['sdkBarrier', 'ageLife'],
      p: {
        ownerId: owner.team || owner.id,
        sourceActorId: owner.id,
        color,
        isBarrier: true,
        barrierCfg: {
          radius: cfg.radius ?? 1.4,
          hp: cfg.hp ?? 250,
          maxHp: cfg.hp ?? 250,
          followOwner: cfg.followOwner ?? true,
          orbitRadius: cfg.orbitRadius ?? 0,
          orbitSpeed: cfg.orbitSpeed ?? 0.08,
          orbitAngle: cfg.orbitAngle ?? 0,
          blocksProjectiles: cfg.blocksProjectiles !== false,
          reflectProjectiles: Boolean(cfg.reflectProjectiles),
          pushEnemies: Boolean(cfg.pushEnemies),
          contactDmg: cfg.contactDmg ?? 0,
          tickRate: cfg.tickRate ?? 10
        }
      }
    });
  }
};
