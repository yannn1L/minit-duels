// ============================================================
// CONFIGURATION & CONSTANTS (ES Module - Crisp HD Pixel Tuning)
// ============================================================
import * as PIXI from 'pixi.js';

export const CFG = {
  APP: { W: 800, H: 600, BG_COLOR: 0x07070c },
  GRID: { TS: 16, HALF_TS: 8, COLS: 10, ROWS: 10 },
  RENDER: { LERP: 0.22, SPRING_TENSION: 0.2, SPRING_DAMP: 0.35 },
  SIM: { MAX_DT: 2.0, MAX_ITERATIONS: 3, SLOWMO_SPEED: 0.25, SLOWMO_DUR: 40 },
  PHYSICS: { DRAG_X: 0.9, DRAG_Y: 0.95, BOUNCE: -1, WANDER: 0.05 },
  ARENA: {
    BASE_HP: 1000,
    PADDING: 0.2,
    BG_COLOR: 0x12121e,
    BG_ALPHA: 0.95,
    GRID_COLOR: 0x1c1c2e,
    GRID_ALPHA: 0.8,
    GUARD_COLOR: 0x2a2a40
  },
  JUICE: {
    BOUNCE_X: { tX: 1.0, tY: 1.25 },
    BOUNCE_Y: { tX: 1.25, tY: 1.05 },
    HIT: { tX: 1.3, tY: 1.0 },
    ACTION: { tX: 1.3, tY: 1.3 },
    HIT_FLASH_DUR: 5,
    DEATH_FLASH_INTENSITY: 0.6,
    DEATH_SHAKE: 8,
    HIT_STOP_DUR: 2,
    DEATH_HIT_STOP: 12
  },
  UI: {
    SCROLL: { Y: 110, H: 330 },
    BTN: { PAD_X: 25, PAD_Y: 15 },
    CARD_LAYOUT: {
      BASE_W: 232,
      BASE_H: 126,
      SCALE: 0.78,
      GAP_X: 14,
      GAP_Y: 14,
      COLS: 4,
      START_Y: 120,
      ICON: { X: 28, Y: 28, SCALE: 2.2 },
      NAME: { X: 56, Y: 10 },
      STATUS: { OFFSET_X: 8, OFFSET_Y: -1.1, SIZE: 12, GAP: 2 },
      HP_BAR: { X: 56, Y: 28, W: 136, H: 10, SEGMENTS: 10, SEG_W: 10, PAD: 2, GAP: 3 },
      DESC: { X: 10, Y: 52 }
    }
  },
  LAYOUT: {
    DUEL: {
      title: { x: 400, y: -150 },
      arena: { x: 400, y: 210, scale: 3.8 },
      p1_card: { x: 254, y: 610 },
      p2_card: { x: 546, y: 610 }
    },
    EDITOR: {
      title: { x: 400, y: 35 },
      subtitle: { x: 400, y: 75 },
      selectedTxt: { x: 400, y: 465 },
      indicator: { x: 400, y: 505 },
      btnDuel: { x: 400, y: 560 }
    }
  },
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

// High-DPI font styles with crisp outlines and high resolution to eliminate all blur
export const UI_STYLE = {
  H1: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 22,
    fill: PALETTE.TEXT,
    stroke: 0x000000,
    strokeThickness: 3,
    letterSpacing: 2,
    padding: 6
  }),
  H2: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 15,
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
    fontSize: 9,
    fill: 0xcccccc,
    stroke: 0x000000,
    strokeThickness: 1.5,
    wordWrap: true,
    wordWrapWidth: 215,
    lineHeight: 14,
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
