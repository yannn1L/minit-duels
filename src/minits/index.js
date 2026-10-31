// ============================================================
// MINIT FACTORY & REGISTRATION (ES Module)
// Modular registry manager & exported roster
// ============================================================
import { MinitEngine } from '../engine/Registry.js';
import { MINIT_LASER } from './laser.js';
import { MINIT_PULSAR } from './pulsar.js';
import { MINIT_ABSORB } from './absorb.js';
import { MINIT_WAVES } from './waves.js';
import { MINIT_MOTH } from './moth.js';
import { MINIT_MURASAKI } from './murasaki.js';
import { MINIT_IRONMEN } from './ironmen.js';
import { MINIT_SAITAMA } from './saitama.js';

export const ALL_MINITS = [
  MINIT_LASER,
  MINIT_PULSAR,
  MINIT_ABSORB,
  MINIT_WAVES,
  MINIT_MOTH,
  MINIT_MURASAKI,
  MINIT_IRONMEN,
  MINIT_SAITAMA
];

export function registerAllMinits() {
  ALL_MINITS.forEach((minit) => {
    MinitEngine.Registry.addMinit(minit);
  });
}

export function getMinitById(id) {
  return MinitEngine.Registry.getMinit(id);
}

export function getAllMinitList() {
  return ALL_MINITS;
}

export function getMinitCount() {
  return ALL_MINITS.length;
}

export {
  MINIT_LASER,
  MINIT_PULSAR,
  MINIT_ABSORB,
  MINIT_WAVES,
  MINIT_MOTH,
  MINIT_MURASAKI,
  MINIT_IRONMEN,
  MINIT_SAITAMA
};
