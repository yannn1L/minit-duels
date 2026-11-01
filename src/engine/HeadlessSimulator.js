// ============================================================
// HEADLESS BALANCE SIMULATOR & MATCHUP MATRIX ENGINE (ES Module)
// Runs deterministic multi-round round-robin duels with zero rendering overhead
// ============================================================
import { Arena } from './Arena.js';
import { AudioSys } from './AudioSys.js';
import { MinitEngine } from './Registry.js';

export class HeadlessSimulator {
  /**
   * Simulates a single 1v1 duel between idA and idB up to maxTicks.
   * @param {string} idA
   * @param {string} idB
   * @param {number} maxTicks - Default 3600 ticks (60 seconds @ 60fps)
   */
  static simulateSingleDuel(idA, idB, maxTicks = 3600) {
    const prevMuted = AudioSys.muted;
    AudioSys.muted = true;

    let result;
    try {
      const arena = new Arena([idA, idB], {}, { headless: true });
      let ticks = 0;

      while (ticks < maxTicks) {
        arena.tickLogic();
        ticks++;

        const p1 = arena.players[0];
        const p2 = arena.players[1];
        if (p1.hp <= 0 || p2.hp <= 0) {
          break;
        }
      }

      const p1 = arena.players[0];
      const p2 = arena.players[1];

      let winnerId = null;
      if (p1.hp > 0 && p2.hp <= 0) {
        winnerId = idA;
      } else if (p2.hp > 0 && p1.hp <= 0) {
        winnerId = idB;
      } else if (p1.hp > 0 && p2.hp > 0) {
        // Timeout tie-breaker: compare HP percentage if desired, or count as draw
        const pct1 = p1.hp / p1.maxHp;
        const pct2 = p2.hp / p2.maxHp;
        if (Math.abs(pct1 - pct2) > 0.15) {
          winnerId = pct1 > pct2 ? idA : idB;
        } else {
          winnerId = null; // Draw
        }
      }

      result = {
        ticks,
        durationSec: ticks / 60,
        winnerId,
        p1: {
          id: idA,
          hpRemaining: Math.max(0, p1.hp),
          hpPct: Math.max(0, p1.hp / p1.maxHp),
          dmgDealt: p1.telemetry.dmgDealt,
          dmgTaken: p1.telemetry.dmgTaken,
          hitsLanded: p1.telemetry.hitsLanded,
          actionsUsed: p1.telemetry.actionsUsed
        },
        p2: {
          id: idB,
          hpRemaining: Math.max(0, p2.hp),
          hpPct: Math.max(0, p2.hp / p2.maxHp),
          dmgDealt: p2.telemetry.dmgDealt,
          dmgTaken: p2.telemetry.dmgTaken,
          hitsLanded: p2.telemetry.hitsLanded,
          actionsUsed: p2.telemetry.actionsUsed
        }
      };

      arena.destroy();
    } finally {
      AudioSys.muted = prevMuted;
    }

    return result;
  }

  /**
   * Runs a full N×N round-robin tournament across all registered Minits.
   * Uses time-sliced requestAnimationFrame chunks so the UI progress bar stays smooth.
   */
  static async runFullBalanceReport({
    roundsPerPair = 20,
    maxTicks = 3000,
    minitIds = null,
    onProgress = null
  } = {}) {
    const startTime = performance.now();
    const allMinits = (minitIds || MinitEngine.Registry.getMinitIds())
      .map((id) => MinitEngine.Registry.getMinit(id))
      .filter(Boolean);

    const n = allMinits.length;
    if (n < 2) {
      throw new Error('At least 2 Minits are required to run a balance check.');
    }

    // Initialize per-minit aggregate buckets
    const statsById = {};
    const matrix = {};

    for (const m of allMinits) {
      statsById[m.id] = {
        id: m.id,
        name: m.name,
        color: m.color,
        isCustom: Boolean(m.isCustom),
        hp: m.stats.hp,
        speed: m.stats.speed,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalTicks: 0,
        winTicks: 0,
        totalDmgDealt: 0,
        totalDmgTaken: 0,
        totalActions: 0,
        winHpPctSum: 0
      };
      matrix[m.id] = {};
      for (const opp of allMinits) {
        matrix[m.id][opp.id] = {
          wins: 0,
          losses: 0,
          draws: 0,
          matches: 0,
          totalTicks: 0,
          totalDmgDealt: 0
        };
      }
    }

    // Build list of unique pairs (i < j)
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push([allMinits[i].id, allMinits[j].id]);
      }
    }

    const totalBattles = pairs.length * roundsPerPair;
    let completedBattles = 0;
    let lastYieldTime = performance.now();

    for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
      const [idA, idB] = pairs[pIdx];

      for (let r = 0; r < roundsPerPair; r++) {
        // Alternate P1 / P2 sides every round to remove positional bias
        const swapped = r % 2 === 1;
        const firstId = swapped ? idB : idA;
        const secondId = swapped ? idA : idB;

        const duel = this.simulateSingleDuel(firstId, secondId, maxTicks);
        const dataA = swapped ? duel.p2 : duel.p1;
        const dataB = swapped ? duel.p1 : duel.p2;

        const stA = statsById[idA];
        const stB = statsById[idB];
        const cellAB = matrix[idA][idB];
        const cellBA = matrix[idB][idA];

        stA.matches++;
        stB.matches++;
        cellAB.matches++;
        cellBA.matches++;

        stA.totalTicks += duel.ticks;
        stB.totalTicks += duel.ticks;
        cellAB.totalTicks += duel.ticks;
        cellBA.totalTicks += duel.ticks;

        stA.totalDmgDealt += dataA.dmgDealt;
        stA.totalDmgTaken += dataA.dmgTaken;
        stA.totalActions += dataA.actionsUsed;

        stB.totalDmgDealt += dataB.dmgDealt;
        stB.totalDmgTaken += dataB.dmgTaken;
        stB.totalActions += dataB.actionsUsed;

        cellAB.totalDmgDealt += dataA.dmgDealt;
        cellBA.totalDmgDealt += dataB.dmgDealt;

        if (duel.winnerId === idA) {
          stA.wins++;
          stA.winTicks += duel.ticks;
          stA.winHpPctSum += dataA.hpPct;
          stB.losses++;
          cellAB.wins++;
          cellBA.losses++;
        } else if (duel.winnerId === idB) {
          stB.wins++;
          stB.winTicks += duel.ticks;
          stB.winHpPctSum += dataB.hpPct;
          stA.losses++;
          cellBA.wins++;
          cellAB.losses++;
        } else {
          stA.draws++;
          stB.draws++;
          cellAB.draws++;
          cellBA.draws++;
        }

        completedBattles++;

        // Yield every ~14ms so progress bar updates smoothly at 60fps
        const now = performance.now();
        if (now - lastYieldTime > 14) {
          if (onProgress) {
            onProgress({
              completed: completedBattles,
              total: totalBattles,
              pct: Math.round((completedBattles / totalBattles) * 100),
              currentPair: `${statsById[idA].name} vs ${statsById[idB].name}`
            });
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          lastYieldTime = performance.now();
        }
      }
    }

    // Finalize computed metrics & rankings
    const leaderboard = Object.values(statsById).map((st) => {
      const winRate = st.matches > 0 ? (st.wins / st.matches) * 100 : 0;
      const avgMatchSec = st.matches > 0 ? st.totalTicks / st.matches / 60 : 0;
      const avgTtkSec = st.wins > 0 ? st.winTicks / st.wins / 60 : avgMatchSec;
      const avgDmgDealt = st.matches > 0 ? st.totalDmgDealt / st.matches : 0;
      const avgDmgTaken = st.matches > 0 ? st.totalDmgTaken / st.matches : 0;
      const totalCombatSec = st.totalTicks / 60;
      const dps = totalCombatSec > 0 ? st.totalDmgDealt / totalCombatSec : 0;
      const avgWinHpPct = st.wins > 0 ? (st.winHpPctSum / st.wins) * 100 : 0;

      let balanceStatus = 'BALANCED';
      if (winRate >= 65) {
        balanceStatus = 'OVERTUNED';
      } else if (winRate <= 35) {
        balanceStatus = 'UNDERTUNED';
      }

      return {
        ...st,
        winRate,
        avgMatchSec,
        avgTtkSec,
        avgDmgDealt,
        avgDmgTaken,
        dps,
        avgWinHpPct,
        balanceStatus
      };
    });

    // Sort leaderboard by Winrate descending, then DPS descending
    leaderboard.sort((a, b) => b.winRate - a.winRate || b.dps - a.dps);

    // Finalize matrix percentages
    for (const rowId of Object.keys(matrix)) {
      for (const colId of Object.keys(matrix[rowId])) {
        const cell = matrix[rowId][colId];
        cell.winRate = cell.matches > 0 ? (cell.wins / cell.matches) * 100 : 0;
        cell.avgTtkSec = cell.matches > 0 ? cell.totalTicks / cell.matches / 60 : 0;
        cell.avgDmg = cell.matches > 0 ? cell.totalDmgDealt / cell.matches : 0;
      }
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    if (onProgress) {
      onProgress({
        completed: totalBattles,
        total: totalBattles,
        pct: 100,
        currentPair: 'Complete'
      });
    }

    return {
      totalBattles,
      roundsPerPair,
      maxTicks,
      elapsedMs,
      minits: allMinits.map((m) => ({ id: m.id, name: m.name, color: m.color, isCustom: Boolean(m.isCustom) })),
      leaderboard,
      matrix
    };
  }
}
