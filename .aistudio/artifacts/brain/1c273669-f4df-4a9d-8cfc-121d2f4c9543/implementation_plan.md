# Minit Workshop, External Mod Loader & Headless Balance Suite

This update expands **Minit Duels** into an extensible, mod-ready arena battler by introducing a **Workshop & Developer Modal** accessible directly from the Character Select (`EditorScene`). Players and creators can dynamically import custom `.js` Minit definitions alongside matching `.png` sprite assets (automatically paired by filename), manage or delete saved custom Minits in `localStorage`, toggle live combat debugging overlays, and run a high-speed Headless Balance Simulator with a full round-robin matchup matrix, winrates, average Time-To-Kill (TTK), and damage/DPS analytics.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core UX and architectural choices below incorporate your confirmed preferences from the clarification phase.

- **Confirmed Decision 1 — Retro Pixel Modal Overlay with Tabs**: Accessed via a crisp pixel button in the `EditorScene`, opening a responsive retro pixel modal overlay with three dedicated tabs: **Add & Manage Minits**, **Balance Matrix**, and **Debug Mode**.
- **Confirmed Decision 2 — Full Matchup Matrix & Balance Telemetry**: The headless simulator runs multi-round round-robin or targeted 1v1 simulations completely decoupled from rendering and audio, reporting overall winrates, tier rankings, average TTK (seconds/ticks), average damage dealt per match, DPS, and an N×N head-to-head matchup matrix.
- **Confirmed Decision 3 — Drag-and-Drop / File Picker with Auto-Filename Sync**: Creators can drop or select `.js` and `.png` files together (e.g., `naruto.js` + `naruto.png`, or multi-stage assets like `naruto_base.png`). The importer automatically pairs assets by matching base filenames, evaluates the module safely with access to `CFG`, `FastMath`, `AudioSys`, and `MinitEngine`, validates it through `MinitContract`, bakes crisp `NEAREST` pixel textures into `AssetBaker`, and persists both code and DataURL sprites in `localStorage`.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **External Minit Importer & Storage Manager**: Allows players to drop or pick `.js` Minit scripts and `.png` sprite sheets/icons. Assets with matching filenames automatically bind to the Minit's `textures.base` (and any secondary textures), persist in `localStorage`, load automatically on game boot, and can be exported, inspected, or deleted at any time with a single click.
  2. **Headless Balancing Check System**: Runs hundreds of high-speed combat simulations in milliseconds using `Arena` in headless mode (`headless: true`), generating an interactive **Matchup Matrix** and **Stat Leaderboard** (Winrate %, Avg TTK, Avg Damage Dealt, DPS, Survivability, and Balance Warnings for overpowered/underpowered outliers).
  3. **Live Combat Debugging Mode**: Toggles real-time visual and diagnostic overlays during duels, including hit/zone/beam collision radii, entity velocity vectors, cooldown progress bars, activeentity/particle pool counters, and a live combat event log—plus a time-scale controller (`0.25x`, `0.5x`, `1x`, `2x`, `4x` and single-tick stepping).
- **Target Audience / Persona**: Players, game designers, and modders who want to craft custom Minit fighters, test new traits/VFX, and verify competitive balance across the roster without touching core engine files.
- **Key Value**: Turns Minit Duels into an open, self-contained creation platform where any `.js` + `.png` pair becomes a playable, balanced fighter persisted across sessions.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Opening the Workshop**: On the `EditorScene` header/footer, clicking the **`WORKSHOP / DEV`** button opens the retro pixel modal overlay without losing current character selection.
  2. **Importing a Custom Minit (`Minits` Tab)**:
     - The user drags and drops (or selects via file picker) a `.js` file (e.g., `shadow.js`) and a `.png` file (e.g., `shadow.png`).
     - The auto-sync engine matches `shadow.js` with `shadow.png` by basename, parses and sandboxes the Minit definition, previews the sprite, stats, traits, and validation status, and saves it to `localStorage`.
     - A downloadable **Starter Template (`template_minit.js`)** button is provided so creators have a clean, well-documented reference with `CFG`, `FastMath`, `AudioSys`, custom traits, and custom textures ready to customize.
     - Below the dropzone, the **Installed Custom Minits** list displays all user-imported Minits with their crisp pixel icon, ID, HP/Speed stats, storage size, and a **`Delete`** button that removes the Minit from `localStorage`, unregisters it from `MinitEngine.Registry`, and refreshes the `EditorScene` grid immediately.
  3. **Running the Headless Balance Check (`Balance` Tab)**:
     - The user selects rounds per matchup (e.g., `10`, `25`, `50`, or `100` rounds per pair) and clicks **`Run Balance Check`**.
     - A non-blocking chunked runner executes all pairwise matchups across registered Minits (including custom imported Minits) with a live progress bar.
     - Upon completion, the view displays:
       - **Summary Leaderboard Table**: Rank, Minit Icon & Name, Win / Loss / Draw counts, Winrate %, Average TTK (s), Average Damage Dealt, Effective DPS, and Automated Balance Status (`Balanced`, `Overtuned`, `Undertuned`).
       - **Head-to-Head Matchup Matrix**: An N×N grid showing exact winrate percentages for every `Row vs. Column` pairing so creators can spot hard counters or broken interactions at a glance.
  4. **Using Live Debug Mode (`Debug` Tab & In-Duel HUD)**:
     - Inside the `Debug` tab, users can toggle **Debug Mode** on/off and configure individual overlays:
       - Show Hitboxes, Zone Radii & Targeting Lines
       - Show Cooldown Timers, HP/DMG Multipliers & Status Keys
       - Show Engine Telemetry (Active Entities, Pooled Entities, Active Particles, FPS)
       - Enable In-Duel Time-Scale Controls (`Pause`, `Step +1 Tick`, `0.25x`, `1x`, `2x`, `4x`)
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp 16-bit Arcade / Retro Pixel Workshop UI matching the existing `Press Start 2P` pixel typography and dark arena aesthetic.
  - *Color Palette & Mood*:
    - Dominant Canvas: Deep Void Slate (`#07070c` / `0x07070c`) and Surface Panel (`#0d0d16` / `#12121e`).
    - Structural Borders: Crisp 2px pixel borders (`#242436`) with corner guard accents.
    - Accent Budget: Cyber Neon Cyan (`#00e5ff`) for active tabs and primary actions, Emerald (`#00ff66`) for balanced/high winrate states, Solar Gold (`#ffdd00`) for warnings, and Crimson (`#ff1155`) for delete/alert actions.
  - *Typography & Hierarchy*: `"Press Start 2P", monospace` for modal headers, tab buttons, and arcade labels; paired with crisp tabular monospace (`JetBrains Mono` / `monospace` with `tabular-nums`) for dense matchup matrices, TTK decimals, and validation logs to ensure effortless scannability.
- **Interactive Feedback & Motion**:
  - Instant Web Audio synthesized feedback (`click`, `start`, error buzz) on modal actions.
  - Real-time drag-over highlight state on the `.js` + `.png` dropzone.
  - Asynchronous chunked simulation loop (`requestAnimationFrame` batches) so the UI remains 60 FPS responsive while simulating hundreds of duels.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Flexible Multi-Format `.js` Minit Parser & Sandboxed Dependency Injection**
  - *Chosen Approach*: Support both ES Module syntax (`export const MINIT_X = { ... }`, `export default { ... }`, and `import { CFG } from ...`) and plain object/script definitions. The loader strips static relative `import` statements and injects `{ CFG, FastMath, AudioSys, MinitEngine, PIXI }` directly into the module evaluation scope.
  - *Why*: Creators copying existing Minit files (like `saitama.js` or `waves.js`) use `import { CFG } from '../config.js'` and `export const MINIT_...`. Stripping relative imports and providing the live engine singletons allows any existing or new Minit file to work out-of-the-box without requiring a bundler at runtime.
  - *Alternatives Considered*: Requiring JSON-only definitions—rejected because custom Minits rely on JavaScript functions for `customTraits` and procedural `customTextures`.
- **Decision 2: Automatic Filename Sync & Multi-Asset Binding**
  - *Chosen Approach*: When a user selects or drops files, the importer groups files by normalized basename (e.g., `my_hero.js` + `my_hero.png`). Even if the `.js` file defines `textures: { base: './assets/minit_icon/anything.png' }` or omits `textures.base`, the matched `.png` file (converted to a persistent Base64 DataURL) automatically binds to `textures.base`. Additional textures matching `<minitId>_<key>.png` also auto-bind to `textures[key]` or `customTextures[key]`.
  - *Why*: Fulfils the exact requirement that assets automatically sync with the `.js` file simply by sharing the same filename, while surviving page reloads in `localStorage`.
- **Decision 3: Deterministic Zero-GC Headless Simulation with Damage & TTK Hooks**
  - *Chosen Approach*: Extend `Arena` (when `options.headless === true`) to record per-player combat telemetry (`totalDamageDealt`, `totalDamageTaken`, `actionsExecuted`, `ticksElapsed`) with zero PIXI rendering overhead, and execute matchups in time-sliced batches.
  - *Why*: Simulating 9+ Minits across all pairs (36+ unique pairs × 25 rounds = 900+ full battles) takes ~150ms total in headless mode, providing statistically meaningful winrates, TTK, and DPS without freezing the browser tab.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MINIT DUELS APPLICATION                             │
├──────────────────────────────────┬─────────────────────────────────────────┤
│      PIXI.JS CANVAS SCENES       │     WORKSHOP & DEV OVERLAY SYSTEM       │
│                                  │                                         │
│  ┌────────────────────────────┐  │  ┌───────────────────────────────────┐  │
│  │        LoadingScene        │──┼─▶│     CustomMinitStorage (LS)       │  │
│  │ (Boots Built-ins + Custom) │  │  │ - Persists JS source & PNG DataURL│  │
│  └─────────────┬──────────────┘  │  │ - Auto-hydrates on startup        │  │
│                ▼                 │  └─────────────────┬─────────────────┘  │
│  ┌────────────────────────────┐  │                    ▼                    │
│  │        EditorScene         │  │  ┌───────────────────────────────────┐  │
│  │ - Character Grid           │◀─┼─▶│      WorkshopModal (DOM/UI)       │  │
│  │ - [WORKSHOP / DEV] Button  │  │  │  ├─ Tab 1: Add & Manage Minits    │  │
│  │ - Custom Minit Badge/Del   │  │  │  │   (JS + PNG Auto-Sync Loader)  │  │
│  └─────────────┬──────────────┘  │  │  ├─ Tab 2: Headless Balance Suite │  │
│                ▼                 │  │  │   (Matchup Matrix, TTK, DPS)   │  │
│  ┌────────────────────────────┐  │  │  └─ Tab 3: Live Debug Config      │  │
│  │      SimulationScene       │  │  └─────────────────┬─────────────────┘  │
│  │ - Live Combat Arena        │◀─┼────────────────────┼────────────────────┤
│  │ - DebugOverlayRenderer     │  │                    ▼                    │
│  │ - Time-Scale HUD Bar       │  │  ┌───────────────────────────────────┐  │
│  └────────────────────────────┘  │  │      HeadlessSimulator Engine     │  │
│                                  │  │ - Runs Arena({ headless: true })  │  │
│                                  │  │ - Computes Winrate, TTK, DPS      │  │
│                                  │  └───────────────────────────────────┘  │
└──────────────────────────────────┴─────────────────────────────────────────┘
```

### Data Model & State (`localStorage` Schema)

- **Storage Key**: `minit_duels_custom_minits_v1`
- **Stored Record Structure**:
  - `id`: Unique Minit identifier (string, normalized lowercase)
  - `name`: Display name
  - `fileName`: Original `.js` filename base
  - `jsSource`: Raw JavaScript module string for re-hydration on boot
  - `assets`: Map of texture keys (`base`, plus any auxiliary sprite keys) to Base64 DataURL strings
  - `createdAt`: Timestamp of import
- **Debug State Key**: `minit_duels_debug_config_v1`
  - `enabled`: Boolean master switch
  - `showHitboxes`: Boolean (draws collision circles, zone radii, and targeting vectors)
  - `showTelemetry`: Boolean (draws FPS, active entities, pool capacity, cooldown bars, and stat multipliers)
  - `timeScale`: Number (`0.25`, `0.5`, `1`, `2`, `4`)

### Interactive Component & State Mapping

1. **Dynamic Module Compiler & Asset Sync (`CustomMinitLoader`)**:
   - Accepts dropped/selected `.js` and `.png` files.
   - Pairs files by filename stem (`<stem>.js` ↔ `<stem>.png`), reads `.png` as a DataURL via `FileReader`, transforms ES module `import`/`export` statements into an executable factory function receiving `{ CFG, FastMath, AudioSys, MinitEngine, PIXI }`, validates via `validateAndSanitizeMinit()`, registers into `MinitEngine.Registry`, and immediately bakes pixel-crisp textures via `AssetBaker.bakeSingleMinit()` so no page reload is required.
2. **Headless Balance Engine (`HeadlessSimulator`)**:
   - Iterates through all unique pairs `(A, B)` in `MinitEngine.Registry.getMinitIds()`.
   - Instantiates `new Arena([idA, idB], Textures, { headless: true })` and steps `tickLogic()` up to `maxTicks` (default `3600` ticks = 60s simulated time), alternating P1/P2 spawn sides across rounds to eliminate spawn-side bias.
   - Collects per-match winner, ticks elapsed (converted to seconds at 60 ticks/sec), total damage dealt by each fighter, and aggregates into both a ranked summary table and an N×N matrix.
3. **Live Debug Renderer (`DebugOverlay`)**:
   - Attaches a lightweight `PIXI.Graphics` and HUD layer inside `SimulationScene` when `DebugConfig.enabled` is active.
   - Renders player collision bounds, active entity `zoneRadius` / `vfx.radius` circles, targeting lines to current targets, cooldown progress bars beneath each fighter, and a top-bar speed controller (`Pause`, `Step`, `0.25x`–`4x`).
