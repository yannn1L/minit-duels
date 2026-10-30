// ============================================================
// DEVELOPER CONSOLE & LIVE DEBUGGING SUITE (ES Module)
// Scalable to 20+ Minits, Multi-Texture File Importer, Minit File Importer
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

    this.app = app;
    this.originalSnapshot = JSON.parse(JSON.stringify(MinitEngine.Registry.minits));
    this.activeMinitId = Object.keys(MinitEngine.Registry.minits)[0] || 'laser';
    this.activeTab = 'editor'; // 'editor' | 'import' | 'balance' | 'telemetry'
    this.searchFilter = '';
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
        <button class="dev-tab-btn" data-tab="import">IMPORT MINIT</button>
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
    }, 4000);
  }

  static _render() {
    const container = document.getElementById('dev-tab-content');
    if (!container) return;

    if (this.activeTab === 'editor') {
      this._renderEditorTab(container);
    } else if (this.activeTab === 'import') {
      this._renderImportTab(container);
    } else if (this.activeTab === 'balance') {
      this._renderBalanceTab(container);
    } else {
      this._renderTelemetryTab(container);
    }
  }

  // ------------------------------------------------------------
  // TAB 1: MINIT STATS, MULTI-TEXTURE & DIRECT FILE PERSISTENCE
  // Tailored controls for each minit (prevents stat corruption)
  // ------------------------------------------------------------
  static _renderEditorTab(container) {
    const minits = MinitEngine.Registry.minits;
    const allIds = Object.keys(minits);
    const filteredIds = allIds.filter((id) =>
      id.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
      minits[id].name.toLowerCase().includes(this.searchFilter.toLowerCase())
    );

    if (!minits[this.activeMinitId] && allIds.length > 0) {
      this.activeMinitId = allIds[0];
    }
    const current = minits[this.activeMinitId];
    if (!current) return;

    const payload = current.payload || {};
    const action = current.action || {};
    const stats = current.stats || {};
    const textures = current.textures || {};

    // Dynamic tailored controls per minit
    let specificControlsHtml = '';

    if (current.id === 'moth') {
      const transAction = payload.transformation?.action || {};
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Egg Hatch Incubation (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="120" max="600" step="10" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Hatched Spore Attack (CD)</span><span class="dev-field-value" id="val-moth-atk-cd">${transAction.cd || 75}</span></div>
          <input type="range" class="dev-input-range" id="input-moth-atk-cd" min="30" max="180" step="5" value="${transAction.cd || 75}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Spore Bomb Damage</span><span class="dev-field-value" id="val-dmg">${payload.dmg || 48}</span></div>
          <input type="range" class="dev-input-range" id="input-dmg" min="10" max="120" step="2" value="${payload.dmg || 48}">
        </div>
      `;
    } else if (current.id === 'absorb') {
      const drain = payload.drain || {};
      const buff = payload.buff || {};
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Vortex Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="100" max="400" step="10" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Drain HP per Tick</span><span class="dev-field-value" id="val-absorb-hp">${drain.hp || 3.5}</span></div>
          <input type="range" class="dev-input-range" id="input-absorb-hp" min="1" max="10" step="0.5" value="${drain.hp || 3.5}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Vortex Pull Strength</span><span class="dev-field-value" id="val-absorb-speed">${drain.speed || 0.25}</span></div>
          <input type="range" class="dev-input-range" id="input-absorb-speed" min="0.05" max="0.6" step="0.05" value="${drain.speed || 0.25}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Max Growth Multiplier</span><span class="dev-field-value" id="val-absorb-maxmult">${buff.maxDmgMult || 2.0}x</span></div>
          <input type="range" class="dev-input-range" id="input-absorb-maxmult" min="1.2" max="4.0" step="0.1" value="${buff.maxDmgMult || 2.0}">
        </div>
      `;
    } else if (current.id === 'ironmen') {
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Ability Cycle Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="60" max="240" step="5" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>4x Homing Missile Damage</span><span class="dev-field-value" id="val-iron-missile">${payload.missileDmg || 32}</span></div>
          <input type="range" class="dev-input-range" id="input-iron-missile" min="10" max="60" step="1" value="${payload.missileDmg || 32}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Thruster Ram Slam Damage</span><span class="dev-field-value" id="val-iron-ram">${payload.ramDmg || 65}</span></div>
          <input type="range" class="dev-input-range" id="input-iron-ram" min="20" max="120" step="2" value="${payload.ramDmg || 65}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Unibeam Laser Tick Damage</span><span class="dev-field-value" id="val-iron-beam">${payload.beamTickDmg || 13}</span></div>
          <input type="range" class="dev-input-range" id="input-iron-beam" min="4" max="30" step="1" value="${payload.beamTickDmg || 13}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Ram Knockback Force</span><span class="dev-field-value" id="val-iron-kb">${payload.knockbackForce || 1.25}</span></div>
          <input type="range" class="dev-input-range" id="input-iron-kb" min="0.5" max="2.5" step="0.05" value="${payload.knockbackForce || 1.25}">
        </div>
      `;
    } else if (current.id === 'laser') {
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Laser Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="100" max="400" step="10" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Beam Base Tick Damage</span><span class="dev-field-value" id="val-dmg">${payload.baseDmg || 6}</span></div>
          <input type="range" class="dev-input-range" id="input-dmg" min="2" max="20" step="1" value="${payload.baseDmg || 6}">
        </div>
      `;
    } else if (current.id === 'pulsar') {
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Deploy Drone Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="80" max="360" step="10" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>360° Bullet Damage</span><span class="dev-field-value" id="val-dmg">${payload.bulletDmg || 12}</span></div>
          <input type="range" class="dev-input-range" id="input-dmg" min="4" max="40" step="1" value="${payload.bulletDmg || 12}">
        </div>
      `;
    } else if (current.id === 'waves') {
      const debuffPay = payload.debuff?.payload || {};
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Shockwave Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="100" max="400" step="10" value="${action.cd}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Paralysis Tick Damage</span><span class="dev-field-value" id="val-dmg">${debuffPay.dmg || 20}</span></div>
          <input type="range" class="dev-input-range" id="input-dmg" min="5" max="50" step="1" value="${debuffPay.dmg || 20}">
        </div>
      `;
    } else {
      // Gojo / Generic
      specificControlsHtml = `
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Ability Cooldown (CD)</span><span class="dev-field-value" id="val-cd">${action.cd || 180}</span></div>
          <input type="range" class="dev-input-range" id="input-cd" min="60" max="400" step="10" value="${action.cd || 180}">
        </div>
        <div class="dev-field-group">
          <div class="dev-field-label"><span>Attack Damage</span><span class="dev-field-value" id="val-dmg">${payload.dmg || 25}</span></div>
          <input type="range" class="dev-input-range" id="input-dmg" min="5" max="80" step="1" value="${payload.dmg || 25}">
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Scalable Minit Search & Scrollable Selector -->
      <div class="dev-search-bar">
        <input type="text" class="dev-search-input" id="dev-search-minit" placeholder="🔍 Search among ${allIds.length} minits..." value="${this.searchFilter}">
      </div>

      <div class="dev-minit-scroll-wrap">
        ${filteredIds
          .map(
            (id) => `
          <button class="dev-minit-pill ${id === this.activeMinitId ? 'active' : ''}" data-id="${id}">
            <span style="color:#${minits[id].color.toString(16).padStart(6, '0')}">●</span> ${minits[id].name}
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Core Stats -->
      <div class="dev-field-group">
        <div class="dev-field-label"><span>Max HP</span><span class="dev-field-value" id="val-hp">${stats.hp}</span></div>
        <input type="range" class="dev-input-range" id="input-hp" min="500" max="3000" step="25" value="${stats.hp}">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Movement Speed</span><span class="dev-field-value" id="val-speed">${stats.speed}</span></div>
        <input type="range" class="dev-input-range" id="input-speed" min="0.0" max="0.35" step="0.01" value="${stats.speed}">
      </div>

      <!-- Tailored Minit-Specific Controls -->
      ${specificControlsHtml}

      <!-- Multi-Texture Manager with File Importer -->
      <div style="margin-top:14px;border-top:1px solid #242436;padding-top:10px;">
        <div class="dev-field-label" style="font-weight:bold;color:#00e5ff;">TEXTURES (${Object.keys(textures).length})</div>
        <div id="dev-textures-list">
          ${Object.keys(textures)
            .map(
              (tKey) => `
            <div class="dev-tex-row" data-key="${tKey}">
              <span class="dev-tex-badge">${tKey}</span>
              <input type="text" class="dev-input-text dev-tex-path-input" data-key="${tKey}" value="${textures[tKey]}" style="flex:1;">
              <label class="dev-file-btn">
                📁 IMPORT
                <input type="file" class="dev-tex-file-picker" data-key="${tKey}" accept="image/png,image/svg+xml,image/jpeg" style="display:none;">
              </label>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="dev-btn-row" style="flex-wrap: wrap;">
        <button class="dev-btn dev-btn-save" id="btn-save-disk" style="min-width: 140px;">💾 SAVE TO FILE</button>
        <button class="dev-btn" id="btn-copy-code">📋 COPY CODE</button>
        <button class="dev-btn" id="btn-download-file">📥 DOWNLOAD</button>
        <button class="dev-btn" id="btn-reset-memory">↺ RESET</button>
      </div>

      <div style="margin-top:10px;font-size:10px;color:#8888aa;line-height:1.4;">
        💡 Changes apply in-game immediately! Click <b>SAVE TO FILE</b> to save on disk, or <b>COPY CODE</b> to paste directly to GitHub.
      </div>
    `;

    // Search filter listener
    const searchInput = container.querySelector('#dev-search-minit');
    searchInput.oninput = (e) => {
      this.searchFilter = e.target.value;
      const scrollWrap = container.querySelector('.dev-minit-scroll-wrap');
      const matches = allIds.filter((id) =>
        id.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
        minits[id].name.toLowerCase().includes(this.searchFilter.toLowerCase())
      );
      scrollWrap.innerHTML = matches
        .map(
          (id) => `
        <button class="dev-minit-pill ${id === this.activeMinitId ? 'active' : ''}" data-id="${id}">
          <span style="color:#${minits[id].color.toString(16).padStart(6, '0')}">●</span> ${minits[id].name}
        </button>
      `
        )
        .join('');

      scrollWrap.querySelectorAll('.dev-minit-pill').forEach((btn) => {
        btn.onclick = () => {
          this.activeMinitId = btn.getAttribute('data-id');
          this._render();
        };
      });
    };

    // Minit pill switcher
    container.querySelectorAll('.dev-minit-pill').forEach((btn) => {
      btn.onclick = () => {
        this.activeMinitId = btn.getAttribute('data-id');
        this._render();
      };
    });

    // Reactive input listeners for core stats
    const inpHp = container.querySelector('#input-hp');
    if (inpHp) {
      inpHp.oninput = (e) => {
        stats.hp = Number(e.target.value);
        container.querySelector('#val-hp').innerText = stats.hp;
      };
    }

    const inpSpeed = container.querySelector('#input-speed');
    if (inpSpeed) {
      inpSpeed.oninput = (e) => {
        stats.speed = Number(e.target.value);
        container.querySelector('#val-speed').innerText = stats.speed;
      };
    }

    const inpCd = container.querySelector('#input-cd');
    if (inpCd) {
      inpCd.oninput = (e) => {
        action.cd = Number(e.target.value);
        container.querySelector('#val-cd').innerText = action.cd;
      };
    }

    // Specific listeners
    if (current.id === 'moth') {
      const inpHatchAtk = container.querySelector('#input-moth-atk-cd');
      if (inpHatchAtk && payload.transformation?.action) {
        inpHatchAtk.oninput = (e) => {
          const v = Number(e.target.value);
          payload.transformation.action.cd = v;
          container.querySelector('#val-moth-atk-cd').innerText = v;
        };
      }
      const inpDmg = container.querySelector('#input-dmg');
      if (inpDmg) {
        inpDmg.oninput = (e) => {
          const v = Number(e.target.value);
          payload.dmg = v;
          container.querySelector('#val-dmg').innerText = v;
        };
      }
    } else if (current.id === 'absorb') {
      const inpHp = container.querySelector('#input-absorb-hp');
      if (inpHp && payload.drain) {
        inpHp.oninput = (e) => {
          const v = Number(e.target.value);
          payload.drain.hp = v;
          container.querySelector('#val-absorb-hp').innerText = v;
        };
      }
      const inpSpd = container.querySelector('#input-absorb-speed');
      if (inpSpd && payload.drain) {
        inpSpd.oninput = (e) => {
          const v = Number(e.target.value);
          payload.drain.speed = v;
          container.querySelector('#val-absorb-speed').innerText = v;
        };
      }
      const inpMax = container.querySelector('#input-absorb-maxmult');
      if (inpMax && payload.buff) {
        inpMax.oninput = (e) => {
          const v = Number(e.target.value);
          payload.buff.maxDmgMult = v;
          container.querySelector('#val-absorb-maxmult').innerText = `${v}x`;
        };
      }
    } else if (current.id === 'ironmen') {
      const inpMis = container.querySelector('#input-iron-missile');
      if (inpMis) {
        inpMis.oninput = (e) => {
          const v = Number(e.target.value);
          payload.missileDmg = v;
          container.querySelector('#val-iron-missile').innerText = v;
        };
      }
      const inpRam = container.querySelector('#input-iron-ram');
      if (inpRam) {
        inpRam.oninput = (e) => {
          const v = Number(e.target.value);
          payload.ramDmg = v;
          container.querySelector('#val-iron-ram').innerText = v;
        };
      }
      const inpBm = container.querySelector('#input-iron-beam');
      if (inpBm) {
        inpBm.oninput = (e) => {
          const v = Number(e.target.value);
          payload.beamTickDmg = v;
          container.querySelector('#val-iron-beam').innerText = v;
        };
      }
      const inpKb = container.querySelector('#input-iron-kb');
      if (inpKb) {
        inpKb.oninput = (e) => {
          const v = Number(e.target.value);
          payload.knockbackForce = v;
          container.querySelector('#val-iron-kb').innerText = v;
        };
      }
    } else if (current.id === 'laser') {
      const inpDmg = container.querySelector('#input-dmg');
      if (inpDmg) {
        inpDmg.oninput = (e) => {
          const v = Number(e.target.value);
          payload.baseDmg = v;
          container.querySelector('#val-dmg').innerText = v;
        };
      }
    } else if (current.id === 'pulsar') {
      const inpDmg = container.querySelector('#input-dmg');
      if (inpDmg) {
        inpDmg.oninput = (e) => {
          const v = Number(e.target.value);
          payload.bulletDmg = v;
          container.querySelector('#val-dmg').innerText = v;
        };
      }
    } else if (current.id === 'waves') {
      const inpDmg = container.querySelector('#input-dmg');
      if (inpDmg && payload.debuff?.payload) {
        inpDmg.oninput = (e) => {
          const v = Number(e.target.value);
          payload.debuff.payload.dmg = v;
          container.querySelector('#val-dmg').innerText = v;
        };
      }
    } else {
      const inpDmg = container.querySelector('#input-dmg');
      if (inpDmg) {
        inpDmg.oninput = (e) => {
          const v = Number(e.target.value);
          payload.dmg = v;
          container.querySelector('#val-dmg').innerText = v;
        };
      }
    }

    // Texture path text edit
    container.querySelectorAll('.dev-tex-path-input').forEach((inp) => {
      inp.onchange = (e) => {
        const tKey = inp.getAttribute('data-key');
        const newPath = e.target.value.trim();
        textures[tKey] = newPath;
        this._hotSwapTexture(current.id, tKey, newPath);
      };
    });

    // Texture external file import & upload
    container.querySelectorAll('.dev-tex-file-picker').forEach((fileInput) => {
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const tKey = fileInput.getAttribute('data-key');
        const reader = new FileReader();

        reader.onload = async (ev) => {
          const dataBase64 = ev.target.result;

          // 1. Live WebGL hot-swap
          this._hotSwapTexture(current.id, tKey, dataBase64);

          // 2. Upload file to public/assets/minit_icon
          try {
            const res = await fetch('/api/dev/upload-asset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: file.name,
                dataBase64
              })
            });
            const data = await res.json();
            if (data.success) {
              textures[tKey] = data.path;
              const pathInput = container.querySelector(`.dev-tex-path-input[data-key="${tKey}"]`);
              if (pathInput) pathInput.value = data.path;
              this._showToast(`✓ Loaded & saved ${file.name} to project assets!`);
            } else {
              this._showToast(`✗ Upload error: ${data.error}`, true);
            }
          } catch (err) {
            this._showToast(`✗ Server upload failed`, true);
          }
        };

        reader.readAsDataURL(file);
      };
    });

    // Save Directly to File (POST /api/dev/save-minit) with fullCode
    container.querySelector('#btn-save-disk').onclick = async () => {
      const saveBtn = container.querySelector('#btn-save-disk');
      saveBtn.innerText = 'SAVING TO FILE...';
      try {
        const fullCode = await DevConsole._generateMinitCode(current, stats, payload, action, textures);
        const res = await fetch('/api/dev/save-minit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: current.id,
            fullCode,
            stats: { hp: stats.hp, speed: stats.speed },
            payload,
            actionCd: action.cd,
            textures
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
        saveBtn.innerText = '💾 SAVE TO FILE';
      }
    };

    // Copy Code to Clipboard
    container.querySelector('#btn-copy-code').onclick = async () => {
      const code = await DevConsole._generateMinitCode(current, stats, payload, action, textures);
      try {
        await navigator.clipboard.writeText(code);
        this._showToast(`✓ Copied src/minits/${current.id}.js to clipboard!`);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        this._showToast(`✓ Copied src/minits/${current.id}.js to clipboard!`);
      }
    };

    // Download .js File
    container.querySelector('#btn-download-file').onclick = async () => {
      const code = await DevConsole._generateMinitCode(current, stats, payload, action, textures);
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${current.id}.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._showToast(`✓ Downloaded ${current.id}.js!`);
    };

    // Reset In-Memory to Defaults
    container.querySelector('#btn-reset-memory').onclick = () => {
      const orig = this.originalSnapshot[current.id];
      if (orig) {
        stats.hp = orig.stats.hp;
        stats.speed = orig.stats.speed;
        if (action.cd && orig.action) action.cd = orig.action.cd;
        if (payload && orig.payload) Object.assign(payload, JSON.parse(JSON.stringify(orig.payload)));
        if (current.textures && orig.textures) Object.assign(current.textures, orig.textures);
        this._showToast(`↺ Reset ${current.name} to code defaults`);
        this._render();
      }
    };
  }

  static async _generateMinitCode(current, stats, payload, action, textures) {
    let baseCode = '';
    try {
      const res = await fetch(`/src/minits/${current.id}.js`);
      if (res.ok) baseCode = await res.text();
    } catch (e) {}

    if (baseCode) {
      if (stats.hp !== undefined) {
        baseCode = baseCode.replace(/(hp:\s*)\d+(\.\d+)?/g, `$1${stats.hp}`);
      }
      if (stats.speed !== undefined) {
        baseCode = baseCode.replace(/(speed:\s*)\d+(\.\d+)?/g, `$1${stats.speed}`);
      }
      if (action.cd !== undefined) {
        if (current.id === 'moth') {
          // Replace only the first action cd (incubation hatch)
          baseCode = baseCode.replace(/(action:\s*\{\s*cd:\s*)\d+/g, `$1${action.cd}`);
        } else {
          baseCode = baseCode.replace(/(cd:\s*)\d+/g, `$1${action.cd}`);
        }
      }

      // Per-minit precise replacements
      if (current.id === 'moth') {
        const transCd = payload.transformation?.action?.cd;
        if (transCd !== undefined) {
          baseCode = baseCode.replace(
            /(transformation:\s*\{[\s\S]*?action:\s*\{\s*cd:\s*)\d+/g,
            `$1${transCd}`
          );
        }
        if (payload.dmg !== undefined) {
          baseCode = baseCode.replace(/(dmg:\s*)\d+(\.\d+)?/g, `$1${payload.dmg}`);
        }
      } else if (current.id === 'absorb') {
        if (payload.drain?.hp !== undefined) {
          baseCode = baseCode.replace(/(hp:\s*)\d+(\.\d+)?/g, (match, p1, offset, string) => {
            if (string.slice(offset - 40, offset).includes('drain')) return `${p1}${payload.drain.hp}`;
            return match;
          });
        }
        if (payload.drain?.speed !== undefined) {
          baseCode = baseCode.replace(/(speed:\s*)\d+(\.\d+)?/g, (match, p1, offset, string) => {
            if (string.slice(offset - 40, offset).includes('drain')) return `${p1}${payload.drain.speed}`;
            return match;
          });
        }
        if (payload.buff?.maxDmgMult !== undefined) {
          baseCode = baseCode.replace(/(maxDmgMult:\s*)\d+(\.\d+)?/g, `$1${payload.buff.maxDmgMult}`);
        }
      } else if (current.id === 'ironmen') {
        if (payload.missileDmg !== undefined) {
          baseCode = baseCode.replace(/(missileDmg:\s*)\d+(\.\d+)?/g, `$1${payload.missileDmg}`);
        }
        if (payload.ramDmg !== undefined) {
          baseCode = baseCode.replace(/(ramDmg:\s*)\d+(\.\d+)?/g, `$1${payload.ramDmg}`);
        }
        if (payload.beamTickDmg !== undefined) {
          baseCode = baseCode.replace(/(beamTickDmg:\s*)\d+(\.\d+)?/g, `$1${payload.beamTickDmg}`);
        }
        if (payload.knockbackForce !== undefined) {
          baseCode = baseCode.replace(/(knockbackForce:\s*)\d+(\.\d+)?/g, `$1${payload.knockbackForce}`);
        }
      } else if (current.id === 'laser') {
        if (payload.baseDmg !== undefined) {
          baseCode = baseCode.replace(/(baseDmg:\s*)\d+(\.\d+)?/g, `$1${payload.baseDmg}`);
        }
      } else if (current.id === 'pulsar') {
        if (payload.bulletDmg !== undefined) {
          baseCode = baseCode.replace(/(bulletDmg:\s*)\d+(\.\d+)?/g, `$1${payload.bulletDmg}`);
        }
      } else if (current.id === 'waves') {
        if (payload.debuff?.payload?.dmg !== undefined) {
          baseCode = baseCode.replace(/(dmg:\s*)\d+(\.\d+)?/g, `$1${payload.debuff.payload.dmg}`);
        }
      } else if (payload.dmg !== undefined) {
        baseCode = baseCode.replace(/(dmg:\s*)\d+(\.\d+)?/g, `$1${payload.dmg}`);
      }

      if (textures) {
        for (const [tKey, tPath] of Object.entries(textures)) {
          const reg = new RegExp(`(${tKey}:\\s*['"])[^'"]+(['"])`, 'g');
          baseCode = baseCode.replace(reg, `$1${tPath}$2`);
        }
      }
      return baseCode;
    }

    return `// Updated ${current.name}\nexport const MINIT_${current.id.toUpperCase()} = ${JSON.stringify(current, null, 2)};`;
  }

  static _hotSwapTexture(minitId, textureKey, sourceUrl) {
    const regKey = `minit_${minitId}_${textureKey}`;
    try {
      const tex = PIXI.Texture.from(sourceUrl);
      if (tex?.baseTexture) {
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        tex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
        tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
      }
      Textures[regKey] = tex;
    } catch (err) {
      console.warn('Hot swap texture failed', err);
    }
  }

  // ------------------------------------------------------------
  // TAB 2: IMPORT MINIT FILE (.JS / .TS) & SAVE DIRECTLY TO PROJECT
  // ------------------------------------------------------------
  static _renderImportTab(container) {
    container.innerHTML = `
      <div style="font-size:11px;color:#aaa;margin-bottom:12px;line-height:1.5;">
        Upload or paste a <code>minit &lt;id&gt;.js</code> or <code>.ts</code> file to instantly load it into the engine and persist it directly to project files.
      </div>

      <div class="dev-dropzone" id="dev-minit-dropzone">
        <div style="font-size:24px;margin-bottom:6px;">📄</div>
        <div style="font-size:11px;font-weight:bold;color:#00e5ff;">CLICK TO BROWSE OR DROP MINIT FILE (.js / .ts)</div>
        <div style="font-size:10px;color:#888;margin-top:4px;">Supported: MINIT_&lt;NAME&gt; object definitions</div>
        <input type="file" id="dev-minit-file-input" accept=".js,.ts" style="display:none;">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Minit File Name</span></div>
        <input type="text" class="dev-input-text" id="dev-import-filename" placeholder="e.g. striker.js" value="">
      </div>

      <div class="dev-field-group">
        <div class="dev-field-label"><span>Minit Code Preview</span></div>
        <textarea class="dev-code-editor" id="dev-import-code" placeholder="// Paste or inspect imported minit code here..."></textarea>
      </div>

      <div class="dev-btn-row">
        <button class="dev-btn dev-btn-save" id="btn-save-minit-file">💾 SAVE TO PROJECT FILES</button>
      </div>
    `;

    const dropzone = container.querySelector('#dev-minit-dropzone');
    const fileInput = container.querySelector('#dev-minit-file-input');
    const filenameInput = container.querySelector('#dev-import-filename');
    const codeArea = container.querySelector('#dev-import-code');
    const btnSave = container.querySelector('#btn-save-minit-file');

    dropzone.onclick = () => fileInput.click();

    // Drag and drop handlers
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#00e5ff';
    };
    dropzone.ondragleave = () => {
      dropzone.style.borderColor = '#33334e';
    };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#33334e';
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    };

    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    };

    const handleFile = (file) => {
      filenameInput.value = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        codeArea.value = ev.target.result;
        this._showToast(`Loaded ${file.name}`);
      };
      reader.readAsText(file);
    };

    // Save and register minit directly to project
    btnSave.onclick = async () => {
      const filename = filenameInput.value.trim();
      const content = codeArea.value.trim();

      if (!filename || !content) {
        this._showToast('Please provide both filename and code', true);
        return;
      }

      btnSave.innerText = 'SAVING TO PROJECT...';
      try {
        // Extract exported variable name
        const match = content.match(/export\s+const\s+(MINIT_\w+)/);
        const varName = match ? match[1] : null;

        const res = await fetch('/api/dev/save-minit-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            content,
            varName
          })
        });

        const data = await res.json();
        if (data.success) {
          this._showToast(data.message);

          // Dynamically eval minit object in-memory for zero-reload playability
          try {
            const cleanCode = content
              .replace(/import\s+[^;]+;/g, '')
              .replace(/export\s+const\s+\w+\s*=/, 'return');
            const evalFn = new Function(cleanCode);
            const parsedMinit = evalFn();
            if (parsedMinit && parsedMinit.id) {
              MinitEngine.Registry.addMinit(parsedMinit);
              this.activeMinitId = parsedMinit.id;
            }
          } catch (evalErr) {
            console.log('Registered in project files (full reload will apply traits)');
          }
        } else {
          this._showToast(`✗ ${data.error}`, true);
        }
      } catch (err) {
        this._showToast(`✗ Failed to save minit to project`, true);
      } finally {
        btnSave.innerText = '💾 SAVE TO PROJECT FILES';
      }
    };
  }

  // ------------------------------------------------------------
  // TAB 3: HEADLESS ROUND-ROBIN BALANCING TEST
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
  // TAB 4: TELEMETRY & ENGINE STATS
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
