// ============================================================
// CONFIGURATION & CONSTANTS (ES Module - Data-Driven & Tweakable)
// Supports both Landscape (Desktop) and Portrait (Mobile) modes
// ============================================================
import * as PIXI from 'pixi.js';

export const CFG = {
  // Virtual Canvas Resolutions
  APP: {
    LANDSCAPE: { W: 900, H: 540 },
    PORTRAIT: { W: 540, H: 800 },
    BG_COLOR: 0x07070c
  },

  // Grid & Physics (Tweakable)
  GRID: { TS: 16, HALF_TS: 8, COLS: 10, ROWS: 10 },
  RENDER: { LERP: 0.22, SPRING_TENSION: 0.2, SPRING_DAMP: 0.35 },
  SIM: { MAX_DT: 2.0, MAX_ITERATIONS: 3, SLOWMO_SPEED: 0.25, SLOWMO_DUR: 40 },
  PHYSICS: { DRAG_X: 0.9, DRAG_Y: 0.95, BOUNCE: -1, WANDER: 0.05 },

  // Arena Dimensions & Styles
  ARENA: {
    BASE_HP: 1000,
    PADDING: 0.2,
    BG_COLOR: 0x12121e,
    BG_ALPHA: 0.95,
    GRID_COLOR: 0x1c1c2e,
    GRID_ALPHA: 0.8,
    GUARD_COLOR: 0x2a2a40
  },

  // Combat Juice & Impacts (Tweakable)
  JUICE: {
    BOUNCE_X: { tX: 1.0, tY: 1.25 },
    BOUNCE_Y: { tX: 1.25, tY: 1.05 },
    HIT: { tX: 1.3, tY: 1.0 },
    ACTION: { tX: 1.3, tY: 1.3 },
    HIT_FLASH_COLOR: 0xff1133, // Red damage flash according to texture shape (tweakable)
    HIT_FLASH_DUR: 6, // Duration of damage flash in frames (tweakable)
    DEATH_FLASH_INTENSITY: 0.6,
    DEATH_SHAKE: 8,
    HIT_STOP_DUR: 2,
    DEATH_HIT_STOP: 12
  },

  // Button & UI Defaults
  UI: {
    BTN: { PAD_X: 22, PAD_Y: 12 }
  },

  // ============================================================
  // DATA-DRIVEN LAYOUTS: LANDSCAPE (DESKTOP) & PORTRAIT (MOBILE)
  // Easy to tweak positions, scales, and margins
  // ============================================================
  LAYOUT: {
    // ----------------------------------------------------
    // DUEL / COMBAT SCENE LAYOUT
    // In landscape: Arena in center, cards on left and right!
    // ----------------------------------------------------
    DUEL: {
      LANDSCAPE: {
        title: { x: 450, y: 22 },
        arena: { x: 450, y: 275, scale: 2.7 },
        // P1 Card on the LEFT of the arena
        p1_card: {
          x: 125,
          y: 275,
          width: 205,
          height: 250,
          icon: { x: 102, y: 46, scale: 3.0 },
          name: { x: 102, y: 88 },
          hp: { x: 15, y: 110, w: 175, h: 12, segments: 10, segW: 14, gap: 3 },
          desc: { x: 12, y: 136, wrapWidth: 180 },
          status: { x: 15, y: 215, size: 14, gap: 4 }
        },
        // P2 Card on the RIGHT of the arena
        p2_card: {
          x: 775,
          y: 275,
          width: 205,
          height: 250,
          icon: { x: 102, y: 46, scale: 3.0 },
          name: { x: 102, y: 88 },
          hp: { x: 15, y: 110, w: 175, h: 12, segments: 10, segW: 14, gap: 3 },
          desc: { x: 12, y: 136, wrapWidth: 180 },
          status: { x: 15, y: 215, size: 14, gap: 4 }
        }
      },
      PORTRAIT: {
        title: { x: 270, y: -15 },
        arena: { x: 270, y: 265, scale: 2.7 },
        p1_card: {
          x: 140,
          y: 585,
          width: 230,
          height: 140,
          icon: { x: 34, y: 34, scale: 2.4 },
          name: { x: 68, y: 15 },
          hp: { x: 68, y: 36, w: 145, h: 10, segments: 10, segW: 10, gap: 3 },
          desc: { x: 14, y: 65, wrapWidth: 202 },
          status: { x: 14, y: 108, size: 12, gap: 3 }
        },
        p2_card: {
          x: 400,
          y: 585,
          width: 230,
          height: 140,
          icon: { x: 34, y: 34, scale: 2.4 },
          name: { x: 68, y: 15 },
          hp: { x: 68, y: 36, w: 145, h: 10, segments: 10, segW: 10, gap: 3 },
          desc: { x: 14, y: 65, wrapWidth: 202 },
          status: { x: 14, y: 108, size: 12, gap: 3 }
        }
      }
    },

    // ----------------------------------------------------
    // COMPACT CHARACTER SELECT / EDITOR LAYOUT
    // ----------------------------------------------------
    EDITOR: {
      LANDSCAPE: {
        title: { x: 450, y: 14 },
        subtitle: { x: 450, y: 42 },
        scroll: { x: 20, y: 68, w: 860, h: 368 },
        card: {
          cols: 4,
          baseW: 198,
          baseH: 108,
          scale: 1.0,
          gapX: 16,
          gapY: 12,
          startY: 8,
          icon: { x: 28, y: 28, scale: 2.1 },
          name: { x: 54, y: 10 },
          hp: { x: 54, y: 28, w: 130, h: 8, segments: 10, segW: 10, gap: 3 },
          desc: { x: 10, y: 54, wrapWidth: 178 }
        },
        footer: {
          dock: { x: 20, y: 442, w: 860, h: 88 },
          p1Slot: { x: 34, y: 452, w: 214, h: 68 },
          vsTxt: { x: 268, y: 486 },
          p2Slot: { x: 288, y: 452, w: 214, h: 68 },
          btnRandom: { x: 576, y: 486, w: 118, h: 48 },
          btnDuel: { x: 758, y: 486, w: 216, h: 48 }
        }
      },
      PORTRAIT: {
        title: { x: 270, y: 14 },
        subtitle: { x: 270, y: 42 },
        scroll: { x: 14, y: 72, w: 512, h: 556 },
        card: {
          cols: 2,
          baseW: 242,
          baseH: 112,
          scale: 1.0,
          gapX: 14,
          gapY: 12,
          startY: 8,
          icon: { x: 30, y: 30, scale: 2.2 },
          name: { x: 58, y: 10 },
          hp: { x: 58, y: 28, w: 156, h: 8, segments: 10, segW: 12, gap: 3 },
          desc: { x: 12, y: 56, wrapWidth: 218 }
        },
        footer: {
          dock: { x: 14, y: 634, w: 512, h: 154 },
          p1Slot: { x: 26, y: 644, w: 216, h: 68 },
          vsTxt: { x: 270, y: 678 },
          p2Slot: { x: 298, y: 644, w: 216, h: 68 },
          btnRandom: { x: 115, y: 752, w: 178, h: 48 },
          btnDuel: { x: 365, y: 752, w: 298, h: 48 }
        }
      }
    }
  },

  // Audio Throttle
  AUDIO: {
    MASTER_GAIN: 0.7,
    COMPRESSOR: { THRESHOLD: -12, RATIO: 4 },
    THROTTLE: {
      hit: 0.05,
      laser: 0.08,
      crush: 0.06,
      gun: 0.04,
      swarm: 0.1,
      DEFAULT: 0.04
    }
  },

  // Particle Effects Limits (Tweakable)
  VFX: {
    TEXT_LIMIT: 40,
    PHYSICS_LIMIT: 400,
    DMG_TEXT: {
      LIFE: 35,
      VY: -3.5,
      VX_SPREAD: 1.0,
      FLOAT_DRAG: 0.9,
      CHAR_SPACING: 13
    },
    HIT: { PARTICLE_COUNT: 4, BURST_FORCE: 2.5, LIFE: 20, DEFAULT_TEX: 'fx_dust' },
    ZONE: { PARTICLE_RATE: 2 },
    DEATH: { SHOCK_RAD: 120, PARTICLE_COUNT: 24, BURST_FORCE: 6, PARTICLE_LIFE: 35 }
  }
};

CFG.ARENA_BOUNDS = {
  MIN_X: CFG.ARENA.PADDING,
  MAX_X: CFG.GRID.COLS - 1 - CFG.ARENA.PADDING,
  MIN_Y: CFG.ARENA.PADDING,
  MAX_Y: CFG.GRID.ROWS - 1 - CFG.ARENA.PADDING
};

export const PALETTE = {
  TEXT: 0xffffff,
  NEON: 0x00e5ff,
  ALERT: 0xff0055,
  MUTED: 0x888899,
  CARD_BG: 0x0d0d16,
  BORDER: 0x242436,
  HP: {
    HIGH: 0x00ff66,
    MID: 0xffdd00,
    LOW: 0xff1155,
    BG: 0x12121a,
    EMPTY: 0x222230
  }
};

// High-DPI font styles with crisp outlines and resolution: 2
export const UI_STYLE = {
  H1: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 20,
    fill: PALETTE.TEXT,
    stroke: 0x000000,
    strokeThickness: 3,
    letterSpacing: 2,
    padding: 6
  }),
  H2: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 14,
    fill: PALETTE.NEON,
    stroke: 0x000000,
    strokeThickness: 2.5,
    letterSpacing: 1.5,
    padding: 6
  }),
  H3: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 11,
    fill: PALETTE.NEON,
    stroke: 0x000000,
    strokeThickness: 2,
    padding: 4
  }),
  STATS_LARGE: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 8,
    fill: PALETTE.TEXT,
    stroke: 0x000000,
    strokeThickness: 1.5,
    lineHeight: 16,
    padding: 4
  }),
  DESC_LARGE: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 8,
    fill: 0xcccccc,
    stroke: 0x000000,
    strokeThickness: 1.5,
    wordWrap: true,
    wordWrapWidth: 176,
    lineHeight: 12,
    padding: 4
  }),
  DMG_POPUP: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 12,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 2,
    padding: 4
  })
};
