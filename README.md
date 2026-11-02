# ⚔️ Minit Duels — Complete Game & Creator Documentation

**Minit Duels** is a high-frame-rate arcade 1v1 pixel auto-battler built with **PixiJS (WebGL)**, a **Zero-Allocation Entity-Component-System (ECS)** combat engine, and a **Real-Time Web Audio API Synthesizer**.

Designed from the ground up to be **100% data-driven and moddable**, Minit Duels allows **anyone** to create, import, test, and balance their own custom characters (**Minits**) using a single JavaScript file (`<name>.js`) and an automatically synced sprite icon (`<name>.png`)—directly inside the browser via the **In-Game Workshop** or inside the source repository.

---

## 📖 Table of Contents

1. [Core Features](#-core-features)
2. [Tech Stack & Engineering Principles](#-tech-stack--engineering-principles)
3. [Project Structure](#-project-structure)
4. [Game Architecture & How the Code Works](#-game-architecture--how-the-code-works)
5. [How to Create Your Own Minit (Complete Creator Guide)](#-how-to-create-your-own-minit-complete-creator-guide)
   - [Method A: Instant In-Game Import (Workshop Modal)](#method-a-instant-in-game-import-workshop-modal--no-build-needed)
   - [Method B: Adding a Built-In Minit to Source Code](#method-b-adding-a-built-in-minit-to-the-source-code)
6. [Complete Minit Schema & Property Reference](#-complete-minit-schema--property-reference)
7. [Built-In Universal Traits Reference (`traitBeh.js`)](#-built-in-universal-traits-reference-traitbehjs)
8. [Writing Custom Traits (`customTraits`) & Arena API](#-writing-custom-traits-customtraits--arena-api)
9. [Creating Custom VFX (`customTextures`) & SFX (`customAudio`)](#-creating-custom-vfx-customtextures--sfx-customaudio)
10. [Complete Copy-Paste Minit Templates](#-complete-copy-paste-minit-templates)
11. [Balancing & Debugging Your Minit](#-balancing--debugging-your-minit)
12. [Development, Build & GitHub Workflow](#-development-build--github-workflow)

---

## 🎮 Core Features

- **In-Game Minit Workshop (`⚙ WORKSHOP`)**:
  - **Custom Minit Importer**: Drag-and-drop or pick `.js` and `.png` files directly in the Editor Scene.
  - **Automatic Filename Asset Sync**: Drop `ninja.js` and `ninja.png` (together or in separate steps) and the engine automatically pairs them by filename stem, converts textures into crisp `NEAREST` GPU textures, and persists them in `localStorage`.
  - **Headless Balance Matrix**: Simulate hundreds or thousands of 1v1 duels in milliseconds without rendering overhead to inspect **Overall Winrates**, **Matchup Heatmaps (A vs B)**, **Average Time-To-Kill (TTK)**, **DPS**, and **Automated Balance Tiers** (`OVERPOWERED`, `BALANCED`, `UNDERPOWERED`).
  - **Real-Time Debug & Telemetry Mode**: Toggle hitboxes, attack zone radii, velocity/aim vectors, live entity state tags, combat logs, and simulation time-scaling (`0.25x` slow-mo to `4x` turbo).
- **Dual-Orientation Responsive Layout**:
  - **Landscape (Desktop)**: Centered combat arena framed symmetrically by Player 1 and Player 2 fighter HUD cards.
  - **Portrait (Mobile)**: Arena positioned at the top with side-by-side fighter HUD cards docked underneath.
- **Crisp HD Pixel Engine**:
  - 16×16 retro character sprites rendered with strict `PIXI.SCALE_MODES.NEAREST` and `PIXI.WRAP_MODES.CLAMP`.
  - Subpixel motion interpolation (`ROUND_PIXELS = false`) for silky-smooth movement without pixel shimmer.

---

## 🧰 Tech Stack & Engineering Principles

| Layer | Technology | Why It Was Chosen |
| :--- | :--- | :--- |
| **Rendering Engine** | **PixiJS v7 (`pixi.js`)** | Hardware-accelerated 2D WebGL batch rendering for hundreds of simultaneous particles, shockwaves, and multi-layered vector beams at 60 FPS. |
| **Audio Engine** | **Web Audio API (`AudioSys.js`)** | 100% procedural sound synthesis using oscillators (`sine`, `square`, `sawtooth`, `triangle`), biquad filters, and a pre-baked 2-second white noise buffer. Zero external `.mp3`/`.wav` dependencies required. |
| **Combat Architecture** | **Data-Driven ECS (`Arena.js` + `traitBeh.js`)** | Decouples character definitions from simulation physics. Every projectile, aura, beam, cocoon, or status effect is a pooled entity executing an array of modular trait functions. |
| **Memory Management** | **Zero-GC Object Pooling (`VFXPool.js` & `Arena.deadE`)** | Pre-allocates 600 combat entities, 500 physics sprites, 20 shockwave rings, and 40 bitmap damage number containers at boot to prevent garbage-collection frame drops during intense fights. |
| **Math & Determinism** | **Lookup Table Math (`FastMath.js`)** | Pre-computes `SIN`/`COS` lookup tables and provides fast distance/angle helpers for high-frequency collision checks and headless batch simulations. |
| **Build & Dev Tooling** | **Vite (`vite`) + ES Modules** | Instant development server startup and optimized static bundle generation. |

---

## 📁 Project Structure

```text
├── public/
│   └── assets/
│       └── minit_icon/             # Built-in 16x16 PNG character sprites
├── src/
│   ├── config.js                   # Global grid constants, physics rules, audio & UI palette
│   ├── main.js                     # Application bootstrap, PixiJS setup & scene transitions
│   ├── engine/
│   │   ├── Arena.js                # Core combat simulation loop, entity pool & headless mode
│   │   ├── AssetBaker.js           # Procedural graphics-to-texture baker & PNG/DataURL loader
│   │   ├── AssetTemplate.js        # Base procedural particle textures, digits & audio presets
│   │   ├── AudioSys.js             # Synthesized Web Audio API sound engine
│   │   ├── BeamRenderer.js         # Multi-layered glowing vector beam & lightning renderer
│   │   ├── CustomMinitManager.js   # Dynamic JS parser, auto filename asset sync & localStorage
│   │   ├── DebugConfig.js          # Reactive debug flags (hitboxes, vectors, time-scale)
│   │   ├── DebugOverlay.js         # Live world-space & HUD debug visualizers
│   │   ├── FastMath.js             # Fast trigonometry, distance & random range helpers
│   │   ├── HeadlessSimulator.js    # Async non-blocking round-robin N×N balance simulator
│   │   ├── MinitContract.js        # Minit schema validator & safe default sanitizer
│   │   ├── Registry.js             # Central registry for Minits, traits, targeting & audio
│   │   ├── SceneManager.js         # Viewport scaling, orientation listener & scene lifecycle
│   │   ├── VFXPool.js              # Object pool for particles, shockwaves & damage popups
│   │   └── traitBeh.js             # Built-in universal combat & movement traits
│   ├── filters/
│   │   └── CRTFilter.js            # Optional retro scanline & CRT post-processing shader
│   ├── minits/
│   │   ├── index.js                # Built-in Minit roster registration
│   │   ├── absorb.js               # Gravity vortex leech & stat-scaling Minit
│   │   ├── ironmen.js              # Multi-weapon Minit (Homing Missiles, Ram Dash, Unibeam)
│   │   ├── laser.js                # Continuous tracking prism laser Minit
│   │   ├── moth.js                 # Two-stage metamorphosis Minit (Cocoon Egg -> Moth)
│   │   ├── murasaki.js             # Limitless Blue/Red attraction & Hollow Purple Minit
│   │   ├── pulsar.js               # 360° spiral bullet-hell turret Minit
│   │   ├── saitama.js              # 3-Tier Punch Minit (Normal, Consecutive, 9999 Serious)
│   │   └── waves.js                # Harmonic shockwave lob & paralysis Minit
│   ├── scenes/
│   │   ├── LoadingScene.js         # Boot loader, CustomMinitManager hydration & texture baking
│   │   ├── EditorScene.js          # Fighter selection screen & Workshop launcher
│   │   └── SimulationScene.js      # Real-time 1v1 combat arena & dual-orientation HUD
│   └── ui/
│       └── WorkshopModal.js        # Retro pixel modal for Minit Manager, Balance & Debug
├── index.html
├── package.json
└── vite.config.ts
```

---

## 🏗️ Game Architecture & How the Code Works

### 1. Boot & Asset Baking Pipeline (`LoadingScene.js` → `AssetBaker.js`)
Unlike traditional engines that load hundreds of tiny particle PNGs over the network, Minit Duels uses a **Hybrid Asset Pipeline**:
1. **Built-in Registration**: `src/minits/index.js` registers all built-in Minits into `MinitEngine.Registry`.
2. **Custom Minit Hydration**: `CustomMinitManager.hydrateFromStorage()` reads any user-imported Minits and their base64 PNG DataURLs from `localStorage` and registers them into `MinitEngine.Registry`.
3. **GPU Texture Baking (`AssetBaker.bake`)**:
   - Base character sprites (`textures.base`) are loaded from file paths or base64 DataURLs with `PIXI.SCALE_MODES.NEAREST` so pixel art stays razor-sharp.
   - Procedural textures (`customTextures`) are drawn onto an offscreen `PIXI.Graphics` canvas and converted into hardware GPU textures via `app.renderer.generateTexture()`.
   - Bitmap digits (`0–9` and `-`) are pre-rendered once into textures for zero-overhead floating damage numbers.

### 2. The Coordinate System: Grid Units vs. Pixel Coordinates
To keep combat math clean and resolution-independent, the engine separates **Logical Grid Units** from **Screen Pixels**:
- **Arena Grid Dimensions**: `16 columns × 16 rows` (`CFG.GRID.COLS = 16`, `CFG.GRID.ROWS = 16`).
- **Tile Size (`CFG.GRID.TS`)**: `20 pixels` per grid unit (`CFG.GRID.HALF_TS = 10`).
- **Total Arena Pixel Size**: `320 × 320 pixels` (`16 * 20`).
- **Playable Bounds**: `MIN_X: 0.75`, `MAX_X: 15.25`, `MIN_Y: 0.75`, `MAX_Y: 15.25`.
- **Converting Grid `(x, y)` to Pixel `(pX, pY)`**:
  ```javascript
  const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
  const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
  ```
  > **Rule of Thumb**: Player positions (`player.x`, `player.y`), entity positions (`e.x`, `e.y`), velocities (`dx`, `dy`), and `zoneRadius` are always in **Grid Units**. Particle spawns (`a.fxPool.spawnPhysics(...)`), shockwaves, and beams use **Pixel Coordinates** (`pX`, `pY`).

### 3. The 60Hz Fixed-Step Simulation Loop (`Arena.js`)
Every frame, `Arena.update(delta)` steps the logical simulation via `Arena.tickLogic()`:
1. **Player Physics & Wall Bouncing**: Updates each fighter's `(x, y)` by `(dx, dy)`. When a fighter hits an arena wall (`MIN_X`/`MAX_X` or `MIN_Y`/`MAX_Y`), velocity reflects and slightly randomizes angle (`±0.15 rad`) so fighters never get stuck in infinite loops.
2. **Action Cooldown Trigger**: Increments each fighter's cooldown timer `p.t`. When `p.t >= p.def.action.cd`:
   - Resets `p.t = 0`.
   - Acquires a target using `p.def.targeting` (e.g., `'closest_enemy'`).
   - Spawns `p.def.action.count` entities from the object pool (`this.spawnEnt(...)`) configured with `p.def.action.traitList` and a cloned copy of `p.def.payload`.
3. **Entity ECS Execution**: Loops backward through all active entities (`this.actE`) and runs every trait function in `e.traits`:
   ```javascript
   for (let tIdx = 0; tIdx < e.traits.length; tIdx++) {
     const traitFn = MinitEngine.Registry.traits[e.traits[tIdx]];
     if (traitFn) traitFn(e, this);
   }
   ```
4. **Zero-GC Recycling**: When an entity sets `e.dead = true` (or its lifespan `e.l` reaches `0`), it is swapped-and-popped from `this.actE` and pushed back into `this.deadE` without allocating or freeing memory.

### 4. Headless Simulation Architecture (`HeadlessSimulator.js`)
Because `Arena` supports `{ headless: true }`, the engine can run full combat simulations with dummy sprites and no-op VFX/Audio pools (`HEADLESS_FX_POOL`, `HEADLESS_BEAM_RENDERER`). This allows the **Balance Check** tab in the Workshop to run 100+ full battles in a fraction of a second while yielding to the browser UI thread between pairs.

---

## 🛠️ How to Create Your Own Minit (Complete Creator Guide)

Anyone can create a custom Minit! You only need **two files with the same name**:
1. **`<your_minit>.js`** — The JavaScript file defining your Minit's stats, abilities, VFX, and SFX.
2. **`<your_minit>.png`** *(Optional)* — A `16×16` pixel art icon (PNG, WebP, GIF, or SVG). If you don't have a PNG yet, the engine automatically generates a crisp procedural pixel icon using your Minit's `color`!

---

### Method A: Instant In-Game Import (Workshop Modal — No Build Needed!)

This is the fastest way for players and creators to add new Minits directly inside the running game:

1. **Download the Starter Template (Optional)**:
   - On the **Select Fighter** (Editor) screen, click the **`⚙ WORKSHOP`** button at the top right.
   - In the **`📦 MINIT MANAGER`** tab, click **`⬇ DOWNLOAD STARTER .JS`** to get a ready-to-edit `nova.js` file.
2. **Name Your Files Consistently**:
   - Give your `.js` file and `.png` sprite the **exact same filename stem** (case-insensitive):
     ```text
     samurai.js
     samurai.png
     ```
   - **Need extra sprite textures (like a transformed stage or summon)?** Name them `<stem>_<key>.png`:
     ```text
     samurai_blade.png   --> Automatically binds to textures.blade (or customTextures.blade)
     ```
3. **Import into the Game**:
   - Open **`⚙ WORKSHOP` → `📦 MINIT MANAGER`**.
   - **Drag and drop** both `samurai.js` and `samurai.png` into the dropzone (or click **`📂 SELECT .JS + .PNG FILES`**).
   - You can drop them together at the same time, or drop `samurai.js` first and drop `samurai.png` later whenever you finish drawing your sprite—the engine automatically syncs them!
4. **Play, Update, or Delete**:
   - Your custom Minit immediately appears in the **Select Fighter** grid with a purple `MOD` badge.
   - It is saved in your browser's `localStorage` so it stays installed even after refreshing the page.
   - To update your Minit, simply edit `samurai.js` and drop it into the Workshop again—it will hot-reload in place.
   - To remove a custom Minit, click **`🗑 DELETE`** next to its card in the Workshop.

---

### Method B: Adding a Built-In Minit to the Source Code

If you are contributing a permanent Minit to the game repository:

1. Create `src/minits/<id>.js` (e.g., `src/minits/samurai.js`) and export your Minit object (`export const MINIT_SAMURAI = { ... }`).
2. Place your `16×16` PNG sprite in `public/assets/minit_icon/<id>.png` (e.g., `public/assets/minit_icon/samurai.png`).
3. Register it in `src/minits/index.js`:
   ```javascript
   import { MINIT_SAMURAI } from './samurai.js';

   export const ALL_MINITS = [
     // ...existing minits,
     MINIT_SAMURAI
   ];
   ```

---

## 📋 Complete Minit Schema & Property Reference

Every Minit file exports a configuration object. `MinitContract.js` validates this object and fills in safe defaults if any optional fields are omitted.

```javascript
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_EXAMPLE = {
  // 1. IDENTITY
  id: 'example',                  // Unique lowercase ID (auto-derived from filename if omitted)
  name: 'Example',                // Display name shown on HUD & character cards
  color: 0x00ffcc,                // Hex theme color (used for HUD bars, shockwaves, hit numbers)
  desc: 'Short ability summary',  // Shown in tooltips & Workshop

  // 2. BASE STATS
  stats: {
    hp: 1200,                     // Starting & Maximum Hit Points (Standard range: 1000 - 1500)
    speed: 0.14                   // Movement speed in Grid Units per tick (Standard: 0.08 - 0.20)
  },

  // 3. TARGETING RULE
  targeting: {
    type: 'closest_enemy'         // Built-in: 'closest_enemy' or 'random_enemy'
  },

  // 4. DEATH VFX (Triggered when HP hits 0)
  deathVfx: {
    shake: 12,                    // Screen shake intensity
    flash: 0.65,                  // Full-arena white flash alpha (0.0 - 1.0)
    particleCount: 25,            // Number of explosion particles spawned
    shockRad: 140,                // Radius of death shockwave ring (in pixels)
    sound: 'explosion',           // Sound key played on death
    hitStop: 12                   // Freeze-frame ticks on death impact
  },

  // 5. PAYLOAD (Passed to every spawned entity as `e.p.payload`)
  payload: {
    dmg: 40,                      // Base damage (used by universal traits or your custom traits)
    zoneRadius: 1.2,              // Hitbox radius in Grid Units (1.0 grid unit = 20px)
    knockbackForce: 0.75,         // Knockback velocity impulse (if using knockbackOnHit)
    destroyOnHit: true,           // Whether projectile despawns after hitting an enemy
    hitVfx: {                     // Visual/audio feedback when `a.damagePlayer` is called
      shake: 4,                   // Screen shake on hit
      flash: 0.15,                // Screen flash alpha on hit
      particleCount: 6,           // Hit sparks count
      particleTex: 'fx_spark',    // Texture key for hit sparks
      sound: 'hit',               // Sound key played on hit
      playSound: true,            // Set false on rapid DoT ticks to avoid audio spam
      showText: true,             // Whether to pop up floating bitmap damage numbers
      textScale: 1.0,             // Scale multiplier for damage numbers (e.g. 2.2 for crits!)
      hitStop: 2                  // Impact freeze frames (1-2 for normal hits, 8-15 for heavies)
    }
  },

  // 6. ACTION LOOP (Triggered automatically every `cd` ticks)
  action: {
    cd: 90,                       // Cooldown in ticks (60 ticks = 1.0 second)
    count: 1,                     // Number of entities spawned per action trigger
    speed: 0.4,                   // Initial entity speed toward target (Grid Units / tick)
    life: 60,                     // Entity lifespan in ticks (60 ticks = 1.0 second)
    scatterSpread: 0.0,           // Random angular cone spread in radians (e.g. 0.3 for shotgun)
    sound: 'pew',                 // Sound key played when the action fires
    vfx: {                        // Optional entity visual metadata (passed as `e.p.vfx`)
      shake: 2,
      radius: 1.2,
      trailTex: 'fx_spark',
      trailDragX: 0.9,
      trailDragY: 0.9
    },
    // Ordered list of traits executed every tick on each spawned entity:
    traitList: ['moveAndBounce', 'damageRadiusOnHit', 'ageLife']
  },

  // 7. BASE SPRITE TEXTURES
  textures: {
    // Automatically synced with `<filename>.png` when imported via Workshop!
    base: './assets/minit_icon/example.png'
  },

  // 8. CUSTOM PROCEDURAL TEXTURES (Baked to GPU at startup/import)
  customTextures: {
    // key: (PIXI.Graphics) => void
  },

  // 9. CUSTOM SYNTHESIZED AUDIO (Registered into AudioSys)
  customAudio: {
    // key: AudioDefinitionObject
  },

  // 10. CUSTOM TRAIT FUNCTIONS (Registered into MinitEngine.Registry.traits)
  customTraits: {
    // traitName: (entity, arena) => void
  }
};
```

> **Note for Workshop Importers**: When importing via the in-game Workshop, `CustomMinitManager` automatically injects `CFG`, `PALETTE`, `UI_STYLE`, `FastMath`, `AudioSys`, `MinitEngine`, `Textures`, and `PIXI` into your script's scope. Standard `import` statements at the top of your `.js` file are safely stripped and resolved automatically, and you can use `export const MINIT_NAME = { ... }`, `export default { ... }`, or `module.exports = { ... }`.

---

## ⚡ Built-In Universal Traits Reference (`traitBeh.js`)

You can mix and match these built-in traits inside `action.traitList` (or inside sub-entities spawned via `a.spawnEnt`) without writing a single line of custom code:

| Trait Name | Description & Required `payload` / `p` Properties |
| :--- | :--- |
| **`ageLife`** | Decrements `e.l` by `1` each tick and sets `e.dead = true` when `e.l <= 0`. **Include this on almost every projectile or temporary zone!** |
| **`moveAndBounce`** | Moves the entity by `(e.dx, e.dy)` each tick and reflects off the arena walls (`CFG.ARENA_BOUNDS`) with `hit` sound and optional wall-shake (`e.p.vfx.shake`). |
| **`damageRadiusOnHit`** | Checks distance between the entity and all opposing players. If within `payload.zoneRadius` (or `vfx.radius`), deals `payload.dmg * owner.dmgMult` damage. If `payload.destroyOnHit !== false`, marks `e.dead = true`. |
| **`knockbackOnHit`** | Pushes enemies within `payload.zoneRadius` radially away from the entity with impulse `payload.knockbackForce` (default `0.75`). |
| **`trailParticles`** | Spawns a trailing particle every 2 ticks using `e.p.vfx.trailTex`, `trailVx`, `trailVy`, `trailDragX`, `trailDragY`. |
| **`modularBeam`** | Renders a high-fidelity multi-layered glowing vector laser with optional lightning arcs, muzzle sparks, impact flares, recoil, and line/tracking collision. Configured via `e.p.beamConfig` (see details below). |
| **`drainEnemyStats`** | Creates a gravitational/leech zone of radius `payload.zoneRadius` ticking every `payload.tickRate` frames. Reads `payload.drain`: `{ speed, hp, cd, scale, dmgMult, vfxLeech, vfxLeechColor, hitVfx }`. Sets `e.p.leechSuccess = true` when an enemy is inside. |
| **`buffOwnerStats`** | Pairs with `drainEnemyStats`. When `e.p.leechSuccess` is true, buffs the owner every `payload.tickRate` frames using `payload.buff`: `{ hp, speed, cd, scale, maxScale, dmgMult, maxDmgMult, sound }`. |
| **`lobToRandomArea`** | Picks a random destination inside the arena and flies there over `e.maxL` frames while rotating. On landing (`e.l <= 1`), spawns a secondary zone defined in `payload.lob.spawnOnDeath`: `{ life, traits, payload }`. |
| **`applyStatusInRadius`** | Inflicts a status effect entity onto any enemy within `payload.zoneRadius` if they don't already have `payload.debuff.payload.id`. Configured via `payload.debuff`: `{ duration, trait: 'statusEffect', payload: { id, icon, dmg, tick, vfxTex, hitVfx } }`. |
| **`statusEffect`** | Attaches to a target (`e.p.targetId`), displays a status icon above them, spawns `payload.vfxTex` particles, and deals `payload.dmg` every `payload.tick` frames until `e.l` expires. |
| **`transformOwner`** | Permanently evolves the owner Minit mid-battle (used by **Moth**). Reads `payload.transformation`: `{ texture, stats: { speed, hpAdd }, action, sound, vfx: { flash, shake, particleCount, particleTex } }`. |

### Using `modularBeam` (High-Fidelity Vector Laser Trait)
To fire a glowing laser beam from a custom trait or action, spawn an entity with `traits: ['modularBeam']` and pass `beamConfig` inside `p`:

```javascript
a.spawnEnt({
  x: owner.x,
  y: owner.y,
  l: 45, // Beam duration in ticks
  traits: ['modularBeam'],
  p: {
    ownerId: owner.id,
    color: owner.def.color,
    beamConfig: {
      trackTarget: false,          // true = locks onto enemy; false = fires along aimAngle line
      aimAngle: angleToEnemy,      // Angle in radians (if trackTarget is false)
      beamLength: 460,             // Length in pixels
      coreColor: 0xffffff,         // Inner core hex color
      sheathColor: 0x00e5ff,       // Middle sheath hex color
      glowColor: 0x0088ff,         // Outer bloom hex color
      coreWidth: 5,                // Core thickness in px
      sheathWidth: 14,             // Sheath thickness in px
      glowWidth: 28,               // Outer glow thickness in px
      hasLightning: true,          // crackling electric arcs along the beam
      lightningColor: 0xffffff,
      lightningBranches: 2,
      jitter: 2,                   // Beam turbulence
      recoilForce: 0.015,          // Pushes owner backward while firing
      tickRate: 4,                 // Deals damage every N ticks
      damage: 14,                  // Damage per tick
      rampingDamage: 0.5,          // Optional +50% damage ramp over beam lifetime
      knockbackForce: 0.4,         // Pushes hit enemies along beam direction
      sparkTex: 'fx_spark',        // Muzzle & impact particle texture key
      hitSound: 'hit',
      soundVolume: 0.3
    }
  }
});
```

---

## 🧠 Writing Custom Traits (`customTraits`) & Arena API

When you want your Minit to do something completely unique—like Saitama's 3-Tier Punch escalation, Ironman's multi-weapon cycle, or Gojo's Red + Blue = Hollow Purple fusion—you write a custom trait function inside `customTraits`:

```javascript
customTraits: {
  myCustomBehavior: (e, a) => {
    // e = the active Entity instance
    // a = the Arena simulation instance
  }
}
```

### 1. The Entity Object (`e`)
Every entity spawned by `action` or `a.spawnEnt(...)` has the following properties:
- `e.x`, `e.y` *(number)*: Current position in **Grid Units** (`0` to `16`).
- `e.curX`, `e.curY` *(number)*: Internal position used by `moveAndBounce`.
- `e.dx`, `e.dy` *(number)*: Velocity in **Grid Units per tick**.
- `e.l` *(number)*: Remaining lifespan in ticks (`60` ticks = 1 second).
- `e.maxL` *(number)*: Initial total lifespan when spawned.
- `e.dead` *(boolean)*: Set `e.dead = true` at any time to immediately despawn and recycle the entity.
- `e.traits` *(string[])*: Array of trait names executed each tick.
- `e.p` *(object)*: Custom per-entity state bag. By default, when spawned from a Minit's `action`, `e.p` contains:
  - `e.p.ownerId` (`'P1'` or `'P2'`)
  - `e.p.color` (The owner Minit's hex color)
  - `e.p.payload` (A shallow clone of your Minit's `payload` object)
  - `e.p.vfx` (Your Minit's `action.vfx` object)
  - You can freely store any custom variables on `e.p` (e.g., `e.p.phase = 1`, `e.p.angle = 0`, `e.p.hitTargets = new Set()`).

### 2. The Arena Object (`a`) & Player State
Inside any trait `(e, a)`, `a` gives you full control over the battlefield:

#### Finding the Owner and Enemies
```javascript
// Get the Minit player who spawned this entity
const owner = a.playerMap[e.p.ownerId] || a.players.find(p => p.id === e.p.ownerId);
if (!owner || owner.hp <= 0) {
  e.dead = true;
  return;
}

// Get the closest living enemy player
const enemy = a.getValidTarget(owner.id, { type: 'closest_enemy' });

// Or loop over all opposing players
for (let i = 0; i < a.players.length; i++) {
  const target = a.players[i];
  if (target.id !== owner.id && target.hp > 0) {
    // Check distance in Grid Units
    const dist = FastMath.dist(e.x, e.y, target.x, target.y);
  }
}
```

#### Player Properties (`owner` / `target`)
- `player.id`: `'P1'` or `'P2'`
- `player.x`, `player.y`: Position in Grid Units (`0.75` to `15.25`)
- `player.dx`, `player.dy`: Velocity in Grid Units per tick
- `player.hp`, `player.maxHp`: Current and max HP
- `player.dmgMult`: Current damage multiplier (default `1.0`)
- `player.baseScale`: Visual sprite size multiplier (default `1.0`)
- `player.aS`: `{ x, y, tX, tY }` squash-and-stretch spring animation target (`player.aS.tX = 1.6` gives a punchy lunge effect!)
- `player.fT`: White damage-flash timer in ticks (`player.fT = 4` flashes the character white)
- `player.spr`: The `PIXI.Sprite` (or headless dummy sprite) representing the fighter (`player.spr.rotation`, `player.spr.tint`)

#### Dealing Damage (`a.damagePlayer`)
```javascript
const dMult = owner.dmgMult || 1.0;
a.damagePlayer(
  target.id,
  {
    dmg: 55 * dMult,
    hitVfx: {
      shake: 6,                 // Camera shake
      flash: 0.2,               // White screen flash (0.0 - 1.0)
      hitStop: 3,               // Freeze-frames for impact weight
      particleCount: 8,         // Number of impact particles
      particleTex: 'fx_spark',  // Texture key for impact particles
      sound: 'hit',             // Sound effect key
      playSound: true,
      showText: true,           // Floating damage number
      textScale: 1.2            // Size of damage number
    },
    // Optional directional knockback embedded in damage call:
    knockback: {
      fromX: e.x,
      fromY: e.y,
      force: 0.9,
      shake: 6
    }
  },
  owner.def.color // Color of the floating damage numbers & shockwave
);
```

#### Applying Knockback Directly (`a.applyKnockback`)
```javascript
// Radial knockback away from (e.x, e.y)
a.applyKnockback(target.id, {
  fromX: e.x,
  fromY: e.y,
  force: 1.1,
  shake: 8,
  playSound: true
});

// Or explicit vector knockback
a.applyKnockback(target.id, {
  forceX: Math.cos(angle) * 1.2,
  forceY: Math.sin(angle) * 1.2,
  shake: 8
});
```

#### Spawning Sub-Entities (`a.spawnEnt`)
Any trait can spawn child projectiles, explosions, or lingering zones:
```javascript
a.spawnEnt({
  x: e.x,
  y: e.y,
  dx: Math.cos(angle) * 0.4,
  dy: Math.sin(angle) * 0.4,
  l: 40, // Lifespan in ticks
  traits: ['moveAndBounce', 'damageRadiusOnHit', 'ageLife'],
  p: {
    ownerId: e.p.ownerId,
    color: e.p.color,
    payload: {
      dmg: 25,
      zoneRadius: 1.1,
      destroyOnHit: true,
      hitVfx: e.p.payload.hitVfx
    }
  }
});
```

#### Triggering Screen Juice & Audio
```javascript
a.shake = Math.max(a.shake, 10);   // Add camera shake
a.hitStop = Math.max(a.hitStop, 5);// Add impact freeze-frames
a.triggerFlash(0.4);               // Flash arena background (0.0 to 1.0)
AudioSys.play('explosion', 0.8);   // Play any built-in or customAudio sound key
```

---

## 🎨 Creating Custom VFX (`customTextures`) & SFX (`customAudio`)

### 1. Spawning Particles & Shockwaves (`a.fxPool`)
Convert grid coordinates to pixel coordinates first, then call `a.fxPool`:

```javascript
const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

// 1. Spawn a physics particle / sprite
a.fxPool.spawnPhysics(
  'fx_my_orb',  // Texture key (from customTextures or built-in AssetTemplate)
  pX,           // Pixel X
  pY,           // Pixel Y
  vx,           // Pixel velocity X per tick (note: physics pool applies +0.5Y gravity if life > 2)
  vy,           // Pixel velocity Y per tick
  15,           // Lifespan in ticks (use `2` with `vx=0, vy=0` to render a 1-frame projectile sprite!)
  0.9,          // Drag X (1.0 = no drag)
  0.9,          // Drag Y (1.0 = no drag)
  true,         // scaleDown: true shrinks particle over its life; false keeps scale = 1
  0x00ffcc,     // Hex tint (use 0xffffff to preserve original texture colors)
  1.0           // Initial alpha (0.0 - 1.0)
);

// 2. Spawn an expanding shockwave ring
a.fxPool.spawnShockwave(
  pX,           // Pixel X
  pY,           // Pixel Y
  0x00ffcc,     // Hex color
  110,          // Max radius in pixels
  4             // Ring thickness
);

// 3. Spawn floating bitmap number (e.g. green heal text)
a.fxPool.spawnDmgText(pX, pY, 50, 0x00ff55, 1.0);
```

> **Pro Tip — Rendering a Moving Projectile Sprite**: Because `VFXPool` is pre-allocated and super fast, projectiles in Minit Duels render their body each tick by calling `a.fxPool.spawnPhysics('fx_my_proj', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff)` inside their trait!

### 2. Drawing `customTextures` with `PIXI.Graphics`
Every entry in `customTextures` is a function `(g) => { ... }` that receives a `PIXI.Graphics` instance and gets baked into a GPU texture:

```javascript
customTextures: {
  // Glowing plasma shuriken
  fx_plasma_star: (g) => {
    // Outer glow
    g.beginFill(0x00ffcc, 0.35).drawCircle(0, 0, 9).endFill();
    // 4-point star blades
    g.beginFill(0x00ffcc, 1.0)
      .drawPolygon([0, -8, 2, -2, 8, 0, 2, 2, 0, 8, -2, 2, -8, 0, -2, -2])
      .endFill();
    // White-hot core
    g.beginFill(0xffffff, 1.0).drawRect(-2, -2, 4, 4).endFill();
  }
}
```

**Built-in Textures Always Available**:
- `'fx_spark'` (4×4 white pixel spark)
- `'fx_dust'` (smoke/dust puff)
- `'fx_ring'` (shockwave ring)
- `'icon_poison'`, `'icon_paralysis'` (status icons)

### 3. Designing `customAudio` with the Web Audio Synthesizer
You never need external audio files! Define synthesizer patches in `customAudio`:

#### Mode 1: Oscillator Synth (`noise: false` or omitted)
```javascript
customAudio: {
  // Laser pew (high to low frequency exponential sweep)
  my_laser_pew: {
    t: 'sawtooth',     // Waveform: 'sine', 'square', 'sawtooth', 'triangle'
    f0: 920,           // Start frequency in Hz (can also be a function: () => 800 + Math.random() * 200)
    f1: 140,           // End frequency in Hz
    v: 0.16,           // Volume (0.0 to 0.4 recommended)
    d: 0.15,           // Duration in seconds
    ramp: 'exp',       // Frequency curve: 'exp' (exponential), 'lin' (linear), or 'lin_exp' (uses f0 -> f1 -> f2)
    throttle: 0.04     // Minimum seconds between replays so rapid hits never clip
  },

  // Retro arpeggio power-up chime (using `seq`)
  my_powerup_chime: {
    t: 'square',
    f0: 440,
    seq: [554, 659, 880, 1108], // Plays each frequency step every 0.05s!
    v: 0.14,
    d: 0.28,
    throttle: 0.08
  }
}
```

#### Mode 2: Filtered White Noise + Sub-Bass Punch (`noise: true`)
Great for explosions, thunderclaps, wind gusts, and heavy impacts:
```javascript
customAudio: {
  my_heavy_boom: {
    noise: true,       // Enables white-noise buffer source
    fType: 'lowpass',  // BiquadFilter type: 'lowpass', 'bandpass', 'highpass'
    f0: 1200,          // Filter cutoff start frequency (Hz)
    f1: 60,            // Filter cutoff end frequency (Hz)
    oF0: 160,          // Optional layered sine sub-bass start frequency (Hz)
    oF1: 28,           // Optional layered sine sub-bass end frequency (Hz)
    v: 0.35,           // Volume
    d: 0.45,           // Duration in seconds
    throttle: 0.08
  }
}
```

**Built-in Sound Keys Always Available**:
- `'hit'`, `'bounce'`, `'pew'`, `'explosion'`, `'crush'`, `'slash'`, `'beep'`, `'start'`

---

## 📦 Complete Copy-Paste Minit Templates

Below are **2 complete, production-ready Minit files** you can copy, save as `.js`, and immediately drop into the **`⚙ WORKSHOP`** modal!

### Template 1: `frostbite.js` (Cryo Nova & Ice Shard Barrage)
Save as `frostbite.js` (and optionally pair with a 16×16 `frostbite.png`):

```javascript
// ============================================================
// CUSTOM MINIT: FROSTBITE
// Fires 3 bouncing cryo-shards that slow enemies & erupt in an ice nova
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_FROSTBITE = {
  id: 'frostbite',
  name: 'Frostbite',
  color: 0x33ddff,
  desc: 'Fires 3 bouncing ice shards that chill enemies & detonate in a cryo-ring.',

  stats: {
    hp: 1250,
    speed: 0.13
  },

  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 14,
    flash: 0.7,
    particleCount: 30,
    shockRad: 150,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    dmg: 26,
    zoneRadius: 1.15,
    chillSlowFactor: 0.35,
    novaDmg: 45,
    novaRadius: 2.4,
    destroyOnHit: true,
    hitVfx: {
      shake: 4,
      flash: 0.12,
      particleCount: 7,
      particleTex: 'fx_ice_crystal',
      sound: 'frost_shatter',
      playSound: true,
      hitStop: 2
    }
  },

  action: {
    cd: 95,
    count: 3,
    speed: 0.36,
    life: 55,
    scatterSpread: 0.42,
    sound: 'frost_cast',
    traitList: ['moveAndBounce', 'frostShardBehavior', 'ageLife']
  },

  textures: {
    base: './assets/minit_icon/frostbite.png'
  },

  customTextures: {
    fx_ice_shard: (g) => {
      g.beginFill(0x33ddff, 0.35).drawCircle(0, 0, 8).endFill();
      g.beginFill(0x88eeff, 1.0).drawPolygon([0, -7, 4, 0, 0, 7, -4, 0]).endFill();
      g.beginFill(0xffffff, 1.0).drawRect(-1.5, -3, 3, 6).endFill();
    },
    fx_ice_crystal: (g) => {
      g.beginFill(0xaaffff, 1.0).drawRect(-2, -2, 4, 4).endFill();
      g.beginFill(0xffffff, 1.0).drawRect(-1, -1, 2, 2).endFill();
    }
  },

  customAudio: {
    frost_cast: {
      t: 'triangle',
      f0: 1200,
      f1: 480,
      v: 0.15,
      d: 0.12,
      ramp: 'exp',
      throttle: 0.04
    },
    frost_shatter: {
      noise: true,
      fType: 'bandpass',
      f0: 2400,
      f1: 600,
      oF0: 900,
      oF1: 300,
      v: 0.22,
      d: 0.16,
      throttle: 0.04
    }
  },

  customTraits: {
    frostShardBehavior: (e, a) => {
      const owner = a.playerMap?.[e.p.ownerId] || a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload;
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Render shard body & frost trail
      a.fxPool.spawnPhysics('fx_ice_shard', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);
      if (e.l % 3 === 0) {
        a.fxPool.spawnPhysics(
          'fx_ice_crystal',
          pX + FastMath.randRange(-4, 4),
          pY + FastMath.randRange(-4, 4),
          -e.dx * 0.8,
          -e.dy * 0.8,
          10,
          0.9,
          0.9,
          true,
          0x33ddff
        );
      }

      // Check collision with enemy
      const radSq = pay.zoneRadius * pay.zoneRadius;
      for (let i = 0; i < a.players.length; i++) {
        const tgt = a.players[i];
        if (tgt.id !== owner.id && tgt.hp > 0 && FastMath.distSq(e.x, e.y, tgt.x, tgt.y) <= radSq) {
          const dMult = owner.dmgMult || 1.0;
          a.damagePlayer(tgt.id, { ...pay, dmg: pay.dmg * dMult }, e.p.color);

          // Apply brief movement chill
          tgt.x -= tgt.dx * (pay.chillSlowFactor || 0.35);
          tgt.y -= tgt.dy * (pay.chillSlowFactor || 0.35);

          a.fxPool.spawnShockwave(pX, pY, 0x33ddff, 50, 3);
          e.dead = true;
          return;
        }
      }

      // On last frame of life, erupt into a miniature cryo-ring!
      if (e.l === 1) {
        a.fxPool.spawnShockwave(pX, pY, 0x88eeff, 65, 3);
        const novaRadSq = (pay.novaRadius || 2.2) ** 2;
        for (let i = 0; i < a.players.length; i++) {
          const tgt = a.players[i];
          if (tgt.id !== owner.id && tgt.hp > 0 && FastMath.distSq(e.x, e.y, tgt.x, tgt.y) <= novaRadSq) {
            const dMult = owner.dmgMult || 1.0;
            a.damagePlayer(tgt.id, { ...pay, dmg: (pay.novaDmg || 40) * dMult }, e.p.color);
          }
        }
      }
    }
  }
};
```

---

### Template 2: `valkyrie.js` (Sky-Dive Spear Strike & Judgment Beam)
Save as `valkyrie.js`:

```javascript
// ============================================================
// CUSTOM MINIT: VALKYRIE
// Dashes toward the enemy with a golden spear & calls down a Judgment Beam
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_VALKYRIE = {
  id: 'valkyrie',
  name: 'Valkyrie',
  color: 0xffd700,
  desc: 'Lunges with a golden spear dash followed by a piercing Judgment Laser.',

  stats: {
    hp: 1300,
    speed: 0.14
  },

  targeting: { type: 'closest_enemy' },

  payload: {
    dashDmg: 58,
    beamDmg: 15,
    zoneRadius: 1.4,
    knockbackForce: 1.1,
    hitVfx: {
      shake: 7,
      flash: 0.25,
      particleCount: 10,
      particleTex: 'fx_gold_spark',
      sound: 'valk_impact',
      playSound: true,
      hitStop: 4
    }
  },

  action: {
    cd: 115,
    count: 1,
    speed: 0,
    life: 45,
    sound: 'valk_dash',
    traitList: ['valkyrieAssault', 'ageLife']
  },

  textures: {
    base: './assets/minit_icon/valkyrie.png'
  },

  customTextures: {
    fx_gold_spark: (g) => {
      g.beginFill(0xffd700, 1.0).drawPolygon([0, -5, 2, 0, 0, 5, -2, 0]).endFill();
      g.beginFill(0xffffff, 1.0).drawRect(-1, -1, 2, 2).endFill();
    }
  },

  customAudio: {
    valk_dash: {
      t: 'sawtooth',
      f0: 320,
      f1: 960,
      v: 0.16,
      d: 0.18,
      ramp: 'exp',
      throttle: 0.05
    },
    valk_impact: {
      noise: true,
      fType: 'lowpass',
      f0: 1600,
      f1: 90,
      oF0: 240,
      oF1: 45,
      v: 0.28,
      d: 0.25,
      throttle: 0.05
    }
  },

  customTraits: {
    valkyrieAssault: (e, a) => {
      const owner = a.playerMap?.[e.p.ownerId] || a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const tgt = a.getValidTarget(owner.id, { type: 'closest_enemy' });
      if (!tgt) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload;

      // Phase 1 (first 20 ticks): High-speed golden spear lunge toward target
      if (e.l > 25) {
        const ang = FastMath.angle(owner.x, owner.y, tgt.x, tgt.y);
        owner.dx = Math.cos(ang) * 0.28;
        owner.dy = Math.sin(ang) * 0.28;
        owner.aS.tX = 1.35;
        owner.aS.tY = 0.75;

        const oX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const oY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
        a.fxPool.spawnPhysics('fx_gold_spark', oX, oY, -owner.dx * 8, -owner.dy * 8, 10, 0.88, 0.88, true, 0xffd700);

        if (!e.p.hasDashedHit && FastMath.dist(owner.x, owner.y, tgt.x, tgt.y) <= pay.zoneRadius) {
          e.p.hasDashedHit = true;
          const dMult = owner.dmgMult || 1.0;
          a.damagePlayer(tgt.id, { ...pay, dmg: pay.dashDmg * dMult }, e.p.color);
          a.applyKnockback(tgt.id, {
            fromX: owner.x,
            fromY: owner.y,
            force: pay.knockbackForce,
            shake: 8,
            playSound: false
          });
          a.fxPool.spawnShockwave(oX, oY, 0xffd700, 95, 4);
        }
      }

      // Phase 2 (tick 25): Fire a piercing golden Judgment Beam at the enemy
      if (e.l === 25) {
        // Restore normal movement speed
        const curAng = Math.atan2(owner.dy, owner.dx);
        owner.dx = Math.cos(curAng) * owner.def.stats.speed;
        owner.dy = Math.sin(curAng) * owner.def.stats.speed;

        const aimAngle = FastMath.angle(owner.x, owner.y, tgt.x, tgt.y);
        a.spawnEnt({
          x: owner.x,
          y: owner.y,
          l: 22,
          traits: ['modularBeam'],
          p: {
            ownerId: owner.id,
            color: 0xffd700,
            beamConfig: {
              trackTarget: false,
              aimAngle,
              beamLength: 460,
              coreColor: 0xffffff,
              sheathColor: 0xffd700,
              glowColor: 0xffaa00,
              coreWidth: 5,
              sheathWidth: 14,
              glowWidth: 28,
              hasLightning: true,
              lightningColor: 0xfff0aa,
              recoilForce: 0.01,
              tickRate: 4,
              damage: pay.beamDmg,
              knockbackForce: 0.35,
              sparkTex: 'fx_gold_spark',
              hitSound: 'hit'
            }
          }
        });
      }
    }
  }
};
```

---

## ⚖️ Balancing & Debugging Your Minit

Once you create or import a Minit, use the built-in **Workshop Tools** (`⚙ WORKSHOP` button in the Editor Scene) to make sure it is fair, fun, and bug-free:

### 1. Headless Balance Check (`⚖ BALANCE CHECK` Tab)
- Choose **Runs per Pair** (`20`, `50`, or `100` matches per matchup) and **Max Match Time** (`45s`, `60s`, or `90s`).
- Click **`▶ RUN SIMULATION`**.
- Review the **Overall Leaderboard**:
  - **Winrate %**: Aim for **45% – 55%** across the roster for a well-balanced Minit (`BALANCED` tier).
  - **Avg TTK (Time-To-Kill)**: Typical duels last **12s – 30s**.
  - **Avg DMG & DPS**: Compare offensive output against tanks and glass cannons.
- Review the **Matchup Matrix (Row vs. Column)** at the bottom to spot hard counters or 100%-0% lopsided matchups.

### 2. Live Visual Debugging (`🐛 DEBUG & TELEMETRY` Tab)
- Enable **Master Debug Mode** and launch a battle.
- **Show Hitboxes & Attack Zones**: Renders exact pixel-accurate circles for player collision radii and active entity `zoneRadius` hitboxes so you can verify your attacks match their visual sprites.
- **Show Velocity & Aim Vectors**: Displays movement arrows and targeting lock-on lines.
- **Simulation Speed Multiplier**: Set speed to **`0.25x`** or **`0.5x`** to inspect frame-by-frame projectile behavior and particle timing, or **`2x` / `4x`** to fast-forward long fights.

---

## 🚀 Development, Build & GitHub Workflow

### Local Development Commands
```bash
# 1. Install dependencies
npm install

# 2. Start the development server (runs on port 3000)
npm run dev

# 3. Build production bundle
npm run build

# 4. Preview production build
npm run preview
```

### Pushing Minit Updates to GitHub
1. **Via Google AI Studio UI**: Click the **GitHub / Sync** icon in the workspace header, review modified files in `src/minits/`, enter a commit message, and click **Commit & Push**.
2. **Via Git CLI**:
   ```bash
   git status
   git add src/ README.md
   git commit -m "Add new minits, balance tuning, and complete creator documentation"
   git push origin main
   ```
