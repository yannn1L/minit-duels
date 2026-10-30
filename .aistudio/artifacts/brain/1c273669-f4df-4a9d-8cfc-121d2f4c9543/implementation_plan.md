# Developer Mode, Direct File Persistence & Headless Balancing Test (`/?dev`)

An advanced developer suite activated via `/?dev`, providing real-time stat editing with direct disk persistence to original source files, live texture hot-swapping, engine telemetry, and an automated headless round-robin combat simulator that runs exhaustive 1v1 matchups to output complete balance matrices and win-rate rankings.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following revisions have been incorporated per your request:
> - **Direct File Persistence (No LocalStorage)**: Added a local Vite dev-server API endpoint (`/api/dev/save-minit`) so any stat or texture changes made in the developer panel are written directly to the physical source files (`src/minits/<id>.js`) on disk.
> - **Headless Round-Robin Balancing Simulator**: Added an automated tournament engine that runs headless simulations (`tickLogic()` without GPU rendering) for all minit combinations (e.g., 20+ duels per pair, 400+ total matches in ~2 seconds).
> - **Balancing Matrix & Analytics Review**: Displays an interactive win-rate matrix, average DPS, survival times, and tier rankings to instantly identify overpowered or underpowered minits.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Activates when accessing `/?dev`.
  - Floating collapsable developer console over the canvas with tabs for **Live Tuning**, **File Persistence**, and **Balance Simulator**.
  - **Live File Saving**: Edits to HP, speed, cooldown, attack damages, and texture paths are written directly to disk into `src/minits/<id>.js`.
  - **Headless Round-Robin Testing**: Simulates headless 1v1 battles across all 7 minits at uncapped CPU speed, compiling matchup matrices and win-rate analytics.
- **Target Audience**: Developers, game balancers, and playtesters looking to balance characters with data-backed statistics and commit changes directly to the codebase.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Accessing Developer Suite**: Navigating to `/?dev` renders a floating docked badge (`DEV SUITE · 60 FPS · 7 MINITS · [TEST BALANCE]`).
2. **Stat Tuning & Direct File Saving**:
   - Selecting a minit opens its live parameters: `HP`, `Speed`, `Action CD`, `Damages`, and `Texture Path`.
   - Modifying a parameter updates the in-memory registry immediately for instant testing.
   - Clicking **"Save Directly to File"** commits the changes to `src/minits/<id>.js` on disk.
3. **Headless Round-Robin Balance Test**:
   - Developer opens the **"Balance Simulator"** tab and selects match count per pairing (e.g. 10, 25, or 50 rounds).
   - Clicking **"Run Round-Robin Simulation"** executes hundreds of battles headlessly within 1–2 seconds.
   - The results view displays:
     - **Win Rate Leaderboard**: Percentage rankings (e.g., #1 Ironman: 64%, #2 Laser: 52%...).
     - **Matchup Matrix**: Full $7 \times 7$ grid showing head-to-head records (e.g., Laser vs Gojo, Moth vs Absorb).
     - **Combat Metrics**: Average match duration (seconds) and average damage output.

### Visual Styling

- High-contrast, clean dark theme (`#0b0b14` with `#00e5ff` and `#242436` accents) with monospace tabular figures (`font-mono tabular-nums`).
- Draggable or dockable floating window that collapses to minimize canvas obstruction.

---

## 3. Key Product Decisions & Trade-Offs

- **Vite Server Middleware for Direct Disk Writing**:
  - *Chosen Approach*: Lightweight Vite middleware registered in `vite.config.ts` handling `POST /api/dev/save-minit`.
  - *Why*: Enables client-side developer controls to persist changes straight into `src/minits/<id>.js` files on the user's filesystem without needing a separate backend server.
  - *Safety*: Validates minit IDs against existing registry keys before writing to prevent accidental file corruption.
- **Headless Pure Logic Simulation**:
  - *Chosen Approach*: Instantiate a detached `Arena` without PIXI graphics/renderers, calling `arena.tickLogic()` in a tight loop until a player's HP reaches 0.
  - *Why*: Eliminates 60 FPS rendering bottlenecks, allowing 500+ duels to simulate in less than 2 seconds.

---

## 4. Technical Architecture & Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Window                        │
│                                                             │
│  ┌────────────────────────┐      ┌───────────────────────┐  │
│  │   Dev Console Overlay  │      │ PixiJS Canvas (#game) │  │
│  │                        │      │                       │  │
│  │  - Stat Sliders        │      │ - Active Simulation   │  │
│  │  - Texture Switcher    │      │ - Character Editor    │  │
│  │  - "Save to File" btn  │      └───────────────────────┘  │
│  │  - Round-Robin Runner  │                  ▲              │
│  │  - Win-Rate Matrix     │                  │ Reads live   │
│  └───────────┬────────────┘                  │ stats        │
│              │                               │              │
│              │ POST /api/dev/save-minit      │              │
│              ▼                               │              │
│  ┌────────────────────────┐                  │              │
│  │ Vite Dev Server Route  │                  │              │
│  │ (vite.config.ts)       │                  │              │
│  │ Writes src/minits/*.js │──────────────────┴──────────────┤
│  └────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### Module Breakdown

1. **`vite.config.ts` (API Middleware)**:
   - Registers `/api/dev/save-minit` to write updated stats, payloads, and action cooldowns directly into `src/minits/<id>.js`.
2. **`src/dev/HeadlessSimulator.js`**:
   - Executes round-robin tournament matches across all minits headlessly using `tickLogic()`.
   - Aggregates wins, losses, average HP remaining, and match lengths.
3. **`src/dev/DevConsole.js`**:
   - Reactive UI with Stat Editors, Texture Path inputs, File Persistence buttons, and Tournament Matrix viewer.
4. **`src/main.js`**:
   - Boots `DevConsole` when `window.location.search.includes('dev')`.
