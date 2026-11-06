// ============================================================
// TARGETING & TRAIT BEHAVIORS (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { AudioSys } from './AudioSys.js';
import { MinitEngine } from './Registry.js';

export function registerTraitsAndTargeting() {
  // ============================================================
  // TARGETING BEHAVIORS
  // ============================================================

  // Target the closest enemy (fighter or summon)
  MinitEngine.Registry.addTargeting('closest_enemy', (owner, arena) => {
    const ownerTeam = owner.team || owner.id;
    const enemies = arena.getOpposingActors ? arena.getOpposingActors(ownerTeam) : arena.players;
    let closestTarget = null;
    let minDistSq = Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const actor = enemies[i];
      if ((actor.team || actor.id) !== ownerTeam && actor.hp > 0 && !actor.untargetable) {
        const dSq = FastMath.distSq(owner.x, owner.y, actor.x, actor.y);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closestTarget = actor;
        }
      }
    }
    return closestTarget;
  });

  // Target the farthest enemy
  MinitEngine.Registry.addTargeting('farthest_enemy', (owner, arena) => {
    const ownerTeam = owner.team || owner.id;
    const enemies = arena.getOpposingActors ? arena.getOpposingActors(ownerTeam) : arena.players;
    let farthest = null;
    let maxDistSq = -1;

    for (let i = 0; i < enemies.length; i++) {
      const actor = enemies[i];
      if ((actor.team || actor.id) !== ownerTeam && actor.hp > 0 && !actor.untargetable) {
        const dSq = FastMath.distSq(owner.x, owner.y, actor.x, actor.y);
        if (dSq > maxDistSq) {
          maxDistSq = dSq;
          farthest = actor;
        }
      }
    }
    return farthest;
  });

  // Target lowest HP enemy
  MinitEngine.Registry.addTargeting('lowest_hp', (owner, arena) => {
    const ownerTeam = owner.team || owner.id;
    const enemies = arena.getOpposingActors ? arena.getOpposingActors(ownerTeam) : arena.players;
    let best = null;
    let minHp = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const actor = enemies[i];
      if ((actor.team || actor.id) !== ownerTeam && actor.hp > 0 && !actor.untargetable) {
        if (actor.hp < minHp) {
          minHp = actor.hp;
          best = actor;
        }
      }
    }
    return best;
  });

  // Target highest HP enemy
  MinitEngine.Registry.addTargeting('highest_hp', (owner, arena) => {
    const ownerTeam = owner.team || owner.id;
    const enemies = arena.getOpposingActors ? arena.getOpposingActors(ownerTeam) : arena.players;
    let best = null;
    let maxHp = -1;
    for (let i = 0; i < enemies.length; i++) {
      const actor = enemies[i];
      if ((actor.team || actor.id) !== ownerTeam && actor.hp > 0 && !actor.untargetable) {
        if (actor.hp > maxHp) {
          maxHp = actor.hp;
          best = actor;
        }
      }
    }
    return best;
  });

  // Target a random enemy
  MinitEngine.Registry.addTargeting('random_enemy', (owner, arena) => {
    const ownerTeam = owner.team || owner.id;
    const pool = arena.getOpposingActors ? arena.getOpposingActors(ownerTeam) : arena.players;
    const enemies = pool.filter(
      (p) => (p.team || p.id) !== ownerTeam && p.hp > 0 && !p.untargetable
    );
    return enemies.length > 0 ? enemies[(FastMath.rand() * enemies.length) | 0] : null;
  });

  // ============================================================
  // ENTITY TRAITS
  // ============================================================

  // Move entity and bounce off arena walls
  MinitEngine.Registry.addTrait('moveAndBounce', (entity, arena) => {
    entity.curX += entity.dx;
    entity.curY += entity.dy;

    // X-axis boundary collision
    if (entity.curX < CFG.ARENA_BOUNDS.MIN_X || entity.curX > CFG.ARENA_BOUNDS.MAX_X) {
      const hitLeft = entity.curX < CFG.ARENA_BOUNDS.MIN_X;
      entity.curX = Math.max(CFG.ARENA_BOUNDS.MIN_X, Math.min(entity.curX, CFG.ARENA_BOUNDS.MAX_X));
      entity.dx *= CFG.PHYSICS.BOUNCE;
      arena.shake = Math.max(arena.shake, entity.p?.vfx?.shake || 0);
      AudioSys.play('hit', 0.2);
      if (!arena.isHeadless) {
        const wX = hitLeft ? 0 : CFG.GRID.COLS * CFG.GRID.TS;
        const wY = entity.curY * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const col = entity.p?.color || 0x00e5ff;
        if (arena.spawnWallRipple) arena.spawnWallRipple(hitLeft ? 'left' : 'right', wX, wY, col);
        arena.fxPool.spawnSparkBurst(wX, wY, hitLeft ? 0 : Math.PI, col, 3, 2.2, 0.7, 12);
      }
    }

    // Y-axis boundary collision
    if (entity.curY < CFG.ARENA_BOUNDS.MIN_Y || entity.curY > CFG.ARENA_BOUNDS.MAX_Y) {
      const hitTop = entity.curY < CFG.ARENA_BOUNDS.MIN_Y;
      entity.curY = Math.max(CFG.ARENA_BOUNDS.MIN_Y, Math.min(entity.curY, CFG.ARENA_BOUNDS.MAX_Y));
      entity.dy *= CFG.PHYSICS.BOUNCE;
      arena.shake = Math.max(arena.shake, entity.p?.vfx?.shake || 0);
      AudioSys.play('hit', 0.2);
      if (!arena.isHeadless) {
        const wX = entity.curX * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const wY = hitTop ? 0 : CFG.GRID.ROWS * CFG.GRID.TS;
        const col = entity.p?.color || 0x00e5ff;
        if (arena.spawnWallRipple) arena.spawnWallRipple(hitTop ? 'top' : 'bottom', wX, wY, col);
        arena.fxPool.spawnSparkBurst(
          wX,
          wY,
          hitTop ? Math.PI * 0.5 : -Math.PI * 0.5,
          col,
          3,
          2.2,
          0.7,
          12
        );
      }
    }

    entity.x = entity.curX;
    entity.y = entity.curY;
  });

  // Decrease entity lifespan and mark as dead when expired
  MinitEngine.Registry.addTrait('ageLife', (entity) => {
    if (--entity.l <= 0) entity.dead = true;
  });

  // Spawn particle trail & additive afterimage behind moving entity
  MinitEngine.Registry.addTrait('trailParticles', (entity, arena) => {
    const posX = (entity.curX ?? entity.x) * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const posY = (entity.curY ?? entity.y) * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const col = entity.p?.color || 0x00e5ff;

    if (entity.p?.vfx?.trailTex) {
      // Main projectile head + soft additive halo
      arena.fxPool.spawnPhysics(
        entity.p.vfx.trailTex,
        posX,
        posY,
        entity.p.vfx.trailVx || -entity.dx * 0.6,
        entity.p.vfx.trailVy || -entity.dy * 0.6,
        entity.l % 2 === 0 ? 11 : 4,
        entity.p.vfx.trailDragX || 0.9,
        entity.p.vfx.trailDragY || 0.9,
        true,
        0xffffff,
        1.0,
        { additive: true, grav: 0 }
      );
      if (entity.l % 3 === 0) {
        arena.fxPool.spawnGlow(posX, posY, col, 0.55, 8, 0.38);
      }
    }
  });

  // Apply Status effect (poison, etc.)
  MinitEngine.Registry.addTrait('statusEffect', (e, a) => {
    const tgt = a.players.find((p) => p.id === e.p.targetId);
    const pay = e.p.payload;
    const owner = a.players.find((p) => p.id === e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;

    if (!tgt || tgt.hp <= 0) {
      if (tgt) tgt.debuffs[pay.id] = false;
      e.dead = true;
      return;
    }

    e.x = tgt.x;
    e.y = tgt.y;
    if (pay.icon) tgt.activeStatuses.add(pay.icon);

    if (e.l % (pay.vfxTick || 5) === 0 && (pay.vfxTex || e.p.color)) {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics(
        pay.vfxTex || 'fx_ember',
        pX + FastMath.randRange(-8, 8),
        pY + FastMath.randRange(-8, 8),
        FastMath.randRange(-0.3, 0.3),
        -1.1,
        16,
        0.95,
        0.95,
        true,
        pay.vfxTex ? 0xffffff : e.p.color || 0x00ff44,
        0.9,
        { additive: true, grav: -0.05 }
      );
    }

    if (e.l % pay.tick === 0) {
      const finalDmg = pay.dmg * dMult;
      a.damagePlayer(
        tgt.id,
        {
          dmg: finalDmg,
          hitVfx: pay.hitVfx || {
            particleCount: 0,
            playSound: false,
            showText: true,
            shake: 0,
            flash: 0,
            hitStop: 0
          }
        },
        e.p.color
      );
    }

    if (--e.l <= 0) {
      tgt.debuffs[pay.id] = false;
      e.dead = true;
    }
  });

  // TRAIT DRAIN: Apply Debuff / Damage to Enemies inside zone
  MinitEngine.Registry.addTrait('drainEnemyStats', (e, a) => {
    const pay = e.p.payload.drain;
    if (!pay) return;

    e.p.leechSuccess = false;
    const owner = a.playerMap?.[e.p.ownerId] || a.players.find((pl) => pl.id === e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;

    const tickRate = e.p.payload.tickRate || 10;
    const isTick = e.l % tickRate === 0;
    const zoneRadius = e.p.payload.zoneRadius || 1.5;
    const zoneRadSq = zoneRadius * zoneRadius;

    for (let pIdx = 0; pIdx < a.players.length; pIdx++) {
      const p = a.players[pIdx];
      if (
        p.id !== e.p.ownerId &&
        p.hp > 0 &&
        FastMath.distSq(p.x, p.y, e.x, e.y) <= zoneRadSq
      ) {
        e.p.leechSuccess = true;

        if (pay.speed) {
          p.x -= p.dx * pay.speed;
          p.y -= p.dy * pay.speed;
        }

        if (isTick) {
          if (pay.cd && p.t > 0) p.t -= pay.cd;
          if (pay.scale) p.baseScale = Math.max(pay.minScale || 0.5, (p.baseScale || 1.0) - pay.scale);
          if (pay.dmgMult) p.dmgMult = Math.max(pay.minDmgMult || 0.5, (p.dmgMult || 1.0) - pay.dmgMult);

          if (pay.hp) {
            const finalDmg = pay.hp * dMult;
            a.damagePlayer(
              p.id,
              {
                dmg: finalDmg,
                hitVfx: pay.hitVfx || { flash: 0, shake: 0, particleCount: 1, playSound: false }
              },
              e.p.color
            );

            if (owner && pay.vfxLeech) {
              const tX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const tY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const ang = Math.atan2(oY - tY, oX - tX);
              a.fxPool.spawnPhysics(
                pay.vfxLeech,
                tX,
                tY,
                Math.cos(ang) * 6,
                Math.sin(ang) * 6,
                15,
                1,
                1,
                true,
                pay.vfxLeechColor || 0xffaa00
              );
            }
          }
        }
      }
    }
  });

  // TRAIT BUFF: Boost owner stats if drain was successful
  MinitEngine.Registry.addTrait('buffOwnerStats', (e, a) => {
    if (!e.p.leechSuccess) return;

    const owner = a.players.find((p) => p.id === e.p.ownerId);
    const pay = e.p.payload.buff;

    if (!owner || owner.hp <= 0 || !pay) return;
    const tickRate = e.p.payload.tickRate || 10;
    const isTick = e.l % tickRate === 0;

    if (pay.speed) {
      owner.x += owner.dx * pay.speed;
      owner.y += owner.dy * pay.speed;
    }

    if (isTick) {
      if (pay.cd) owner.t += pay.cd;

      if (pay.dmgMult && (owner.dmgMult || 1.0) < (pay.maxDmgMult || 5.0)) {
        owner.dmgMult = Math.min(pay.maxDmgMult || 5.0, (owner.dmgMult || 1.0) + pay.dmgMult);
      }

      if (pay.scale && (owner.baseScale || 1.0) < (pay.maxScale || 3.0)) {
        owner.baseScale = Math.min(pay.maxScale || 3.0, (owner.baseScale || 1.0) + pay.scale);
        owner.aS.tX = owner.baseScale * 1.3;
        owner.aS.tY = owner.baseScale * 1.3;
        if (owner.fT <= 0) owner.fT = 2;
      }

      if (pay.hp && owner.hp < owner.maxHp) {
        const healAmt = Math.min(owner.maxHp - owner.hp, pay.hp);
        owner.hp += healAmt;
        const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        a.fxPool.spawnDmgText(oX, oY, healAmt, 0x00ff55, 1.0, { isHeal: true });
      }

      if (pay.sound) AudioSys.play(pay.sound);
    }
  });

  // Universal: Lob projectile to random area
  MinitEngine.Registry.addTrait('lobToRandomArea', (e, a) => {
    const lob = e.p.payload.lob;
    if (!e.p.hasTarget) {
      const radius = e.p.payload.zoneRadius || 0;
      const minX = CFG.ARENA_BOUNDS.MIN_X + radius;
      const maxX = CFG.ARENA_BOUNDS.MAX_X - radius;
      const minY = CFG.ARENA_BOUNDS.MIN_Y + radius;
      const maxY = CFG.ARENA_BOUNDS.MAX_Y - radius;

      e.p.targetX = minX + Math.random() * (maxX - minX);
      e.p.targetY = minY + Math.random() * (maxY - minY);

      const distance = FastMath.dist(e.p.targetX, e.p.targetY, e.x, e.y);
      const speed = distance / e.maxL;
      const angle = Math.atan2(e.p.targetY - e.y, e.p.targetX - e.x);

      e.dx = Math.cos(angle) * speed;
      e.dy = Math.sin(angle) * speed;
      e.p.hasTarget = true;
    }

    e.x += e.dx;
    e.y += e.dy;
    e.rotation = (e.rotation || 0) + 0.2;

    if (lob && lob.vfxTex && e.l % 2 === 0) {
      const posX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const posY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics(lob.vfxTex, posX, posY, 0, 0, 5, 1, 1, true, 0xffffff);
    }

    if (e.l <= 1 && lob && lob.spawnOnDeath) {
      if (lob.deathSound) AudioSys.play(lob.deathSound, 0.6);

      const spawnCfg = lob.spawnOnDeath;
      const combinedPayload = { ...e.p.payload, ...spawnCfg.payload };

      a.spawnEnt({
        x: e.x,
        y: e.y,
        l: spawnCfg.life,
        traits: spawnCfg.traits,
        p: { ownerId: e.p.ownerId, color: e.p.color, payload: combinedPayload }
      });
    }
  });

  // Universal: Apply status effect in radius
  MinitEngine.Registry.addTrait('applyStatusInRadius', (e, a) => {
    const radius = e.p.payload.zoneRadius || 1.5;
    const radSq = radius * radius;
    for (let pIdx = 0; pIdx < a.players.length; pIdx++) {
      const p = a.players[pIdx];
      if (p.id !== e.p.ownerId && p.hp > 0 && FastMath.distSq(p.x, p.y, e.x, e.y) <= radSq) {
        const debuff = e.p.payload.debuff;
        if (debuff && !p.debuffs[debuff.payload.id]) {
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

  // Universal: Damage in radius on hit (supports fighters & summons)
  MinitEngine.Registry.addTrait('damageRadiusOnHit', (e, a) => {
    const owner = a.playerMap?.[e.p.ownerId] || a.players.find((p) => p.id === e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;
    let hasHit = false;
    const rad = e.p.vfx?.radius || e.p.payload?.zoneRadius || 1.5;
    const radSq = rad * rad;

    const enemies = a.getOpposingActors ? a.getOpposingActors(e.p.ownerId) : a.players;
    for (let pIdx = 0; pIdx < enemies.length; pIdx++) {
      const p = enemies[pIdx];
      if (
        (p.team || p.id) !== e.p.ownerId &&
        p.hp > 0 &&
        FastMath.distSq(e.x, e.y, p.x, p.y) < radSq
      ) {
        const finalDmg = e.p.payload.dmg * dMult;
        a.damageActor(p, { ...e.p.payload, dmg: finalDmg }, e.p.color, owner);
        hasHit = true;
      }
    }

    if (hasHit && e.p.payload.destroyOnHit !== false) {
      e.dead = true;
    }
  });

  // Universal: Transform owner
  MinitEngine.Registry.addTrait('transformOwner', (e, a) => {
    const owner = a.players.find((p) => p.id === e.p.ownerId);
    if (!owner || owner.hp <= 0) {
      e.dead = true;
      return;
    }

    const tf = e.p.payload.transformation;
    if (!tf) {
      e.dead = true;
      return;
    }

    if (!owner.isTransformed) {
      owner.def = { ...owner.def, stats: { ...owner.def.stats } };
      owner.isTransformed = true;
    }

    if (tf.texture && a.textures[tf.texture]) {
      owner.spr.texture = a.textures[tf.texture];
    }

    if (tf.action) {
      owner.def.action = tf.action;
      owner.t = 0;
    }

    if (tf.stats) {
      if (tf.stats.speed !== undefined) {
        owner.def.stats.speed = tf.stats.speed;
        if (owner.dx === 0 && owner.dy === 0 && tf.stats.speed > 0) {
          const ang = FastMath.randRange(0, Math.PI * 2);
          owner.dx = Math.cos(ang) * tf.stats.speed;
          owner.dy = Math.sin(ang) * tf.stats.speed;
        }
      }
      if (tf.stats.hpAdd) {
        owner.maxHp += tf.stats.hpAdd;
        owner.hp += tf.stats.hpAdd;
        const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        a.fxPool.spawnDmgText(oX, oY, tf.stats.hpAdd, 0x00ff55, 1.0, { isHeal: true });
      }
    }

    if (tf.vfx) {
      const pX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      if (tf.vfx.flash) a.triggerFlash(tf.vfx.flash);
      if (tf.vfx.shake) a.shake = Math.max(a.shake, tf.vfx.shake);
      if (tf.sound) AudioSys.play(tf.sound, 0.8);

      const pC = tf.vfx.particleCount || 20;
      for (let i = 0; i < pC; i++) {
        a.fxPool.spawnPhysics(
          tf.vfx.particleTex || 'fx_dust',
          pX,
          pY,
          FastMath.randRange(-6, 6),
          FastMath.randRange(-6, 6),
          30,
          0.9,
          0.9,
          true,
          e.p.color
        );
      }
    }

    owner.aS.tX = (owner.baseScale || 1.0) * 1.8;
    owner.aS.tY = (owner.baseScale || 1.0) * 1.8;
    e.dead = true;
  });

  // Universal: Modular knockback on hit for any minit
  MinitEngine.Registry.addTrait('knockbackOnHit', (e, a) => {
    const radius = e.p.vfx?.radius || e.p.payload?.zoneRadius || 1.5;
    const force = e.p.payload?.knockbackForce || 0.75;
    a.players.forEach((p) => {
      if (e.p.ownerId !== p.id && p.hp > 0 && FastMath.dist(e.x, e.y, p.x, p.y) <= radius) {
        a.applyKnockback(p.id, {
          fromX: e.x,
          fromY: e.y,
          force: force,
          shake: e.p.payload?.hitVfx?.shake || 6,
          playSound: true
        });
      }
    });
  });

  // ============================================================
  // UNIVERSAL MODULAR BEAM ATTACK TRAIT
  // High-fidelity vector beam used by Laser, Murasaki, Ironman, etc.
  // ============================================================
  MinitEngine.Registry.addTrait('modularBeam', (e, a) => {
    const owner = a.players.find((p) => p.id === e.p.ownerId);
    if (!owner || owner.hp <= 0) {
      if (e.p.beamId && a.beamRenderer) a.beamRenderer.removeBeam(e.p.beamId);
      e.dead = true;
      return;
    }

    if (!e.p.beamId) {
      e.p.beamId = 'beam_' + Math.random().toString(36).substr(2, 9);
    }

    const cfg = e.p.beamConfig || {};
    const maxLife = e.maxL || 60;
    const elapsed = maxLife - e.l;
    const progress = Math.min(1.0, elapsed / maxLife);

    // Determine target and angle
    let target = null;
    if (cfg.trackTarget) {
      if (!e.p.targetId || !a.players.some((p) => p.id === e.p.targetId && p.hp > 0)) {
        const closest = a.getValidTarget(owner.id, { type: 'closest_enemy' });
        e.p.targetId = closest ? closest.id : null;
      }
      target = a.players.find((p) => p.id === e.p.targetId && p.hp > 0);
      if (!target) {
        if (a.beamRenderer) a.beamRenderer.removeBeam(e.p.beamId);
        e.dead = true;
        return;
      }
      e.p.aimAngle = Math.atan2(target.y - owner.y, target.x - owner.x);
    } else {
      if (e.p.aimAngle === undefined) {
        const initialTgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
        e.p.aimAngle = initialTgt ? Math.atan2(initialTgt.y - owner.y, initialTgt.x - owner.x) : 0;
        e.p.targetId = initialTgt ? initialTgt.id : null;
      }
      target = a.players.find((p) => p.id === e.p.targetId && p.hp > 0);
    }

    const angle = e.p.aimAngle;
    const startX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const startY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

    // Calculate end point
    let endX, endY;
    if (cfg.trackTarget && target) {
      endX = target.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      endY = target.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
    } else {
      const beamLength = cfg.beamLength || 460;
      endX = startX + Math.cos(angle) * beamLength;
      endY = startY + Math.sin(angle) * beamLength;
    }

    // Owner recoil pushback
    if (cfg.recoilForce) {
      owner.x -= Math.cos(angle) * cfg.recoilForce;
      owner.y -= Math.sin(angle) * cfg.recoilForce;
    }

    // Render multi-layered glowing vector beam
    if (a.beamRenderer) {
      a.beamRenderer.renderBeam(e.p.beamId, {
        startX,
        startY,
        endX,
        endY,
        coreColor: cfg.coreColor || 0xffffff,
        glowColor: cfg.glowColor || e.p.color || 0x00e5ff,
        sheathColor: cfg.sheathColor || null,
        coreWidth: cfg.coreWidth || 4,
        sheathWidth: cfg.sheathWidth || 12,
        glowWidth: cfg.glowWidth || 24,
        glowAlpha: cfg.glowAlpha || 0.35,
        sheathAlpha: cfg.sheathAlpha || 0.85,
        hasLightning: cfg.hasLightning !== false,
        lightningColor: cfg.lightningColor || 0xffffff,
        lightningBranches: cfg.lightningBranches || 2,
        jitter: cfg.jitter || 0
      });
    }

    // Muzzle particle emission
    if (cfg.muzzleVfx !== false && e.l % 2 === 0) {
      const mAng = angle + FastMath.randRange(-0.6, 0.6);
      const mSpd = FastMath.randRange(1, 3.5);
      a.fxPool.spawnPhysics(
        cfg.sparkTex || 'fx_spark',
        startX + Math.cos(angle) * 8,
        startY + Math.sin(angle) * 8,
        Math.cos(mAng) * mSpd,
        Math.sin(mAng) * mSpd,
        8,
        0.85,
        0.85,
        true,
        cfg.glowColor || e.p.color || 0x00e5ff
      );
    }

    // Impact flare emission
    if (cfg.impactVfx !== false && e.l % 2 === 0) {
      for (let i = 0; i < 2; i++) {
        const iAng = angle + Math.PI + FastMath.randRange(-1.2, 1.2);
        const iSpd = FastMath.randRange(1.5, 4.5);
        a.fxPool.spawnPhysics(
          cfg.sparkTex || 'fx_spark',
          endX,
          endY,
          Math.cos(iAng) * iSpd,
          Math.sin(iAng) * iSpd,
          10,
          0.85,
          0.85,
          true,
          cfg.glowColor || e.p.color || 0x00e5ff
        );
      }
    }

    // Damage & Collision application
    const tickRate = cfg.tickRate || 5;
    if (e.l % tickRate === 0) {
      const dMult = owner.dmgMult || 1.0;
      let calculatedDmg = cfg.damage || e.p.payload?.dmg || 10;
      if (cfg.rampingDamage) {
        calculatedDmg *= (1.0 + progress * cfg.rampingDamage);
      }
      const finalDmg = calculatedDmg * dMult;

      if (cfg.trackTarget && target) {
        // Direct tracking damage
        a.damageActor(
          target,
          {
            dmg: finalDmg,
            hitVfx: {
              shake: cfg.hitShake || 2,
              flash: cfg.hitFlash || 0.08,
              hitStop: cfg.hitStop || 1,
              particleCount: cfg.hitParticles || 2,
              particleTex: cfg.sparkTex,
              playSound: false
            }
          },
          cfg.glowColor || e.p.color,
          owner
        );
        if (cfg.hitSound) AudioSys.play(cfg.hitSound, cfg.soundVolume || 0.3);
      } else {
        // Line collision against all enemies (fighters & summons)
        const beamRadius = cfg.beamRadius || (cfg.sheathWidth ? cfg.sheathWidth * 1.2 : 22);
        const enemies = a.getOpposingActors ? a.getOpposingActors(owner.id) : a.players;
        enemies.forEach((p) => {
          if ((p.team || p.id) !== owner.id && p.hp > 0) {
            const p_pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
            const p_pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

            const dist = Math.abs(Math.sin(angle) * (startX - p_pX) - Math.cos(angle) * (startY - p_pY));
            const dot = Math.cos(angle) * (p_pX - startX) + Math.sin(angle) * (p_pY - startY);

            if (dist <= beamRadius && dot > 0) {
              const dmgPayload = {
                dmg: finalDmg,
                hitVfx: {
                  shake: cfg.hitShake || 4,
                  flash: cfg.hitFlash || 0.15,
                  hitStop: cfg.hitStop || 1,
                  particleCount: cfg.hitParticles || 3,
                  particleTex: cfg.sparkTex,
                  playSound: false
                }
              };

              if (cfg.knockbackForce) {
                dmgPayload.knockback = {
                  forceX: Math.cos(angle) * cfg.knockbackForce,
                  forceY: Math.sin(angle) * cfg.knockbackForce,
                  shake: cfg.hitShake || 4
                };
              }

              a.damageActor(p, dmgPayload, cfg.glowColor || e.p.color, owner);
              if (cfg.hitSound) AudioSys.play(cfg.hitSound, cfg.soundVolume || 0.3);
            }
          }
        });
      }
    }

    if (--e.l <= 0) {
      if (a.beamRenderer) a.beamRenderer.removeBeam(e.p.beamId);
      e.dead = true;
    }
  });

  // ============================================================
  // UNIVERSAL SDK PROJECTILE TRAIT
  // Supports homing, bounce, pierce, trails & custom callbacks
  // ============================================================
  MinitEngine.Registry.addTrait('sdkProjectile', (e, a) => {
    const cfg = e.p.sdkProjCfg;
    if (!cfg) return;

    const owner = a.getActorById(e.p.sourceActorId || e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;

    // Optional homing steering
    if (cfg.homing) {
      const tgt = a.getValidTarget(e.p.ownerId, { type: 'closest_enemy' });
      if (tgt) {
        const desiredAng = FastMath.angle(e.x, e.y, tgt.x, tgt.y);
        const curAng = Math.atan2(e.dy, e.dx);
        let diff = desiredAng - curAng;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const nextAng = curAng + FastMath.clamp(diff, -(cfg.turnRate || 0.08), cfg.turnRate || 0.08);
        const spd = cfg.speed || Math.hypot(e.dx, e.dy) || 0.35;
        e.dx = Math.cos(nextAng) * spd;
        e.dy = Math.sin(nextAng) * spd;
      }
    }

    // Move if moveAndBounce is not already handling movement
    if (!e.traits.includes('moveAndBounce')) {
      e.x += e.dx;
      e.y += e.dy;
      e.curX = e.x;
      e.curY = e.y;
    }

    // Render projectile visual & additive motion trail
    if (!a.isHeadless) {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const tintCol = cfg.tint ?? e.p.color ?? 0xffffff;
      const velAng = Math.atan2(e.dy, e.dx);

      a.fxPool.spawnPhysics(
        cfg.tex || 'fx_spark',
        pX,
        pY,
        e.dx * 2,
        e.dy * 2,
        3,
        1,
        1,
        false,
        tintCol,
        1.0,
        {
          additive: true,
          alignToVel: true,
          stretchFactor: 0.45,
          scale: 1.15,
          grav: 0,
          rotation: velAng,
          forceSpawn: true
        }
      );

      if (e.l % 2 === 0) {
        a.fxPool.spawnGlow(pX, pY, tintCol, 0.5, 6, 0.35);
      }

      if (cfg.trailTex && e.l % 2 === 0) {
        a.fxPool.spawnPhysics(
          cfg.trailTex,
          pX,
          pY,
          -e.dx * 1.2 + FastMath.randRange(-0.4, 0.4),
          -e.dy * 1.2 + FastMath.randRange(-0.4, 0.4),
          9,
          0.88,
          0.88,
          true,
          tintCol,
          0.85,
          { additive: true, grav: 0 }
        );
      }
    }

    if (typeof cfg.onTick === 'function') {
      cfg.onTick(e, a);
    }

    // Collision against opposing actors (fighters & summons)
    const rad = cfg.radius || 1.1;
    const radSq = rad * rad;
    const enemies = a.getOpposingActors(e.p.ownerId);

    for (let i = 0; i < enemies.length; i++) {
      const tgt = enemies[i];
      if (tgt.hp > 0 && FastMath.distSq(e.x, e.y, tgt.x, tgt.y) <= radSq) {
        if (cfg.pierce) {
          e.p._hitSet = e.p._hitSet || new Set();
          if (e.p._hitSet.has(tgt.id)) continue;
          e.p._hitSet.add(tgt.id);
        }

        const dmgPayload = {
          dmg: cfg.dmg * dMult,
          hitVfx: cfg.hitVfx
        };
        if (cfg.knockbackForce) {
          dmgPayload.knockback = {
            fromX: e.x,
            fromY: e.y,
            force: cfg.knockbackForce,
            shake: cfg.hitVfx?.shake || 4
          };
        }

        a.damageActor(tgt, dmgPayload, e.p.color, owner);
        if (typeof cfg.onHit === 'function') {
          cfg.onHit(e, tgt, a);
        }
        if (cfg.destroyOnHit !== false) {
          e.dead = true;
          break;
        }
      }
    }

    if ((e.dead || e.l <= 1) && typeof cfg.onExpire === 'function' && !e.p._expiredCalled) {
      e.p._expiredCalled = true;
      cfg.onExpire(e, a);
    }
  });

  // ============================================================
  // UNIVERSAL SDK BARRIER / PROJECTILE-BLOCKING SHIELD TRAIT
  // Intercepts or reflects incoming enemy projectiles & pushes foes
  // ============================================================
  MinitEngine.Registry.addTrait('sdkBarrier', (e, a) => {
    const bCfg = e.p.barrierCfg;
    if (!bCfg || bCfg.hp <= 0) {
      e.dead = true;
      return;
    }

    const owner = a.getActorById(e.p.sourceActorId || e.p.ownerId);
    if (bCfg.followOwner && owner && owner.hp > 0) {
      if (bCfg.orbitRadius > 0) {
        bCfg.orbitAngle = (bCfg.orbitAngle || 0) + (bCfg.orbitSpeed || 0.08);
        e.x = owner.x + Math.cos(bCfg.orbitAngle) * bCfg.orbitRadius;
        e.y = owner.y + Math.sin(bCfg.orbitAngle) * bCfg.orbitRadius;
      } else {
        e.x = owner.x;
        e.y = owner.y;
      }
    }

    const rad = bCfg.radius || 1.4;
    const radSq = rad * rad;

    // 1. Intercept or reflect enemy projectiles inside `a.actE`
    if (bCfg.blocksProjectiles !== false) {
      for (let i = 0; i < a.actE.length; i++) {
        const other = a.actE[i];
        if (
          other === e ||
          other.dead ||
          other.p?.ownerId === e.p.ownerId ||
          other.p?.isBarrier ||
          other.p?.beamId
        ) {
          continue;
        }
        const isMovingProj =
          other.p?.isProjectile ||
          other.dx !== 0 ||
          other.dy !== 0 ||
          other.traits.includes('moveAndBounce') ||
          other.traits.includes('sdkProjectile');

        if (!isMovingProj) continue;

        if (FastMath.distSq(e.x, e.y, other.x, other.y) <= radSq) {
          const projDmg = other.p?.payload?.dmg || other.p?.sdkProjCfg?.dmg || 25;
          bCfg.hp -= projDmg;

          if (bCfg.reflectProjectiles) {
            other.dx = -other.dx * 1.15;
            other.dy = -other.dy * 1.15;
            other.p.ownerId = e.p.ownerId;
            other.p.color = e.p.color;
            if (!a.isHeadless) {
              const pX = other.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const pY = other.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
              a.fxPool.spawnShockwave(pX, pY, e.p.color, 36, 3);
              AudioSys.play('bounce', 0.5);
            }
          } else {
            other.dead = true;
            if (!a.isHeadless) {
              const pX = other.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const pY = other.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
              a.fxPool.spawnShockwave(pX, pY, e.p.color, 30, 2);
              AudioSys.play('hit', 0.35);
            }
          }

          if (bCfg.hp <= 0) {
            e.dead = true;
            return;
          }
        }
      }
    }

    // 2. Push enemies or deal contact damage
    if (bCfg.pushEnemies || bCfg.contactDmg > 0) {
      const enemies = a.getOpposingActors(e.p.ownerId);
      const isTick = e.l % (bCfg.tickRate || 10) === 0;
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.hp > 0 && FastMath.distSq(e.x, e.y, en.x, en.y) <= radSq) {
          if (bCfg.pushEnemies) {
            a.applyKnockback(en.id, {
              fromX: e.x,
              fromY: e.y,
              force: 0.45,
              shake: 2
            });
          }
          if (bCfg.contactDmg > 0 && isTick) {
            a.damageActor(
              en,
              {
                dmg: bCfg.contactDmg,
                hitVfx: { shake: 2, flash: 0, particleCount: 3, playSound: false }
              },
              e.p.color,
              owner
            );
          }
        }
      }
    }
  });
}
