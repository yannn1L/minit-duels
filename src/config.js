// ============================================================
// CONFIGURATION & CONSTANTS (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';

export const CFG = {
  APP: { W: 800, H: 600, BG_COLOR: 0x050508 },
  BG: {
    FPS: 30,
    GRID_SPEED_X: -0.1,
    GRID_SPEED_Y: 0.1,
    FLOATER_COUNT: 12,
    FLOATER_SPEED_Y: 0.1,
    FLOATER_SPEED_X: 0.1
  },
  GRID: { TS: 16, HALF_TS: 8, COLS: 10, ROWS: 10 },
  RENDER: { LERP: 0.2, SPRING_TENSION: 0.2, SPRING_DAMP: 0.35 },
  SIM: { MAX_DT: 2.0, MAX_ITERATIONS: 3, SLOWMO_SPEED: 0.25, SLOWMO_DUR: 40 },
  SHADER: {
    aberration: 0.0008,
    scanline: 0.001,
    vignette: 0.12,
    brightness: 1.15
  },
  PHYSICS: { DRAG_X: 0.9, DRAG_Y: 0.95, BOUNCE: -1, WANDER: 0.05 },
  ARENA: {
    BASE_HP: 1000,
    PADDING: 0.2,
    BG_COLOR: 0x141422,
    BG_ALPHA: 0.85,
    GRID_COLOR: 0x222238,
    GRID_ALPHA: 0.9,
    GUARD_COLOR: 0x33334d
  },
  JUICE: {
    BOUNCE_X: { tX: 1.0, tY: 1.3 },
    BOUNCE_Y: { tX: 1.3, tY: 1.1 },
    HIT: { tX: 1.4, tY: 1.0 },
    ACTION: { tX: 1.4, tY: 1.4 },
    HIT_FLASH_DUR: 6,
    DEATH_FLASH_INTENSITY: 0.8,
    DEATH_SHAKE: 10,
    HIT_STOP_DUR: 2,
    DEATH_HIT_STOP: 15
  },
  OUTLINE: {
    UNIT: { thickness: 0, color: 0x231526 },
    TEXT: { thickness: 1.5, color: 0x05050a },
    UI: { thickness: 1.0, color: 0x141420 }
  },
  UI: {
    SCROLL: { Y: 110, H: 330 },
    BTN: { PAD_X: 25, PAD_Y: 15 },
    CARD_LAYOUT: {
      BASE_W: 280,
      BASE_H: 130,
      SCALE: 0.8,
      GAP_X: 25,
      GAP_Y: 15,
      COLS: 3,
      START_Y: 125,
      ICON: { X: 30, Y: 30, SCALE: 2.5 },
      NAME: { X: 60, Y: 10 },
      STATUS: { OFFSET_X: 8, OFFSET_Y: -1.1, SIZE: 12, GAP: 2 },
      HP_BAR: { X: 60, Y: 30, W: 151, H: 11, SEGMENTS: 10, SEG_W: 12, PAD: 2, GAP: 3 },
      DESC: { X: 12, Y: 58 }
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
    PHYSICS_LIMIT: 500, // Optimized down from 1000 to eliminate memory churn & loop lag
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
  NEON: 0x00ccff,
  ALERT: 0xff0055,
  MUTED: 0xaaaaaa,
  CARD_BG: 0x0b0b14,
  BORDER: 0x2a2a3e,
  HP: {
    HIGH: 0x00ff55,
    MID: 0xffff00,
    LOW: 0xff0055,
    BG: 0x111118,
    EMPTY: 0x222230
  }
};

export const UI_STYLE = {
  H1: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 24,
    fill: PALETTE.TEXT,
    stroke: 0x000000,
    strokeThickness: 3,
    letterSpacing: 1,
    padding: 8
  }),
  H2: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 16,
    fill: PALETTE.NEON,
    stroke: 0x000000,
    strokeThickness: 2.5,
    letterSpacing: 1,
    padding: 6
  }),
  H3: new PIXI.TextStyle({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 12,
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
    fontSize: 10,
    fill: PALETTE.TEXT,
    stroke: 0x000000,
    strokeThickness: 1.5,
    wordWrap: true,
    wordWrapWidth: 260,
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
