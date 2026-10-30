// ============================================================
// HEADLESS ROUND-ROBIN BALANCING SIMULATOR (ES Module)
// Executes fast pure-logic 1v1 tournaments without GPU overhead
// ============================================================
import { Arena } from '../engine/Arena.js';
import { MinitEngine } from '../engine/Registry.js';

export class HeadlessSimulator {
  /**
   * Run a round-robin tournament across all registered minits
   * @param {number} roundsPerPair Number of duels between each pair of minits
   * @param {function} onProgress Callback for live progress updates
   * @returns {Promise<Object>} Comprehensive tournament stats and win-rate matrix
   */
  static async runTournament(roundsPerPair = 15, onProgress = () => {}) {
    const minitIds = Object.keys(MinitEngine.Registry.minits);
    const n = minitIds.length;
    const startTime = performance.now();

    // Initialize tournament tracking records
    const records = {};
    const matrix = {};

    minitIds.forEach((id) => {
      records[id] = {
        id,
        name: MinitEngine.Registry.minits[id].name,
        color: MinitEngine.Registry.minits[id].color,
        wins: 0,
        losses: 0,
        draws: 0,
        totalMatches: 0,
        totalTicks: 0,
        remainingHpPctSum: 0
      };
      matrix[id] = {};
      minitIds.forEach((otherId) => {
        matrix[id][otherId] = { wins: 0, losses: 0, draws: 0 };
      });
    });

    // Generate unique pair list (Combination C(n, 2))
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push([minitIds[i], minitIds[j]]);
      }
    }

    const totalPairMatches = pairs.length * roundsPerPair;
    let completedMatches = 0;

    // Simulate each pair matchup
    for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
      const [idA, idB] = pairs[pIdx];

      for (let r = 0; r < roundsPerPair; r++) {
        // Alternate spawn sides to eliminate left/right positional bias
        const spawnOrder = r % 2 === 0 ? [idA, idB] : [idB, idA];
        const matchResult = this._simulateSingleDuel(spawnOrder[0], spawnOrder[1]);

        const winnerId = matchResult.winnerId;
        const loserId = matchResult.loserId;

        if (winnerId === 'DRAW') {
          records[idA].draws++;
          records[idB].draws++;
          matrix[idA][idB].draws++;
          matrix[idB][idA].draws++;
        } else if (winnerId === idA) {
          records[idA].wins++;
          records[idB].losses++;
          matrix[idA][idB].wins++;
          matrix[idB][idA].losses++;
        } else if (winnerId === idB) {
          records[idB].wins++;
          records[idA].losses++;
          matrix[idB][idA].wins++;
          matrix[idA][idB].losses++;
        }

        records[idA].totalMatches++;
        records[idB].totalMatches++;
        records[idA].totalTicks += matchResult.ticks;
        records[idB].totalTicks += matchResult.ticks;
        records[idA].remainingHpPctSum += matchResult.hpPcts[idA] || 0;
        records[idB].remainingHpPctSum += matchResult.hpPcts[idB] || 0;

        completedMatches++;
      }

      onProgress({
        completed: completedMatches,
        total: totalPairMatches,
        pct: Math.round((completedMatches / totalPairMatches) * 100),
        currentPair: `${idA} vs ${idB}`
      });

      // Yield every 3 pairs to prevent UI freezing
      if (pIdx % 3 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const totalTimeMs = Math.round(performance.now() - startTime);

    // Calculate aggregated percentages and rankings
    const leaderboard = Object.values(records)
      .map((rec) => {
        const winRate = rec.totalMatches > 0 ? (rec.wins / rec.totalMatches) * 100 : 0;
        const avgDurationSec =
          rec.totalMatches > 0 ? (rec.totalTicks / rec.totalMatches / 60).toFixed(1) : 0;
        const avgHpRemaining =
          rec.totalMatches > 0 ? (rec.remainingHpPctSum / rec.totalMatches).toFixed(1) : 0;

        let tier = 'B';
        if (winRate >= 65) tier = 'S+';
        else if (winRate >= 55) tier = 'A';
        else if (winRate >= 45) tier = 'B';
        else if (winRate >= 35) tier = 'C';
        else tier = 'D';

        return {
          ...rec,
          winRate: Math.round(winRate * 10) / 10,
          avgDurationSec: Number(avgDurationSec),
          avgHpRemaining: Number(avgHpRemaining),
          tier
        };
      })
      .sort((a, b) => b.winRate - a.winRate);

    return {
      minitIds,
      roundsPerPair,
      totalMatches: completedMatches,
      durationMs: totalTimeMs,
      leaderboard,
      matrix
    };
  }

  /**
   * Run a single 1v1 battle headlessly
   */
  static _simulateSingleDuel(p1Id, p2Id) {
    const arena = new Arena([p1Id, p2Id], null, { headless: true });
    let ticks = 0;
    const maxTicks = 1800; // 30 seconds max battle duration

    const p1 = arena.players[0];
    const p2 = arena.players[1];

    while (ticks < maxTicks && p1.hp > 0 && p2.hp > 0) {
      arena.tickLogic();
      ticks++;
    }

    const p1Pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
    const p2Pct = Math.max(0, (p2.hp / p2.maxHp) * 100);

    let winnerId = null;
    let loserId = null;

    if (p1.hp <= 0 && p2.hp > 0) {
      winnerId = p2.def.id;
      loserId = p1.def.id;
    } else if (p2.hp <= 0 && p1.hp > 0) {
      winnerId = p1.def.id;
      loserId = p2.def.id;
    } else {
      // Timeout / Sudden Death: higher HP % wins
      if (p1Pct > p2Pct + 2) {
        winnerId = p1.def.id;
        loserId = p2.def.id;
      } else if (p2Pct > p1Pct + 2) {
        winnerId = p2.def.id;
        loserId = p1.def.id;
      } else {
        winnerId = 'DRAW';
      }
    }

    return {
      winnerId,
      loserId,
      ticks,
      hpPcts: {
        [p1.def.id]: p1Pct,
        [p2.def.id]: p2Pct
      }
    };
  }
}
