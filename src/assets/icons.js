// ============================================================
// PROCEDURAL PIXEL ART ICONS FOR MINITS (ES Module)
// ============================================================
// Generates sharp retro pixel icons on PIXI.Graphics
// Eliminates network latency, 404s, and external asset loading lag!

export const MINIT_ICONS = {
  alchemist: (g, c = 0x00ff44) => {
    // Glass flask with bubbling green toxic brew
    g.lineStyle(1.5, 0xffffff, 1);
    g.beginFill(0x002211, 0.9);
    // Beaker body
    g.moveTo(-4, -8).lineTo(4, -8).lineTo(4, -3).lineTo(9, 7).lineTo(-9, 7).lineTo(-4, -3).closePath();
    g.endFill();
    // Liquid fill
    g.lineStyle(0);
    g.beginFill(c, 0.9);
    g.moveTo(-7, 3).lineTo(7, 3).lineTo(8, 6).lineTo(-8, 6).closePath();
    g.endFill();
    // Bubbles
    g.beginFill(0xffffff, 0.9);
    g.drawCircle(-2, 1, 1.2);
    g.drawCircle(3, -1, 1.5);
    g.endFill();
  },

  laser: (g, c = 0x00e5ff) => {
    // Mechanical eye turret with high-energy focusing lens
    g.lineStyle(1.5, 0x334455, 1);
    g.beginFill(0x111922);
    g.drawRoundedRect(-9, -9, 18, 18, 3);
    g.endFill();

    // Cyan glowing lens
    g.lineStyle(1.5, c, 1);
    g.beginFill(0x003344);
    g.drawCircle(0, 0, 6);
    g.endFill();

    // Laser diode core
    g.lineStyle(0);
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 2.5);
    g.endFill();

    // Crosshairs
    g.lineStyle(1, c, 0.8);
    g.moveTo(-8, 0).lineTo(-4, 0);
    g.moveTo(4, 0).lineTo(8, 0);
    g.moveTo(0, -8).lineTo(0, -4);
    g.moveTo(0, 4).lineTo(0, 8);
  },

  pulsar: (g, c = 0xff00aa) => {
    // 360-degree rotating drone with dual rapid plasma cannons
    g.lineStyle(1.5, 0x441133, 1);
    g.beginFill(0x1a0515);
    g.drawCircle(0, 0, 8);
    g.endFill();

    // Neon rotating arms
    g.lineStyle(2, c, 1);
    g.moveTo(-11, 0).lineTo(11, 0);
    g.moveTo(0, -11).lineTo(0, 11);

    // Center pulse core
    g.lineStyle(0);
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 3.5);
    g.endFill();
  },

  absorb: (g, c = 0xff4422) => {
    // Dark matter gravitational singularity with event horizon
    g.lineStyle(2, c, 0.9);
    g.beginFill(0x150000);
    g.drawCircle(0, 0, 9);
    g.endFill();

    // Accretion swirl
    g.lineStyle(1.5, 0xffaa00, 0.9);
    g.arc(0, 0, 6, 0, Math.PI * 1.3);

    // Black hole center
    g.lineStyle(0);
    g.beginFill(0x000000);
    g.drawCircle(0, 0, 3.5);
    g.endFill();
  },

  waves: (g, c = 0x009dd1) => {
    // Sonic frequency audio amplifier
    g.lineStyle(1.5, 0x113344, 1);
    g.beginFill(0x051520);
    g.drawRoundedRect(-9, -9, 18, 18, 2);
    g.endFill();

    // Equalizer bars
    g.lineStyle(0);
    g.beginFill(c);
    g.drawRect(-7, 2, 2.5, 4);
    g.drawRect(-3, -4, 2.5, 10);
    g.drawRect(1, -7, 2.5, 13);
    g.drawRect(5, -1, 2.5, 7);
    g.endFill();
  },

  moth_egg: (g, c = 0x88ffcc) => {
    // Cocoon / Egg with glowing fissures
    g.lineStyle(1.5, 0x224433, 1);
    g.beginFill(0x0d2218);
    g.drawEllipse(0, 0, 7, 9);
    g.endFill();

    // Bioluminescent veins
    g.lineStyle(1.5, c, 0.9);
    g.moveTo(-3, -5).lineTo(1, 0).lineTo(-2, 5);
    g.moveTo(2, -4).lineTo(4, 2);
  },

  moth_hatch: (g, c = 0x88ffcc) => {
    // Mythical Lunar Moth with celestial spread wings
    g.lineStyle(1.5, 0xffffff, 1);
    g.beginFill(c, 0.9);
    // Upper wings
    g.moveTo(0, -2).lineTo(10, -9).lineTo(7, 2).lineTo(0, 1).closePath();
    g.moveTo(0, -2).lineTo(-10, -9).lineTo(-7, 2).lineTo(0, 1).closePath();
    // Lower wings
    g.moveTo(0, 1).lineTo(6, 7).lineTo(2, 9).lineTo(0, 4).closePath();
    g.moveTo(0, 1).lineTo(-6, 7).lineTo(-2, 9).lineTo(0, 4).closePath();
    g.endFill();

    // Body
    g.lineStyle(0);
    g.beginFill(0x051510);
    g.drawRoundedRect(-1.5, -4, 3, 9, 1);
    g.endFill();
    // Eyes
    g.beginFill(0xffffff);
    g.drawCircle(-1, -3, 0.8);
    g.drawCircle(1, -3, 0.8);
    g.endFill();
  },

  murasaki: (g, c = 0x9900ff) => {
    // Hollow Purple (Red + Blue singularity)
    // Red aura
    g.lineStyle(1.5, 0xff0055, 0.9);
    g.arc(0, 0, 8, -Math.PI * 0.5, Math.PI * 0.5);
    // Blue aura
    g.lineStyle(1.5, 0x0088ff, 0.9);
    g.arc(0, 0, 8, Math.PI * 0.5, Math.PI * 1.5);

    // Purple core
    g.lineStyle(1, 0xcc66ff, 1);
    g.beginFill(0x9900ff);
    g.drawCircle(0, 0, 5);
    g.endFill();

    // Pure white singularity
    g.lineStyle(0);
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 2);
    g.endFill();
  }
};
