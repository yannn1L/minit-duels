// ============================================================
// DEVELOPER CONSOLE & LIVE DEBUGGING SUITE (ES Module)
// Active when URL has /?dev query parameter
// Features: Real-time Stats, Direct File Persistence, Round-Robin Balancing Test
// ============================================================
import { MinitEngine } from '../engine/Registry.js';
import { HeadlessSimulator } from './HeadlessSimulator.js';
import { Textures } from '../engine/AssetBaker.js';
import * as PIXI from 'pixi.js';

export class DevConsole {
  static init(app) {
    const isDev = window.location.search.includes('dev');
    if (!isDev) return;

    console.log('🛠️ Booting Developer Mode (/?dev)...');

    // Snapshot original pristine minit registry on boot
    this.app = app;
    this.originalSnapshot = JSON.parse(JSON.stringify(MinitEngine.Registry.minits));
    this.activeMinitId = Object.keys(MinitEngine.Registry.minits)[0] || 'laser';
    this.activeTab = 'editor'; // 'editor' | 'balance' | 'telemetry'
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    this._injectStyles();
    this._createDOM();
    this._bindTicker();
    this._render();
  }

  static _injectStyles() {
    if (document.getElementById('dev-styles-link')) return;
    const link = document.createElement('link');
    link.id = 'dev-styles-link';
    link.rel = 'stylesheet';
    link.href = './src/dev/devStyles.css';
    document.head.appendChild(link);
  }

  static _createDOM() {
    // Dock Badge
    this.dockBadge = document.createElement('div');
    this.dockBadge.id = 'dev-dock-badge';
    this.dockBadge.innerHTML = `<span>🛠️ DEV MODE</span><span id="dev-badge-fps">60 FPS</span>`;
    this.dockBadge.onclick = () => this._togglePanel();
    document.body.appendChild(this.dockBadge);

    // Floating Panel
    this.panel = document.createElement('div');
    this.panel.id = 'dev-floating-panel';
    this.panel.style.display = 'none';
    this.panel.innerHTML = `
      <div class="dev-header">
        <span class="dev-title">🛠️ DEV CONSOLE</span>
        <button class="dev-close-btn" id="dev-close">✕</button>
      </div>
      <div class="dev-nav-tabs">
        <button class="dev-tab-btn active" data-tab="editor">MINIT EDITOR</button>
        <button class="dev-tab-btn" data-tab="balance">BALANCE TEST</button>
        <button class="dev-tab-btn" data-tab="telemetry">TELEMETRY</button>
      </div>
      <div class="dev-content" id="dev-tab-content"></div>
      <div class="dev-toast" id="dev-toast"></div>
    `;
    document.body.appendChild(this.panel);

    document.getElementById('dev-close').onclick = () => this._togglePanel(false);

    // Tab buttons
    this.panel.querySelectorAll('.dev-tab-btn').forEach((btn) => {
      btn.onclick = () => {
        this.panel.querySelectorAll('.dev-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.getAttribute('data-tab');
        this._render();
      };
    });
  }

  static _togglePanel(forceState) {
    const isVisible = this.panel.style.display !== 'none';
    const nextState = forceState !== undefined ? forceState : !isVisible;
    this.panel.style.display = nextState ? 'flex' : 'none';
    if (nextState) this._render();
  }

  static _bindTicker() {
    this.app.ticker.add(() => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsUpdate >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
        this.frameCount = 0;
        this.lastFpsUpdate = now;
        const fpsElem = document.getElementById('dev-badge-fps');
        if (fpsElem) fpsElem.innerText = `${this.fps} FPS`;
      }
    });
  }

  static _showToast(msg, isError = false) {
    const toast = document.getElementById('dev-toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    toast.style.background = isError ? '#331118' : '#142820';
    toast.style.borderColor = isError ? '#ff3355' : '#00cc66';
    toast.style.color = isError ? '#ff8899' : '#55ffaa';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  static _render() {
    const container = document.getElementById('dev-tab-content');
    if (!container) return;

    if (this.activeTab === 'editor') {
      this._renderEditorTab(container);
    } else if (this.activeTab === 'balance') {
      this._renderBalanceTab(container);
    } else {
      this._renderTelemetryTab(container);
    }
  }

  // ------------------------------------------------------------
  // TAB 1: MINIT STATS & DIRECT FILE PERSISTENCE
  // ------------------------------------------------------------
  static _renderEditorTab(container) {
    const minits = MinitEngine.Registry.minits;
    const current = minits[this.activeMinitId];
    if (!current) return;

    const payload = current.payload || {};
    const action = current.action || {};
    const stats = current.stats || {};
    const baseTex = current.textures?.base || '';

    // Damage field detection
    let dmgValue = payload.dmg || payload.missileDmg || payload.beamTickDmg || 20;

    container.innerHTML = `
      <div class="dev-minit-pills">
        ${Object.keys(minits)
          .map(
            (id) => `
          <button class="dev-minit-pill ${id === this.activeMinitId ? 'active' : ''}" data-id="${id}">
            <span style="color:#${minits[id].color.toString(16).padStart(6, '0')}">●</span> ${minits[id].name}
          </button>
        `
          )
          .join('')}
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Max HP</span><span class="dev-field-value" id="val-hp">${stats.hp}</span></div>
        <input type="range" class="dev-input-range" id="input-hp" min="500" max="3000" step="25" value="${stats.hp}">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Movement Speed</span><span class="dev-field-value" id="val-speed">${stats.speed}</span></div>
        <input type="range" class="dev-input-range" id="input-speed" min="0.02" max="0.35" step="0.01" value="${stats.speed}">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Action Cooldown (Frames)</span><span class="dev-field-value" id="val-cd">${action.cd || 120}</span></div>
        <input type="range" class="dev-input-range" id="input-cd" min="40" max="400" step="5" value="${action.cd || 120}">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Primary Attack Damage</span><span class="dev-field-value" id="val-dmg">${dmgValue}</span></div>
        <input type="range" class="dev-input-range" id="input-dmg" min="2" max="150" step="1" value="${dmgValue}">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Base Texture Path (PNG/SVG)</span></div>
        <input type="text" class="dev-input-text" id="input-tex" value="${baseTex}">
      </div>

      <div class="dev-btn-row">
        <button class="dev-btn dev-btn-save" id="btn-save-disk">💾 SAVE TO FILE DIRECTLY</button>
        <button class="dev-btn" id="btn-reset-memory">↺ RESET DEFAULT</button>
      </div>
    `;

    // Minit switcher
    container.querySelectorAll('.dev-minit-pill').forEach((btn) => {
      btn.onclick = () => {
        this.activeMinitId = btn.getAttribute('data-id');
        this._render();
      };
    });

    // Reactive input listeners (Live In-Memory Mutation)
    const inpHp = container.querySelector('#input-hp');
    inpHp.oninput = (e) => {
      stats.hp = Number(e.target.value);
      container.querySelector('#val-hp').innerText = stats.hp;
    };

    const inpSpeed = container.querySelector('#input-speed');
    inpSpeed.oninput = (e) => {
      stats.speed = Number(e.target.value);
      container.querySelector('#val-speed').innerText = stats.speed;
    };

    const inpCd = container.querySelector('#input-cd');
    inpCd.oninput = (e) => {
      action.cd = Number(e.target.value);
      container.querySelector('#val-cd').innerText = action.cd;
    };

    const inpDmg = container.querySelector('#input-dmg');
    inpDmg.oninput = (e) => {
      const val = Number(e.target.value);
      if (payload.dmg !== undefined) payload.dmg = val;
      if (payload.missileDmg !== undefined) payload.missileDmg = val;
      if (payload.beamTickDmg !== undefined) payload.beamTickDmg = val;
      container.querySelector('#val-dmg').innerText = val;
    };

    const inpTex = container.querySelector('#input-tex');
    inpTex.onchange = (e) => {
      const newPath = e.target.value.trim();
      if (current.textures) current.textures.base = newPath;
      if (Textures[`minit_${current.id}_base`]) {
        try {
          const newTex = PIXI.Texture.from(newPath);
          newTex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
          newTex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
          Textures[`minit_${current.id}_base`] = newTex;
        } catch (err) {
          console.warn('Failed to hot-swap texture', err);
        }
      }
    };

    // Save Directly to File (POST /api/dev/save-minit)
    container.querySelector('#btn-save-disk').onclick = async () => {
      const saveBtn = container.querySelector('#btn-save-disk');
      saveBtn.innerText = 'SAVING TO FILE...';
      try {
        const res = await fetch('/api/dev/save-minit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: current.id,
            stats: { hp: stats.hp, speed: stats.speed },
            payload: payload,
            actionCd: action.cd,
            baseTexture: inpTex.value.trim()
          })
        });
        const result = await res.json();
        if (result.success) {
          this._showToast(`✓ Directly updated src/minits/${current.id}.js on disk!`);
        } else {
          this._showToast(`✗ Error: ${result.error}`, true);
        }
      } catch (err) {
        this._showToast(`✗ Failed to reach save endpoint`, true);
      } finally {
        saveBtn.innerText = '💾 SAVE TO FILE DIRECTLY';
      }
    };

    // Reset In-Memory to Defaults
    container.querySelector('#btn-reset-memory').onclick = () => {
      const orig = this.originalSnapshot[current.id];
      if (orig) {
        stats.hp = orig.stats.hp;
        stats.speed = orig.stats.speed;
        if (action.cd && orig.action) action.cd = orig.action.cd;
        if (payload && orig.payload) Object.assign(payload, orig.payload);
        if (current.textures && orig.textures) current.textures.base = orig.textures.base;
        this._showToast(`↺ Reset ${current.name} to code defaults`);
        this._render();
      }
    };
  }

  // ------------------------------------------------------------
  // TAB 2: HEADLESS ROUND-ROBIN BALANCING TEST
  // ------------------------------------------------------------
  static _renderBalanceTab(container) {
    container.innerHTML = `
      <div style="font-size:11px;color:#aaa;margin-bottom:12px;line-height:1.5;">
        Simulates automated headless 1v1 battles between every minit pair to compute exact win-rates and balance matrices.
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:11px;color:#9999bb;">Rounds / Pair:</span>
        <select id="sim-rounds" class="dev-input-text" style="width:100px;">
          <option value="10">10 rounds</option>
          <option value="20" selected>20 rounds</option>
          <option value="30">30 rounds</option>
        </select>
        <button class="dev-btn dev-btn-sim" id="btn-run-sim" style="flex:1;">
          ▶ RUN TOURNAMENT
        </button>
      </div>

      <div id="sim-progress-wrap" style="display:none;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#00e5ff;margin-bottom:4px;">
          <span id="sim-progress-text">Simulating...</span>
          <span id="sim-progress-pct">0%</span>
        </div>
        <div style="height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden;">
          <div id="sim-progress-bar" style="width:0%;height:100%;background:#00e5ff;transition:width 0.1s ease;"></div>
        </div>
      </div>

      <div id="sim-results-view"></div>
    `;

    const btnRun = container.querySelector('#btn-run-sim');
    const roundsSel = container.querySelector('#sim-rounds');
    const progWrap = container.querySelector('#sim-progress-wrap');
    const progBar = container.querySelector('#sim-progress-bar');
    const progText = container.querySelector('#sim-progress-text');
    const progPct = container.querySelector('#sim-progress-pct');
    const resultsView = container.querySelector('#sim-results-view');

    btnRun.onclick = async () => {
      btnRun.disabled = true;
      progWrap.style.display = 'block';
      resultsView.innerHTML = '';
      const rounds = Number(roundsSel.value) || 20;

      try {
        const results = await HeadlessSimulator.runTournament(rounds, (prog) => {
          progBar.style.width = `${prog.pct}%`;
          progPct.innerText = `${prog.pct}%`;
          progText.innerText = `${prog.completed}/${prog.total} (${prog.currentPair})`;
        });

        this._renderTournamentResults(resultsView, results);
      } catch (err) {
        resultsView.innerHTML = `<div style="color:#ff3355;font-size:11px;">Simulation Error: ${err.message}</div>`;
      } finally {
        btnRun.disabled = false;
        progWrap.style.display = 'none';
      }
    };
  }

  static _renderTournamentResults(container, results) {
    const { leaderboard, matrix, totalMatches, durationMs } = results;

    let html = `
      <div style="font-size:11px;font-weight:bold;color:#00e5ff;margin-bottom:8px;display:flex;justify-content:space-between;">
        <span>🏆 WIN-RATE LEADERBOARD (${totalMatches} matches in ${durationMs}ms)</span>
      </div>
    `;

    // Leaderboard Cards
    leaderboard.forEach((rec, idx) => {
      const tierClass = `dev-tier-${rec.tier.charAt(0)}`;
      html += `
        <div class="dev-lead-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#666;font-family:monospace;width:14px;">#${idx + 1}</span>
            <span class="dev-tier-badge ${tierClass}">${rec.tier}</span>
            <strong style="color:#${rec.color.toString(16).padStart(6, '0')}">${rec.name}</strong>
          </div>
          <div style="display:flex;gap:12px;font-family:monospace;font-size:10px;">
            <span style="color:#00ff66;">${rec.wins}W</span>
            <span style="color:#ff3366;">${rec.losses}L</span>
            <span style="color:#888;">${rec.draws}D</span>
            <span style="color:#00e5ff;font-weight:bold;min-width:44px;text-align:right;">${rec.winRate}%</span>
          </div>
        </div>
      `;
    });

    // 7x7 Matchup Matrix Table
    html += `
      <div style="font-size:11px;font-weight:bold;color:#00e5ff;margin-top:16px;margin-bottom:6px;">
        📊 1V1 MATCHUP MATRIX (Row vs Col Win %)
      </div>
      <div class="dev-matrix-wrap">
        <table class="dev-matrix-table">
          <thead>
            <tr>
              <th>vs</th>
              ${leaderboard.map((m) => `<th>${m.name.slice(0, 4)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    leaderboard.forEach((rowM) => {
      html += `<tr><th>${rowM.name.slice(0, 4)}</th>`;
      leaderboard.forEach((colM) => {
        if (rowM.id === colM.id) {
          html += `<td class="self">-</td>`;
        } else {
          const rec = matrix[rowM.id][colM.id];
          const total = rec.wins + rec.losses + rec.draws;
          const pct = total > 0 ? Math.round((rec.wins / total) * 100) : 0;
          const cellClass = pct >= 60 ? 'win-fav' : pct <= 40 ? 'loss-fav' : '';
          html += `<td class="${cellClass}">${pct}%</td>`;
        }
      });
      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  // ------------------------------------------------------------
  // TAB 3: TELEMETRY & ENGINE STATS
  // ------------------------------------------------------------
  static _renderTelemetryTab(container) {
    const isLandscape = window.innerWidth >= window.innerHeight;
    const minitsCount = Object.keys(MinitEngine.Registry.minits).length;

    container.innerHTML = `
      <div class="dev-field-group">
        <div class="dev-field-label"><span>Engine FPS</span><span class="dev-field-value">${this.fps} FPS</span></div>
        <div class="dev-field-label"><span>Orientation</span><span class="dev-field-value">${isLandscape ? 'Landscape (Desktop)' : 'Portrait (Mobile)'}</span></div>
        <div class="dev-field-label"><span>Window Dimensions</span><span class="dev-field-value">${window.innerWidth} × ${window.innerHeight}</span></div>
        <div class="dev-field-label"><span>Active Minits</span><span class="dev-field-value">${minitsCount} Registered</span></div>
      </div>

      <div style="margin-top:16px;border-top:1px solid #242436;padding-top:12px;">
        <div style="font-size:11px;font-weight:bold;color:#00e5ff;margin-bottom:8px;">QUICK ACTIONS</div>
        <div class="dev-btn-row">
          <button class="dev-btn" id="btn-reload-game">↺ RELOAD PAGE</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-reload-game').onclick = () => window.location.reload();
  }
}
