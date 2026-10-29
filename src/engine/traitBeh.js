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

  // Target the closest enemy
  MinitEngine.Registry.addTargeting('closest_enemy', (owner, arena) => {
    let closestTarget = null;
    let minDistance = Infinity;

    for (let i = 0; i < arena.players.length; i++) {
      const player = arena.players[i];
      if (player.id !== owner.id && player.hp > 0) {
        const distance = FastMath.dist(owner.x, owner.y, player.x, player.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestTarget = player;
        }
      }
    }

    return closestTarget;
  });

  // Target a random enemy
  MinitEngine.Registry.addTargeting('random_enemy', (owner, arena) => {
    const enemies = arena.players.filter((p) => p.id !== owner.id && p.hp > 0);
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
      entity.curX = Math.max(CFG.ARENA_BOUNDS.MIN_X, Math.min(entity.curX, CFG.ARENA_BOUNDS.MAX_X));
      entity.dx *= CFG.PHYSICS.BOUNCE;
      arena.shake = Math.max(arena.shake, entity.p?.vfx?.shake || 0);
      AudioSys.play('hit', 0.2);
    }

    // Y-axis boundary collision
    if (entity.curY < CFG.ARENA_BOUNDS.MIN_Y || entity.curY > CFG.ARENA_BOUNDS.MAX_Y) {
      entity.curY = Math.max(CFG.ARENA_BOUNDS.MIN_Y, Math.min(entity.curY, CFG.ARENA_BOUNDS.MAX_Y));
      entity.dy *= CFG.PHYSICS.BOUNCE;
      arena.shake = Math.max(arena.shake, entity.p?.vfx?.shake || 0);
      AudioSys.play('hit', 0.2);
    }

    entity.x = entity.curX;
    entity.y = entity.curY;
  });

  // Decrease entity lifespan and mark as dead when expired
  MinitEngine.Registry.addTrait('ageLife', (entity) => {
    if (--entity.l <= 0) entity.dead = true;
  });

  // Spawn particle trail behind moving entity
  MinitEngine.Registry.addTrait('trailParticles', (entity, arena) => {
    const posX = (entity.curX ?? entity.x) * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const posY = (entity.curY ?? entity.y) * CFG.GRID.TS + CFG.GRID.HALF_TS;

    if (entity.p?.vfx?.trailTex && entity.l % 2 === 0) {
      arena.fxPool.spawnPhysics(
        entity.p.vfx.trailTex,
        posX,
        posY,
        entity.p.vfx.trailVx || 0,
        entity.p.vfx.trailVy || 0,
        10,
        entity.p.vfx.trailDragX || 1,
        entity.p.vfx.trailDragY || 1,
        1
      );
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

    if (e.l % (pay.vfxTick || 5) === 0 && pay.vfxTex) {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics(
        pay.vfxTex,
        pX + FastMath.randRange(-8, 8),
        pY + FastMath.randRange(-8, 8),
        0,
        -1,
        15,
        1,
        1,
        true,
        0xffffff
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
    const owner = a.players.find((pl) => pl.id === e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;

    const tickRate = e.p.payload.tickRate || 10;
    const isTick = e.l % tickRate === 0;

    a.players.forEach((p) => {
      if (
        p.id !== e.p.ownerId &&
        p.hp > 0 &&
        FastMath.dist(p.x, p.y, e.x, e.y) <= e.p.payload.zoneRadius
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
    });
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
        a.fxPool.spawnDmgText(oX, oY, healAmt, 0x00ff55);
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
    a.players.forEach((p) => {
      if (p.id !== e.p.ownerId && p.hp > 0 && FastMath.dist(p.x, p.y, e.x, e.y) <= radius) {
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
    });
  });

  // Universal: Damage in radius on hit
  MinitEngine.Registry.addTrait('damageRadiusOnHit', (e, a) => {
    const owner = a.players.find((p) => p.id === e.p.ownerId);
    const dMult = owner ? (owner.dmgMult || 1.0) : 1.0;
    let hasHit = false;

    a.players.forEach((p) => {
      if (
        e.p.ownerId !== p.id &&
        p.hp > 0 &&
        FastMath.dist(e.x, e.y, p.x, p.y) < (e.p.vfx?.radius || e.p.payload?.zoneRadius || 1.5)
      ) {
        const finalDmg = e.p.payload.dmg * dMult;
        a.damagePlayer(p.id, { ...e.p.payload, dmg: finalDmg }, e.p.color);
        hasHit = true;
      }
    });

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
        a.fxPool.spawnDmgText(oX, oY, tf.stats.hpAdd, 0x00ff55);
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
}
