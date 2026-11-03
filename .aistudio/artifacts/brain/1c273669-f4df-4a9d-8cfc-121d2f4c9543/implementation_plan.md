# Compact & Streamlined Editor Scene + Dev Mode UI

This update refines the **Editor Scene** and the **Dev Mode / Workshop Modal** into a clean, compact, and distraction-free retro pixel interface across both Landscape and Portrait orientations while maintaining reliable touch hit-testing for bottom cards.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design choices have been confirmed from your answers and will guide the implementation:

- **Minimal Fighter Cards**: Each fighter card displays only the essentials—16×16 sprite icon, fighter name, segmented HP bar, and short description (plus a small `X` delete button on custom Minits)—removing extra stat text lines and heavy inner frames.
- **Clean Bottom Selection Bar**: Displays the `SELECTED:` indicator with the two chosen fighter icons and reveals the **`START DUEL!`** button only when 2 fighters are selected.
- **Single Unified `DEV` Button & Compact Modal**: Replaces multiple header buttons with a single compact **`DEV`** button in the top-right corner that opens a streamlined, compact popup modal for importing/managing Minits, running Headless Balance checks, and toggling Debug Mode.

---

## 1. Overview & Core Concept

- **What It Does**: Strips away visual clutter from the character selection screen and developer suite so players can pick fighters immediately and access modding, balancing, and debugging tools from one compact window.
- **Target Audience / Persona**: Players and Minit creators on both desktop (Landscape) and mobile (Portrait) viewports.
- **Key Value**: Maximum clarity, larger uncluttered scroll space for fighter cards, and a fast, compact Dev popup that fits comfortably on any screen size.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Fighter Selection**: The player sees the `MINIT DUELS` header, a single top-right `DEV` button, and a clean grid of minimal fighter cards. Tapping any card (including bottom-row cards in Portrait mode) toggles selection with crisp neon corner brackets.
  2. **Starting a Duel**: Selected fighter sprites appear in the compact bottom footer. As soon as 2 fighters are chosen, the `START DUEL!` button appears cleanly beside/below them.
  3. **Unified Dev Modal**: Clicking `DEV` opens a compact retro modal (`max-width: 680px`) with 3 concise tabs: **`MINITS`**, **`BALANCE`**, and **`DEBUG`**.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp 8-bit arcade minimalism (`Press Start 2P` pixel typography with high-contrast dark slate surfaces).
  - *Color Palette & Mood*: Deep obsidian canvas (`#07070c`), subtle card surfaces (`#0d0d16`), slate borders (`#242436`), and high-intent cyan (`#00e5ff`) and emerald (`#00ff66`) accents.
  - *Component Styling & Layout*:
    - Compact modal padding (`12px`), tight single-row controls, and a combined dropzone + file picker bar for importing `.js` and `.png` Minit files.
    - Simplified Balance Check view showing a compact control bar, concise leaderboard table (`Minit`, `Win %`, `W-L`, `TTK`, `DPS`, `Status`), and a compact head-to-head winrate matrix.
    - Streamlined Debug tab with compact single-line toggle rows and speed selector pills (`0.25x` to `4x`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Stationary Scroll Viewport with Minimal Card Geometry**
  - *Chosen Approach*: Keep the stationary outer scroll viewport (`hitArea` + `mask` fixed in stage space while inner card container scrolls) while restoring the clean `196×98` (Landscape) / `236×104` (Portrait) minimal card layout.
  - *Why*: Guarantees bottom cards in Portrait mode can always be pressed and selected without visual overcrowding.
- **Decision 2: Compact Single-Window Dev Popup**
  - *Chosen Approach*: Consolidate all developer actions under one `DEV` button and remove verbose paragraphs, KPI summary boxes, and redundant built-in roster cards from the modal.
  - *Why*: Eliminates vertical scrolling clutter inside the Dev window and makes importing Minits, checking balance, and toggling debug overlays fast on both desktop and mobile screens.

---

## 4. Technical Architecture & Data Strategy

```text
┌───────────────────────────────────────────────────────────────────┐
│                         EDITOR SCENE UI                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Header: "MINIT DUELS" + Subtitle               [ DEV ] Btn  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Stationary Scroll Viewport (Fixed Mask + Fixed HitArea)     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │ Minimal Card │  │ Minimal Card │  │ Minimal Card │ ...   │  │
│  │  │ Icon+Name+HP │  │ Icon+Name+HP │  │ Icon+Name+HP │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Compact Footer: SELECTED: [Icon 1] [Icon 2]  [START DUEL!]  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Opens
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                  COMPACT DEV MODAL (680px Max)                    │
│  Tabs: [ MINITS (Import/Saved) ]  [ BALANCE ]  [ DEBUG ]          │
├───────────────────────────────────────────────────────────────────┤
│  • MINITS : Compact Dropzone + Template Btn + Saved Custom List   │
│  • BALANCE: Rounds/Timeout Bar + Run Btn + Compact Table & Matrix │
│  • DEBUG  : Compact Toggle Switches + Speed Selector              │
└───────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Editor Header**: Single `DEV` button (`DEV [DBG]` in green when Debug Mode is active) opens the modal directly.
  - **Minimal Fighter Cards**: Tapping toggles selection in `this.sel` (up to 2 fighters), updates neon corner brackets, and refreshes the footer preview icons and `START DUEL!` visibility.
  - **Compact Dev Modal**:
    - `MINITS` tab: Compact drag-and-drop / file picker bar auto-syncs `<name>.js` and `<name>.png` into `localStorage` and lists custom Minits with 1-click `Export` and `Delete` buttons.
    - `BALANCE` tab: Inline toolbar triggers `HeadlessSimulator.runFullBalanceReport` and renders a tight leaderboard and matrix table.
    - `DEBUG` tab: Compact toggle switches mutate `DebugConfig` state and immediately sync with the Editor and Simulation scenes.
