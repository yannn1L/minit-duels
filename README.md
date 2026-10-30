# ⚔️ Minit Duels

An arcade 1v1 pixel auto-battler game built with **PixiJS (WebGL)**, **Synthesized Web Audio API**, and **Vite**. Features responsive dual-orientation layouts (Desktop Landscape & Mobile Portrait), crisp HD subpixel rendering, modular knockback mechanics, and an in-browser developer suite (`/?dev`) with live stats tuning, direct disk persistence, and a headless round-robin balancing simulator.

---

## 🎮 Features

- **Dual-Orientation Responsive Layout**:
  - **Landscape (Desktop)**: Arena is centered right in the middle, framed symmetrically by Player 1 and Player 2 fighter cards on the left and right.
  - **Portrait (Mobile)**: Arena at the top with side-by-side player HUDs docked underneath.
- **Crisp HD Pixel Engine**:
  - 16×16 retro character sprites rendered with strict `SCALE_MODES.NEAREST` and `WRAP_MODES.CLAMP` (no texture bleeding or blur).
  - Subpixel motion interpolation (`ROUND_PIXELS = false`) eliminates movement jittering.
  - Shape-accurate damage flash matching the exact silhouette of each minit.
- **Rich Combat Mechanics**:
  - Modular Knockback system (`arena.applyKnockback`).
  - Homing missiles with arc guidance, smoke trails, and explosive detonation.
  - Supersonic thruster ram dash with wall bouncing.
  - Piercing Unibeam and Hollow Purple energy rays.
  - Spore swarms, expanding vortex suction zones, and harmonic shockwaves.
- **In-Browser Developer Suite (`/?dev`)**:
  - Real-time stat editor (HP, Speed, Cooldown, Damages).
  - Direct disk file persistence via local Vite dev server API.
  - Multi-texture editor with external file import (`.png`, `.svg`).
  - Headless round-robin tournament simulator running 400+ duels in seconds to output win-rate matrices and tier rankings.

---

## 📁 Project Structure

```
├── public/
│   └── assets/
│       └── minit_icon/       # PNG and SVG character sprites (16x16)
├── src/
│   ├── config.js             # Data-driven responsive layout & game physics configs
│   ├── main.js               # Application bootstrap, PIXI app, orientation & resize handler
│   ├── engine/
│   │   ├── Arena.js          # Core combat simulation, knockback system, player movement
│   │   ├── AssetBaker.js     # Texture loading, nearest-neighbor scaling & procedural baking
│   │   ├── AssetTemplate.js  # Base visual assets, grid floor & guard graphics
│   │   ├── AudioSys.js       # Synthesized sound engine (Web Audio API oscillators)
│   │   ├── FastMath.js       # Fast lookup tables (Sin, Cos, distances, RNG)
│   │   ├── Registry.js       # Global registry for minits, traits, targeting & textures
│   │   ├── traitBeh.js       # Entity Component System (ECS) trait behaviors
│   │   └── VFXPool.js        # Object pooling for damage popups, particles & shockwaves
│   ├── minits/
│   │   ├── index.js          # Minit registry factory & roster array
│   │   ├── laser.js          # Laser beam minit
│   │   ├── pulsar.js         # 360° rapid fire drone minit
│   │   ├── absorb.js         # Vortex drain minit
│   │   ├── waves.js          # Rhythm shockwave minit
│   │   ├── moth.js           # Cocoon incubation & winged moth minit
│   │   ├── murasaki.js       # Gojo Hollow Purple & cursed aura minit
│   │   └── ironmen.js        # Ironman (4 Homing Missiles, Thruster Ram, Unibeam)
│   ├── dev/
│   │   ├── DevConsole.js     # Floating in-browser dev panel (active at /?dev)
│   │   ├── devStyles.css     # Cyber-dark styles for dev console
│   │   └── HeadlessSimulator.js # Headless tournament & balancing matrix runner
│   └── scenes/
│       ├── LoadingScene.js   # Asset loading & system boot screen
│       ├── EditorScene.js    # Compact character selection menu
│       └── SimulationScene.js# Real-time combat scene with HUDs
├── vite.config.ts            # Vite config with dev-server disk persistence plugin
└── package.json
```

---

## 🛠️ Complete Tutorial: Creating a New Minit from Scratch

Every character in Minit Duels is called a **Minit**. A Minit is a declarative JavaScript module that defines stats, attack payloads, behaviors, textures, audio, and custom traits.

### Step 1: Create the Minit File (`src/minits/<id>.js`)

Create a new file in `src/minits/`, for example `src/minits/ninja.js`:

```javascript
// ============================================================
// MINIT: NINJA (Example Custom Minit)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_NINJA = {
  // 1. Identity & Visual Identity
  id: 'ninja',
  name: 'Ninja',
  color: 0x33ff88, // Primary color theme (hex)
  desc: 'Throws triple piercing shurikens & smoke-bombs.',

  // 2. Base Combat Stats
  stats: {
    hp: 1100,      // Hit points (typical range: 800 - 1500)
    speed: 0.18    // Grid units per frame (typical range: 0.10 - 0.22)
  },

  // 3. Targeting Strategy
  // Options: 'closest_enemy', 'farthest_enemy', 'lowest_hp', 'highest_hp'
  targeting: { type: 'closest_enemy' },

  // 4. Death FX & Juice
  deathVfx: {
    shake: 10,
    flash: 0.7,
    particleCount: 25,
    shockRad: 120,
    sound: 'explosion',
    hitStop: 10
  },

  // 5. Default Attack Payload
  payload: {
    dmg: 28,               // Base damage dealt
    zoneRadius: 1.2,       // Collision radius
    knockbackForce: 0.6,   // Knockback impulse applied on hit
    destroyOnHit: true,
    hitVfx: {
      shake: 4,
      flash: 0.2,
      particleCount: 4,
      sound: 'hit',
      hitStop: 2
    }
  },

  // 6. Action Loop (Primary Ability Trigger)
  action: {
    cd: 120,               // Cooldown in simulation ticks (60 ticks = 1 sec)
    count: 3,              // Number of entity instances spawned
    speed: 0.35,           // Initial projectile velocity
    life: 50,              // Lifespan in frames
    scatterSpread: 0.3,    // Cone angle spread in radians
    sound: 'ninja_throw',  // Sound effect played on fire
    traitList: ['ninjaShuriken', 'damageRadiusOnHit', 'ageLife']
  },

  // 7. Textures
  textures: {
    base: './assets/minit_icon/ninja.png' // 16x16 PNG located in public/assets/minit_icon/
  },

  // 8. Custom Procedural Sprites (Optional Vector FX)
  customTextures: {
    fx_shuriken: (g) => {
      // Draw sharp pixel art shuriken
      g.beginFill(0xddffff).drawRect(-2, -2, 4, 4);
      g.beginFill(0x33ff88).drawRect(-1, -4, 2, 8).drawRect(-4, -1, 8, 2);
      g.endFill();
    }
  },

  // 9. Custom Synthesized Sound Effects (Optional)
  customAudio: {
    ninja_throw: {
      t: 'triangle',
      f0: 400,
      f1: 850,
      v: 0.15,
      d: 0.08,
      ramp: 'exp',
      throttle: 0.04
    }
  },

  // 10. Custom Behaviors (Traits)
  customTraits: {
    ninjaShuriken: (e, a) => {
      // Rotate the shuriken
      e.rotation = (e.rotation || 0) + 0.3;
      e.x += e.dx;
      e.y += e.dy;

      // Render the shuriken sprite at world coordinates
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics('fx_shuriken', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);
    }
  }
};
```

### Step 2: Register in `src/minits/index.js`

Open `src/minits/index.js`, import your new minit, and add it to `ALL_MINITS`:

```javascript
import { MINIT_NINJA } from './ninja.js'; // 1. Import your minit

export const ALL_MINITS = [
  MINIT_LASER,
  MINIT_PULSAR,
  MINIT_ABSORB,
  MINIT_WAVES,
  MINIT_MOTH,
  MINIT_MURASAKI,
  MINIT_IRONMEN,
  MINIT_NINJA // 2. Add to array
];
```

### Step 3: Add the Sprite Icon Asset

Place your 16×16 pixel PNG or SVG sprite inside:
```
public/assets/minit_icon/ninja.png
```

Done! The new Minit will instantly show up in the character select screen, duels, and developer balancing suite.

---

## ⚡ How `traitBeh` (Trait Behavior Engine) Works

The combat system in Minit Duels is built on a lightweight **Entity-Component-System (ECS)** pattern powered by `src/engine/traitBeh.js` and `Arena.js`.

### 1. The Entity Lifecycle

When an action triggers or an attack is launched, the arena spawns an entity from an object pool:

```javascript
arena.spawnEnt({
  x: startX,
  y: startY,
  dx: velocityX,
  dy: velocityY,
  l: lifespanInFrames,
  traits: ['moveAndBounce', 'damageRadiusOnHit', 'ageLife'],
  p: {
    ownerId: owner.id,
    color: 0x33ff88,
    payload: { dmg: 35, knockbackForce: 0.8 }
  }
});
```

During each simulation tick in `Arena.tickLogic()`:
1. Every active entity in `arena.actE` runs all functions in its `traits` array:
   ```javascript
   e.traits.forEach(traitName => {
     const traitFn = MinitEngine.Registry.traits[traitName];
     if (traitFn) traitFn(e, this);
   });
   ```
2. If `e.dead === true` or lifespan reaches `0`, the entity is returned to the pool (`arena.deadE`) for zero-garbage collection overhead.

### 2. Trait Function Signature

Every trait is a pure execution function:

```javascript
function traitName(entity, arena) {
  // entity (e): { x, y, dx, dy, l, maxL, dead, p: { ownerId, payload, ... } }
  // arena (a): Full access to players (a.players), particle spawns, damage, knockback
}
```

### 3. Built-in Universal Traits in `traitBeh.js`

You can combine existing universal traits to create new attack behaviors:

| Trait Name | Purpose & Behavior |
| :--- | :--- |
| **`ageLife`** | Decrements `e.l` by 1 per frame; marks `e.dead = true` when life expires. |
| **`moveAndBounce`** | Moves `e.x += e.dx` and bounces off arena boundary walls. |
| **`damageRadiusOnHit`** | Detects collision with any opposing player within radius. Inflicts damage and applies payload juice/knockback. |
| **`knockbackOnHit`** | Modular knockback impulse: calculates radial angle from entity to target and calls `arena.applyKnockback(targetId, { fromX, fromY, force })`. |
| **`homingMissile`** | Smoothly steers toward enemy with clamped turn rate and acceleration, producing smoke trails. |
| **`trailParticles`** | Spawns trailing exhaust particles behind moving entities. |
| **`applyStatusInRadius`**| Inflicts debuffs (slow, burn, vulnerability) to enemies in radius. |
| **`lobToRandomArea`** | Arcs a projectile upwards to an area and explodes on landing. |

### 4. Creating a Custom Attack Trait

You can register traits globally via `MinitEngine.Registry.addTrait('name', fn)` or declare them locally inside `customTraits` in your minit file:

```javascript
customTraits: {
  orbitalShield: (e, a) => {
    const owner = a.players.find(p => p.id === e.p.ownerId);
    if (!owner || owner.hp <= 0) { e.dead = true; return; }

    // Orbit around owner
    e.p.angle = (e.p.angle || 0) + 0.08;
    const distance = 1.2;
    e.x = owner.x + Math.cos(e.p.angle) * distance;
    e.y = owner.y + Math.sin(e.p.angle) * distance;

    // Render shield orb
    const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
    const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
    a.fxPool.spawnPhysics('fx_shield_orb', pX, pY, 0, 0, 2, 1, 1, false, 0x00e5ff);
  }
}
```

---

## 🛠️ Developer Suite (`/?dev`)

Add `/?dev` to your browser URL (e.g. `http://localhost:3000/?dev`) to access the in-game developer panel:

1. **Live Stats Editor**:
   - Tweak Max HP, Speed, Action Cooldown, and Attack Damages live.
   - Click **"💾 SAVE TO FILE DIRECTLY"** to permanently write changes into `src/minits/<id>.js` on disk.
2. **Multi-Texture Importer**:
   - Browse and upload `.png` or `.svg` files from your computer. Files are saved directly to `public/assets/minit_icon/` and live-reloaded into WebGL.
3. **Import Minit File**:
   - Drag and drop a `minit <id>.js` file into the web panel and click **"💾 SAVE TO PROJECT FILES"** to commit the file to `src/minits/` and auto-register it into `src/minits/index.js`.
4. **Headless Balancing Test**:
   - Run 10, 20, or 30 rounds of headless round-robin duels.
   - Evaluates win-rate leaderboards, tier ratings (S+, A, B, C, D), and a $7 \times 7$ head-to-head matchup matrix.

---

## 🔄 How to Save Changes & Push to GitHub

When you tune minits, change stats, or swap textures in Developer Mode (`/?dev`), here is how the data flows and how to push your changes to GitHub:

### 1. Saving to Project Files
- **In-Memory Live Testing**: Moving sliders changes stats in your browser immediately so you can test battles in real-time.
- **Save to Disk**: Click **"💾 SAVE TO FILE"** in the dev panel. This sends a request to the local Vite dev server, which updates `src/minits/<id>.js` on disk.
- **Copy / Download Fallback**: You can also click **"📋 COPY CODE"** to copy the updated file content to your clipboard, or **"📥 DOWNLOAD"** to download `<id>.js`.

### 2. Pushing to GitHub (Choose Any Method)

#### Method A: Google AI Studio UI (Fastest)
1. In the **Google AI Studio** workspace interface, look at the top-right header or left sidebar for the **GitHub / Version Control** icon (or "Sync / Export").
2. Review the modified files (`src/minits/<id>.js`).
3. Type a commit message (e.g., `Update minit stats & balance tuning`).
4. Click **Commit & Push**. GitHub will receive the commit, and GitHub Actions will automatically rebuild and deploy to GitHub Pages!

#### Method B: GitHub Web Editor (Direct)
1. In the Dev Console (`/?dev`), click **"📋 COPY CODE"** for the modified minit.
2. Go to your repository on GitHub: `https://github.com/<your-username>/minit-duels/blob/main/src/minits/<id>.js`.
3. Click the pencil icon (✏️ **Edit this file**).
4. Select all and paste the copied code.
5. Click **Commit changes...** at the top right.

#### Method C: Git CLI (Local Clone)
If you have cloned the repository locally on your computer:
```bash
# Check modified minit files
git status

# Stage the updated minit files
git add src/minits/

# Commit with a descriptive message
git commit -m "Balance minits and update stats"

# Push to your GitHub repository
git push origin main
```

Once pushed, GitHub Actions will automatically run `npm run build` and publish your latest balance updates to GitHub Pages!

---

## 🚀 Development & Build

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (GitHub Pages)
npm run build

# 4. Preview production build locally
npm run preview
```
