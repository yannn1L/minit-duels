# Modular Beam Attack VFX System (Laser, Gojo & Ironman)

Upgrades the beam attacks of **Laser**, **Gojo (Murasaki)**, and **Ironman (Unibeam)** from rudimentary circle sprites into a high-performance, modular, multi-layered energy beam rendering system with realistic cores, glowing auras, crackling lightning arcs, muzzle charges, and impact flares.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and design choices confirmed during interactive clarification are locked in below:

- **Confirmed Beam Rendering**: Multi-layered glowing vector beam (white-hot core + saturated inner sheath + wide outer aura glow).
- **Confirmed VFX Elements**:
  - Muzzle charge flare and corona at minit emitter position.
  - Impact spark burst, shockwave, and ground scorch at target/beam termination.
  - Procedural crackling lightning arcs dancing along the beam axis.
  - Screen shake and dynamic hit-stop micro-pauses upon continuous contact.
- **Confirmed Aiming Behaviors**:
  - **Laser**: Dynamically tracks enemy movement throughout the beam duration.
  - **Gojo & Ironman**: Fire in a locked vector direction calculated at firing inception, rewarding positioning and aim alignment.
- **Confirmed Architecture**: Flexible, modular engine utility (`BeamRenderer.js` / `ModularBeamTrait`) usable by any present or future minit.

---

## 1. Overview & Core Concept

- **The Problem**: Currently, beam attacks spawn individual circular sprites (`fx_beam_core`, `fx_murasaki_beam`, `fx_unibeam_ray`) along a stepped line every frame, resembling separated beads or dots on a string rather than a continuous, cinematic laser beam.
- **The Solution**: A dedicated, pooled `BeamRenderer` integrated into the rendering pipeline that draws crisp, continuous vector rays with:
  1. An intensely bright core line (`0xffffff`).
  2. A vibrant inner plasma sheath.
  3. A wide translucent chromatic aura glow.
  4. Real-time procedural lightning offsets.
  5. Dynamic muzzle flares at the caster and explosive impact particle emitters at the collision terminus.
- **Modularity & Reusability**: All beam parameters (colors, widths, tracking modes, jitter frequencies, lightning styles, knockback forces, audio triggers) are defined declaratively in minit payloads.

---

## 2. Visual Experience & Character Beam Specifications

### Visual Hierarchy & Layers
```
┌─────────────────────────────────────────────────────────────┐
│                      BEAM ANATOMY                           │
│                                                             │
│  [Muzzle Flare]  ═══╦═════════════════════╦═══> [Impact FX] │
│  (Corona Ring +     ║ Outer Aura (Alpha)  ║     (Sparks +   │
│   Energy Swirl)     ║ Inner Sheath (Glow) ║      Shockwave  │
│                     ╚═══════ Core ════════╝      + Scorch)  │
│                        \    /     \                         │
│                  Procedural Lightning Arcs                  │
└─────────────────────────────────────────────────────────────┘
```

### Character-Specific Tunings

1. **Laser (Core Focus Beam)**:
   - *Aura*: Electric Cyan (`0x00e5ff`, width 20px, alpha 0.35)
   - *Sheath*: Bright Azure (`0x33f0ff`, width 8px, alpha 0.85)
   - *Core*: Pure White (`0xffffff`, width 3px)
   - *Aiming*: Smooth tracking toward target enemy with progressive damage ramp.
   - *Accents*: Subtle high-frequency micro-jitter and focused target sizzle.

2. **Gojo / Murasaki (Hollow Purple Cataclysm Beam)**:
   - *Aura*: Deep Cursed Magenta/Violet (`0x9900ff`, width 36px, alpha 0.45)
   - *Sheath*: Electric Purple (`0xcc33ff`, width 16px, alpha 0.9)
   - *Core*: Blinding Super-White (`0xffffff`, width 6px)
   - *Aiming*: Fixed firing angle locked upon Red & Blue singularity fusion.
   - *Accents*: Violent crackling purple/white lightning branches, full-arena recoil kick, screen rumble, and line-slice destruction.

3. **Ironman (Unibeam Chest Laser)**:
   - *Aura*: Arc-Reactor Cyan/Sky Blue (`0x00d4ff`, width 28px, alpha 0.4)
   - *Sheath*: Energy Blue (`0x00ffff`, width 12px, alpha 0.85)
   - *Core*: Pure White (`0xffffff`, width 5px)
   - *Aiming*: Fixed trajectory locked after chest charging sequence.
   - *Accents*: Expanding supersonic shock rings, continuous backwards thruster recoil, directional knockback impulse pushing targets along beam vector.

---

## 3. Technical Architecture & Implementation Details

```
┌──────────────────────────────────────────────────────────────────┐
│                          SYSTEM FLOW                             │
│                                                                  │
│  Minit Definition (laser.js / murasaki.js / ironmen.js)          │
│         │                                                        │
│         ▼                                                        │
│  Arena.spawnEnt({ traits: ['modularBeam'], p: { beamConfig } })  │
│         │                                                        │
│         ├─► Logic Tick (Arena.tickLogic)                         │
│         │     • Line-segment collision & damage ticks            │
│         │     • Directional knockback & target tracking          │
│         │                                                        │
│         └─► Render Pass (Arena.updateVisuals -> BeamRenderer)    │
│               • Pooled PIXI.Graphics batch render                │
│               • Multi-layer stroke rendering (Glow/Sheath/Core)  │
│               • Procedural lightning generation (FastMath)       │
│               • Muzzle flare & Impact particle bursts            │
└──────────────────────────────────────────────────────────────────┘
```

### Core Components to Build & Update

1. **`src/engine/BeamRenderer.js` (New Modular Engine Utility)**:
   - Manages pooled `PIXI.Graphics` instances inside `Arena.layer` for zero-allocation beam rendering.
   - Implements `drawBeam(graphics, startPoint, endPoint, config, time)`:
     - Outer glow: `.lineStyle(glowWidth, glowColor, glowAlpha)`.
     - Inner sheath: `.lineStyle(sheathWidth, sheathColor, sheathAlpha)`.
     - Center core: `.lineStyle(coreWidth, coreColor, 1.0)`.
     - Lightning arcs: Computes midpoint displacements along the normal vector using seeded FastMath noise.
     - Terminal caps: Smooth rounded or tapered endpoints with muzzle/impact halos.
   - Provides clean cleanup and pool recycle when beam lifecycle ends.

2. **`src/engine/traitBeh.js` (Modular Beam Trait & Physics)**:
   - Registers `'modularBeam'` trait handling:
     - Dynamic tracking vs. static vector locking.
     - Accurate capsule/segment intersection testing with enemy hitboxes.
     - Damage application with configurable tick rates, screen shake, and hit-stop micro pauses.
     - Directional knockback applied along the beam normal or forward vector.
     - Emitter of muzzle flash and impact particles via `VFXPool`.

3. **`src/minits/laser.js` Refactoring**:
   - Replaces circle particle loop with the new `'modularBeam'` trait.
   - Sets continuous tracking, cyan palette, and escalating damage profile.

4. **`src/minits/murasaki.js` Refactoring**:
   - Updates Phase 3 of `hollowPurpleSequence` to use the modular beam system.
   - Retains Red & Blue orb fusion ritual, then erupts into the high-width violet beam with lightning branches.

5. **`src/minits/ironmen.js` Refactoring**:
   - Updates Ability 3 (`ironUnibeamBlast`) to leverage the modular beam system.
   - Applies directional knockback and recoil thruster effects while firing the unibeam.

6. **Dev Console Integration (`src/dev/DevConsole.js`)**:
   - Ensures beam attributes (damage, tick rate, width, colors) remain fully inspectable and live-editable in `/?dev` mode.

---

## 4. Verification & Testing Plan

1. **Static Build & Compilation**:
   - Run `compile_applet` to verify TypeScript/ESModule syntax and clean imports.
   - Run `npm run build` to ensure the production bundle builds without overhead.
2. **Visual & Performance Inspection**:
   - Test Laser in match preview: Verify smooth continuous tracking, lack of beaded "circle" artifacts, and bright luminous beam core.
   - Test Gojo: Verify Red/Blue orb charge -> fusion flash -> massive purple beam with lightning arcs.
   - Test Ironman: Verify Arc Reactor chest charging -> firing Unibeam with heavy enemy knockback and thruster recoil.
   - Verify 60 FPS performance with zero frame drops or memory leaks from graphics pooling.
