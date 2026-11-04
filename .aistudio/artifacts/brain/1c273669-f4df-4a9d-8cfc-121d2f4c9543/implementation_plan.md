# Universal Minit Builder & Flexible Combat Engine Architecture

This upgrade transforms the Minit combat engine from a fixed single-cooldown loop into an open, extensible **Universal Fighter & Entity Sandbox**. Creators can still build Minits with simple declarative configs, or combine **Full Lifecycle Hooks**, **Multi-Ability Slots & Passives**, **Pluggable Movement AI**, **Destroyable Summons/Clones/Turrets**, and **Projectile-Blocking Shields**—making any fighter archetype possible.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions are confirmed from your answers and maintain **100% backward compatibility** with all existing built-in and custom Minits:

- **Full Fighter & Entity Lifecycle Hooks**: Unlock `onInit`, `onTick`, `onMove`, `onAction`, `onWallBounce`, `onBeforeDealDamage`, `onDealDamage`, `onBeforeDamaged`, `onDamaged`, `onBeforeDeath` (enabling revives, immortality windows, and boss phase transitions), and `onDeath`.
- **Multi-Ability Slots, Passives & State Machines**: Support an `actions: [...]` array (multiple independent cooldowns, energy/combo conditions, and weights) alongside the classic single `action` object, plus `passive` traits, shields (`owner.shield`), stun/freeze (`owner.stunTicks`), invulnerability (`owner.invulnTicks`), and `owner.state`.
- **Pluggable Movement AI**: Built-in movement controllers (`wander`, `chase`, `kite`, `orbit`, `strafe`, `stationary`, `teleport_step`, or a custom `onMove` callback) so fighters can act as snipers, assassins, orbiters, or brawlers.
- **Destroyable Summons, Clones, Turrets & Projectile-Blocking Barriers**: Spawnable sub-units with their own HP, sprites, AI, and attacks, plus barrier/shield entities that intercept or reflect enemy projectiles.
- **Keep File-Only Workshop & Expand Starter Template**: Keep the Dev modal compact and file-import focused while upgrading the downloadable `.js` starter template and `README.md` to showcase the full Minit SDK.

---

## 1. Overview & Core Concept

- **What It Does**: Removes all hardcoded assumptions about how a Minit moves, attacks, takes damage, or dies. Every aspect of a fighter's behavior can be configured declaratively or scripted via clean JavaScript hooks and `MinitSDK` helper methods.
- **Target Audience / Persona**: Game developers and players creating custom Minits ranging from simple projectile fighters to complex multi-phase bosses, necromancer summoners, shield paladins, and teleporting assassins.
- **Key Value**: Unlimited creative freedom with zero boilerplate math—works identically in live WebGL duels and high-speed Headless Balance simulations.

---

## 2. User Experience & Creator Workflow

- **Authoring Experience**:
  1. **Declarative Simplicity**: A creator can define `movement: { type: 'kite', idealDist: 5 }`, `actions: [primaryShot, ultimateBeam]`, and `stats: { hp: 1100, shield: 200, speed: 0.15 }` without writing low-level physics code.
  2. **Unlimited Scripting Power**: For bespoke mechanics (e.g., countering hits while a shield is up, splitting into 2 clones at 50% HP, or stealing enemy stats), creators define `hooks: { onBeforeDamaged(self, dmgInfo, arena) { ... }, onBeforeDeath(self, arena) { ... } }`.
  3. **Ergonomic `MinitSDK` Helpers**: Creators can call intuitive methods on the `arena` (or injected `SDK` object) such as `a.shootProjectile(...)`, `a.spawnSummon(...)`, `a.spawnShieldBarrier(...)`, `a.teleport(...)`, `a.dash(...)`, `a.heal(...)`, `a.addShield(...)`, and `a.setPhase(...)` using grid coordinates directly without manual pixel conversion.
- **Visual & Simulation Fidelity**:
  - Summons, clones, and turrets render their own crisp pixel sprites, miniature health bars, and hit flashes inside the arena.
  - Fighter shields and custom vector graphics (`self.gfx`) render cleanly around fighters in real-time combat and safely no-op in headless balance runs.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Backward-Compatible Normalization in `MinitContract`**
  - *Chosen Approach*: `validateAndSanitizeMinit` preserves `minit.action` for existing Minits while normalizing `minit.actions` (an array of ability slots), `minit.movement`, `minit.passive`, `minit.initialState`, and `minit.hooks`.
  - *Why*: Every existing Minit (`laser`, `pulsar`, `absorb`, `waves`, `moth`, `murasaki`, `ironmen`, `saitama`, and saved custom Minits) continues to work without breaking changes.
- **Decision 2: Unified Combat Actor Model for Fighters & Summons**
  - *Chosen Approach*: Summons, clones, and turrets are managed in `arena.summons` (sharing targetable actor properties `x, y, dx, dy, hp, maxHp, ownerId, team, radius, spr`) and automatically participate in collision, targeting, and cleanup when defeated or when their summoner dies.
  - *Why*: Allows universal traits (`damageRadiusOnHit`, `modularBeam`, `homingMissile`) and targeting rules (`closest_enemy`, `lowest_hp`, `summons_first`) to interact naturally with summons and clones.
- **Decision 3: Interceptable Projectile & Barrier Tagging**
  - *Chosen Approach*: Projectiles spawned via actions or `a.shootProjectile` can be intercepted or reflected by active barrier entities (`isBarrier: true`, `blocksProjectiles: true`, `reflectProjectiles: true`).
  - *Why*: Enables wind-walls, orbital energy shields, and reflect-parry mechanics across any matchup.

---

## 4. Technical Architecture & Data Strategy

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL MINIT DEFINITION (.JS)                     │
│  • Identity & Stats : hp, speed, shield, armor, energy, maxEnergy       │
│  • Movement AI      : 'wander' | 'chase' | 'kite' | 'orbit' | 'custom'  │
│  • Ability Slots    : action (single) OR actions: [ slot1, slot2, ... ] │
│  • Lifecycle Hooks  : onInit, onTick, onMove, onBeforeDamaged,          │
│                       onDamaged, onDealDamage, onBeforeDeath, onDeath   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Validated & Registered
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     60HZ ARENA SIMULATION PIPELINE                      │
│                                                                         │
│  1. Fighter Tick & Statuses (stunTicks, invulnTicks, shield decay/regen)│
│  2. Movement Controller (AI Steering / Kite / Orbit / Custom onMove)    │
│  3. Multi-Slot Ability Scheduler (Cooldowns, Energy Costs, Conditions)  │
│  4. Summon / Clone / Turret AI & Action Loop (arena.summons)            │
│  5. Entity & Barrier ECS Loop (Projectiles vs. Barriers/Summons/Players)│
│  6. Damage & Death Pipeline (onBeforeDamaged -> Shield/Armor ->         │
│                              onDamaged -> onBeforeDeath -> Revive/KO)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Powered by
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MINIT SDK HELPER TOOLKIT                         │
│  • Combat  : shootProjectile, fireBeam, dealAreaDamage, heal, addShield │
│  • Units   : spawnSummon, spawnClone, spawnTurret, spawnBarrier         │
│  • Motion  : teleport, dash, steerToward, orbitAround, applyKnockback   │
│  • State   : setPhase, transform, applyStatus, spawnVfx, playSound      │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Damage Interception & Revive Pipeline**: When `arena.damagePlayer(targetId, payload, color, attackerId)` is called:
    1. Checks `target.invulnTicks > 0` (ignores damage if invulnerable).
    2. Invokes `target.def.hooks.onBeforeDamaged(target, dmgContext, arena)`—allowing the hook to modify `dmgContext.dmg`, cancel the hit (`dmgContext.cancel = true`), or trigger a counter-attack.
    3. Applies `target.def.stats.armor` (flat or % mitigation) and absorbs damage against `target.shield` before reducing `target.hp`.
    4. Invokes `attacker.def.hooks.onDealDamage` and `target.def.hooks.onDamaged`.
    5. If `target.hp <= 0`, invokes `target.def.hooks.onBeforeDeath(target, arena)`—if the hook heals `target.hp > 0` (e.g., Phoenix revive or Second Boss Phase), death is canceled and the fight continues!
  - **Expanded Starter Template**: Clicking **`Template .JS`** in the Dev modal downloads a richly commented template demonstrating declarative stats/movement, multi-slot `actions`, `hooks` (`onTick`, `onBeforeDamaged`, `onBeforeDeath`), and `SDK` calls (`spawnSummon`, `spawnBarrier`, `shootProjectile`).
