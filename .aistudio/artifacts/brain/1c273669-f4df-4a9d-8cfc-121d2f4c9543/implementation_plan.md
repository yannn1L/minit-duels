# Multi-Layer Connected VFX & Anti-Clutter Rendering System

This update refactors the arena visual effects pipeline into a **multi-layered connected FX system** that separates every shockwave, area zone, and floor scorch into distinct **Outer Ring/Outline**, **Middle Core Fill**, and **Top Particle** layers. Overlapping rings and zones seamlessly fuse into unified connected shapes underneath the fighters—eliminating intersecting ring clutter and ensuring Minits remain 100% visible even during heavy ability spam.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural choices incorporate your confirmed preferences from the clarification step:

- **Confirmed Decision 1 — Unified Connected Outlines & Middle Fills**: Overlapping shockwaves, vortexes, and scorch zones render through a two-pass connected silhouette technique (Outer Perimeter Pass + Interior Fill Masking Pass) so intersecting rings merge into one continuous outline without messy criss-crossing inner lines.
- **Confirmed Decision 2 — Fighter-First Depth Ordering**: All scorch marks, ring outlines, and middle fills render **underneath** the Minit fighters and summons, while only crisp directional sparks, projectiles, and damage popups render **above** the fighters.
- **Confirmed Decision 3 — Per-Layer Opacity Sliders & Crowd Auto-Fade**: The Dev Workshop **SETTING** tab gains dedicated opacity sliders for **Ring Outlines**, **Middle Fills**, **Floor Scorches**, and **Particles**, plus an **Auto-Fade Crowd Damping** system that dynamically softens opacity and accelerates decay when many FX overlap.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the single-sprite additive shockwave/decal stack with a coordinated 4-layer floor & particle compositor. When multiple shockwaves, zones (such as Absorb's vortex or Waves' sonic pulses), or scorch craters overlap, their outer borders connect into a single cohesive perimeter while their middle fills blend at a capped alpha underneath the fighters.
- **Target Audience / Persona**: Players and Minit creators testing fast-paced or multi-summon matchups where rapid ability triggers previously stacked bright opaque circles over the arena.
- **Key Value**: Preserves combat readability at all times while making area effects look deliberate, cohesive, and visually connected.

---

## 2. User Experience & Visual Design

- **Connected 3-Part FX Anatomy**:
  1. **Layer 1 — Outer Ring / Perimeter Outline (Under Fighters)**: Crisp colored outer boundary around shockwaves, zones, and scorch craters. When two or more circles overlap, only the exterior perimeter remains visible.
  2. **Layer 2 — Middle Core Fill (Under Fighters)**: Soft translucent interior fill that bridges overlapping circles and masks out internal intersecting border lines so connected rings share a single unified interior.
  3. **Layer 3 — Crisp Accent Particles (Over Fighters)**: High-velocity directional hit sparks, embers, and status motes that ride along the ring perimeter or burst on impact without obscuring unit silhouettes.
- **Crowd Auto-Fade & Spatial Merging**:
  - Nearby scorch marks spawned within a short distance automatically merge into an existing crater rather than stacking duplicate decals.
  - When active rings or decals exceed the comfort threshold, crowd damping smoothly lowers floor FX alpha and accelerates fade-out on the oldest rings.
- **Live Controls in Dev Workshop (`SETTING` Tab)**:
  - **Ring / Outline Opacity** (`0%–100%`)
  - **Middle Fill Opacity** (`0%–100%`)
  - **Floor Scorch Opacity** (`0%–100%`)
  - **Particle Layer Opacity** (`0%–100%`)
  - **Crowd Auto-Fade Toggle** (automatically dampens overlapping FX spam)

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Two-Pass Connected Vector/Sprite Compositing vs. Full-Screen Fragment Shader**
  - *Chosen Approach*: Render active rings, zones, and scorches using a batched two-pass floor compositor (Pass 1 stamps outer perimeter discs/strokes; Pass 2 stamps slightly inset interior cores that overwrite internal overlap seams, rendered at capped container alpha).
  - *Why*: Achieves clean boolean-union connected outlines for any number of overlapping rings at 60 FPS with zero WebGL framebuffer reallocation overhead and full compatibility with PixiJS masking.
  - *Alternatives Considered*: Full-screen distance-field metaball fragment shader (adds per-pixel fullscreen shader pass cost and blurs sharp pixel-art edges).
- **Decision 2: Routing Zone & Ring Visuals Under Units**
  - *Chosen Approach*: Move shockwaves (`spawnShockwave`) and persistent zone rings/cores (such as Absorb's singularity ring and Waves' charge aura) into the under-unit layered compositor, while keeping projectiles and hit sparks in the over-unit particle layer.
  - *Why*: Ensures Minit sprites, shields, and HP bars are never washed out by additive ring blooms.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Layer Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARENA SCENE CONTAINER                           │
├─────────────────────────────────────────────────────────────────────────┤
│  [0] Reactive Grid & Wall Ripples (gridGfx)                             │
│                                                                         │
│  [1] Under-Fighter Connected FX Container (fxU)                         │
│      ├─► Scorch Connected Layer (Outer Char Rim + Merged Inner Crater)  │
│      ├─► Ring Outline Layer     (Pass 1: Unified Outer Perimeter Rim)   │
│      ├─► Ring Middle Fill Layer (Pass 2: Seam-Masking Core & Inner Glow)│
│      └─► Under-Unit Trails      (Motion Afterimages & Ground Wisps)     │
│                                                                         │
│  [2] Fighter & Summon Layer                                             │
│      ├─► Unit Under-Glows (unitGlowLayer)                               │
│      ├─► Summons, Clones & Turrets (summonLayer)                        │
│      ├─► Primary Minit Fighters (players[].spr)                         │
│      └─► Unit Shields, Barriers & Mini HP Bars (unitOverlayGfx)         │
│                                                                         │
│  [3] Over-Fighter Accent FX Container (fxO)                             │
│      ├─► Crisp Particle Layer   (Pass 3: Sparks, Embers & Projectiles)  │
│      ├─► Vector Beams           (beamRenderer)                          │
│      └─► Floating Damage Popups (textLayer)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Persisted Layer Settings (`DebugConfig`)**:
  - Adds `vfxOutlineAlpha` (`0.75`), `vfxMiddleAlpha` (`0.28`), `vfxScorchAlpha` (`0.45`), `vfxParticleAlpha` (`0.95`), and `vfxCrowdAutoFade` (`true`) to `DEFAULT_DEBUG_STATE` with instant synchronization to `CFG.VFX` and `VFXPool`.
- **Connected Ring & Scorch Compositor (`VFXPool`)**:
  - Separates shockwaves, persistent zone rings (`spawnZoneRing`), and scorch marks into 3 coordinated visual parts:
    1. **Outline Rim**: Drawn in the outline pass at full radius `R`.
    2. **Middle Core**: Drawn in the middle pass at `R - rimWidth` to seamlessly erase internal intersecting arcs between overlapping rings of the same or adjacent effects, topped with a subtle center pulse.
    3. **Rim Accent Particles**: Spawns lightweight tangential/radial sparks on the particle layer so the ring outline feels alive and connected to the particle system.
  - Implements **Crowd Auto-Fade**: Computes a live crowd factor from active rings and scorches, scaling container alphas and accelerating decay on older entries when multiple effects stack.
- **Dev Workshop `SETTING` Tab**:
  - Binds real-time sliders for `vfxOutlineAlpha`, `vfxMiddleAlpha`, `vfxScorchAlpha`, `vfxParticleAlpha`, and a checkbox for `vfxCrowdAutoFade`, with full support in `RESET DEFAULTS`.
