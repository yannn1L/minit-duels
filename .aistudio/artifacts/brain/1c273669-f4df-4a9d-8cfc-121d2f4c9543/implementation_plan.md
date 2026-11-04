# High-Performance Combat Juice & Particle Graphics Upgrade

Deliver a visceral, arcade-grade visual and particle overhaul for Minit Duels—combining directional hit sparks, additive bloom glows, dash/projectile afterimages, multi-ring shockwaves, persistent floor scorch marks, reactive arena grid ripples, and bouncy damage popups—all running inside a zero-allocation object pool with an auto-adaptive FPS budget and a user-selectable VFX Quality toggle.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core visual, particle, and performance preferences have been confirmed in Phase 1:

- **Confirmed Decision 1 — Particle & Surface Effects**: Implement directional hit sparks, glowing embers, and flash bursts; motion trails and ghost afterimages for dashes, teleports, and fast projectiles; multi-ring shockwaves and persistent fading floor scorch marks; plus ambient status aura particles for shields, poison, stun, and slow states.
- **Confirmed Decision 2 — Combat Juice & Arena Presentation**: Add dynamic hit-stop scaling, directional knockback, and velocity-aligned squash-and-stretch; additive (`BLEND_MODES.ADD`) bloom glow layers on projectiles, beams, and fighters; critical/heavy-hit damage popups with color coding and elastic bounce physics; and a reactive arena grid with wall impact ripples on collisions.
- **Confirmed Decision 3 — Performance & Quality Controls**: Use an auto-adaptive particle budget that dynamically scales emission density if frame rate dips below 52 FPS, paired with an explicit VFX Quality selector (`AUTO` / `HIGH` / `LOW`) accessible in the HUD and Dev panel.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms every collision, projectile volley, laser beam, dash, and knockout into a tactile, high-contrast spectacle while maintaining 60 FPS determinism and 100% compatibility with headless balance simulations.
- **Target Audience / Persona**: Players and Minit creators who want fights to feel punchy, readable, and satisfying on both desktop and mobile viewports without frame drops during bullet-hell or summon-heavy matchups.
- **Key Value**:
  - **Visceral Impact Feedback**: Every hit communicates direction, force, and damage tier through directional spark cones, hit-stop micro-freezes, additive glow bursts, and elastic damage numbers.
  - **Living Arena Floor**: Explosions leave fading scorch marks on the floor layer, and wall bounces or shockwaves send localized energy ripples across the arena grid and perimeter guards.
  - **Guaranteed 60 FPS**: Pre-allocated sprite pools with O(1) swap-and-pop recycling and an automatic frame-time governor ensure zero garbage-collection pauses even when hundreds of particles are active.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Entering a Duel**: The arena initializes with a subtle ambient neon grid, soft fighter under-glows, and a compact `VFX: AUTO` (or `HIGH` / `LOW`) toggle pill in the top corner.
  2. **Movement, Dashes & Projectiles**: Fast-moving fighters, dashes, and high-velocity projectiles leave fading additive ghost afterimages and ember ribbons.
  3. **Impacts & Wall Collisions**:
     - Projectiles and melee strikes emit a directional cone of high-velocity sparks (`fx_spark` stretched along velocity vector), a soft additive glow flare (`fx_glow`), and floating embers.
     - Wall bounces trigger a localized neon ripple along the arena border wall and deform the nearby grid lines outward before springing back.
  4. **Heavy Hits, Crits & Knockouts**:
     - High-damage hits (>25 DMG or >12% max HP) trigger a scaled hit-stop freeze (2–5 ticks), an emphasized gold/crimson popup with an exclamation mark (`!`) and bounce physics, and a double concentric shockwave ring.
     - Explosions and KOs stamp a persistent dark-charred neon scorch decal onto the floor layer that slowly cools and fades over several seconds.
  5. **Status & Shield Auras**: Shielded units emit rising cyan hex/sparkle motes, poisoned units bubble with toxic green droplets, slowed units shed frost shards, and stunned units display orbiting star sparks.
  6. **HUD Card Reactive Feedback**: Player HUD cards on the sides/bottom of the screen subtly shake when their fighter takes heavy damage and feature a smooth white "damage trail" bar behind the segmented HP bar so players can visually gauge chunk damage.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp HD Retro-Arcade Neon (`Press Start 2P` pixel typography paired with multi-layered additive WebGL light and particle physics).
  - *Color Palette & Mood*:
    - **60% Dominant Arena Canvas**: Deep Obsidian Void (`#07070C`) and Arena Slate (`#12121E`) so additive particles pop with maximum contrast.
    - **30% Structural Surfaces**: Crisp grid lines (`#1C1C2E`), titanium corner guards (`#2A2A40`), and dark slate fighter HUD cards (`#0D0D16`).
    - **10% High-Intent Accents & Additive FX**: Pure White (`#FFFFFF`) super-heated cores, Cyber Cyan (`#00E5FF`) shields/ripples, Solar Gold (`#FFDD00`) heavy/critical hits, Toxic Emerald (`#00FF66`) poison, and Crimson Alert (`#FF0055`) damage flashes.
  - *Typography & Hierarchy*: High-DPI (`resolution: 2`) pixel-art numerals (`0–9`, `-`, `+`, `!`) pre-baked into GPU textures for zero-overhead damage, heal, and critical hit popups.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pre-Baked Procedural FX Textures + Additive Blend Layer (`BLEND_MODES.ADD`)**
  - *Chosen Approach*: Bake specialized procedural textures (`fx_spark`, `fx_glow`, `fx_ember`, `fx_scorch`, `fx_ring_thin`, `fx_star`, `digit_plus`, `digit_bang`) at startup in `AssetBaker` and render light-emitting particles in a dedicated additive container (`PIXI.BLEND_MODES.ADD`), while rendering floor scorch decals and ghost trails in an under-unit decal layer.
  - *Why*: WebGL `Filter` shaders (like `BloomFilter` or `BlurFilter`) require full-screen render-target passes every frame that hurt mobile fill-rate. Pre-baked radial glow textures combined with `BLEND_MODES.ADD` achieve authentic neon bloom in a single batched draw call at 0ms extra GPU shader cost.
  - *Alternatives Considered*: Full-scene `PIXI.BlurFilter` post-processing, which degrades performance on mobile GPUs and blurs crisp pixel art.

- **Decision 2: Auto-Adaptive Particle Governor with Manual Override (`AUTO` / `HIGH` / `LOW`)**
  - *Chosen Approach*: Track a rolling 30-frame FPS average inside the VFX manager. In `AUTO` mode, particle emission multiplier smoothly scales between `1.0x` (at 58+ FPS) and `0.35x` (if FPS drops below 50), prioritizing critical gameplay cues (damage numbers, shockwaves, beams) over decorative ambient dust. Users can also click the compact `VFX: AUTO/HIGH/LOW` button to lock their preference.
  - *Why*: Guarantees smooth 60 FPS gameplay across all devices while letting desktop players enjoy maximum particle density.

- **Decision 3: Reactive Grid & Wall Ripple Geometry via Sparse Displacement**
  - *Chosen Approach*: Subdivide arena grid lines into lightweight vertex segments that displace radially away from shockwaves, explosions, and wall bounces using fast spring-damper math, redrawing only when active ripples exist (`activeRipples.length > 0`).
  - *Why*: Delivers a Geometry-Wars-style reactive arena floor that makes impacts feel grounded in the environment, with zero CPU cost when the grid is at rest.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Rendering Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SimulationScene & HUD Layer                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ P1 & P2 Fighter Cards│  │ Arena Viewport (aG)  │  │ VFX Quality   │  │
│  │ • Segmented HP Bar   │  │ • Hit-Stop Controller│  │ Toggle Button │  │
│  │ • White Damage Trail │  │ • Directional Shake  │  │ (AUTO/HI/LOW) │  │
│  │ • Card Hit Jolt      │  └──────────┬───────────┘  └───────┬───────┘  │
└──┴──────────────────────┴─────────────┼──────────────────────┼──────────┘
                                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Arena Multi-Pass Render Hierarchy                   │
│                                                                         │
│  1. Floor & Reactive Grid Layer (`gridGfx`)                             │
│     └── Dynamic spring-displaced grid vertices + Wall impact ripples    │
│  2. Under-Unit Decal & Trail Layer (`fxU`)                              │
│     └── Fading floor scorch marks (`fx_scorch`) + Ghost afterimages     │
│  3. Main Actor & Entity Layer (`layer` / `summonLayer`)                 │
│     └── Fighters, Summons, Projectiles (with velocity squash/stretch)   │
│  4. Unit Overlay Layer (`unitOverlayGfx`)                               │
│     └── Hexagonal/pulsing shields, barriers, stun stars, mini HP bars   │
│  5. Additive Bloom & Beam Layer (`fxAdd` / `beamRenderer`)              │
│     └── `BLEND_MODES.ADD` directional sparks, glow halos, laser arcs    │
│  6. Combat Text Popup Layer (`fxO`)                                     │
│     └── Bouncy damage numbers, heavy/crit `!` badges, green `+` heals   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Pool Architecture

- **Pre-Allocated VFX Pools (O(1) Swap-and-Pop)**:
  - **Physics & Spark Pool (`phys`)**: Expanded to 600 pre-allocated sprites supporting velocity-aligned rotation (`alignToVel`), anisotropic stretching (long spark streaks that shorten as they slow down), gravity/buoyancy (`grav`), angular spin (`vRot`), additive blending (`BLEND_MODES.ADD`), and color tinting.
  - **Afterimage & Scorch Decal Pool (`decals`)**: 120 pre-allocated sprites on the under-unit layer for fighter dash ghosts, projectile motion ribbons, and persistent explosion scorch marks.
  - **Multi-Ring Shockwave Pool (`sws`)**: 32 pre-allocated ring sprites supporting dual-ring staggered bursts (fast thin outer ring + slower bright inner ring).
  - **Elastic Damage & Heal Text Pool (`txts`)**: 45 pre-allocated multi-glyph containers supporting `-`, `+`, `0–9`, and `!` glyphs with arc-bounce physics and critical-hit scale pops.
- **Reactive Arena Grid State (`gridRipples`)**:
  - Ring-buffer of up to 12 active ripple impulses `{ x, y, radius, maxRadius, strength, color, life, maxLife }` triggered automatically on `spawnShockwave`, `onWallBounce`, and knockouts.
- **Headless Determinism Guarantee**:
  - `HEADLESS_FX_POOL` exposes no-op stubs for all new VFX methods (`spawnSparkBurst`, `spawnAfterimage`, `spawnScorch`, `spawnGlow`, `spawnGridRipple`, `spawnHealText`) so headless 1,000-match balance simulations run at maximum speed with zero visual overhead.
