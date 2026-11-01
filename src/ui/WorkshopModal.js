// ============================================================
// RETRO PIXEL WORKSHOP & DEVELOPER MODAL OVERLAY (ES Module)
// Tab 1: External Minit Importer (.js + .png Auto-Sync) & LocalStorage Manager
// Tab 2: Headless Balance Check System (Leaderboard, TTK, DPS & Matchup Matrix)
// Tab 3: Live Combat Debugging Mode & Simulation Speed Controls
// ============================================================
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { CustomMinitManager } from '../engine/CustomMinitManager.js';
import { HeadlessSimulator } from '../engine/HeadlessSimulator.js';
import { DebugConfig } from '../engine/DebugConfig.js';

function numToHexColor(num = 0x00e5ff) {
  return '#' + Number(num).toString(16).padStart(6, '0');
}

export class WorkshopModal {
  constructor({ app, onMinitsChanged }) {
    this.app = app;
    this.onMinitsChanged = onMinitsChanged;
    this.activeTab = 'minits'; // 'minits' | 'balance' | 'debug'
    this.isRunningBalance = false;
    this.lastBalanceReport = null;
    this.roundsPerPair = 20;
    this.maxTicks = 3000; // 50s simulated time
    this.statusMessage = null; // { type: 'ok' | 'warn' | 'err', text: string, details: string[] }

    this._injectStyles();
    this._createDOM();
  }

  _injectStyles() {
    if (document.getElementById('minit-workshop-styles')) return;
    const style = document.createElement('style');
    style.id = 'minit-workshop-styles';
    style.textContent = `
      .mw-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(4, 4, 10, 0.84);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
        user-select: text;
        -webkit-user-select: text;
        touch-action: auto;
      }
      .mw-backdrop.open {
        display: flex;
      }
      .mw-window {
        width: 100%;
        max-width: 960px;
        max-height: 90vh;
        background: #0b0b14;
        border: 2px solid #00e5ff;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        color: #f0f4f8;
        font-family: monospace;
        position: relative;
        overflow: hidden;
      }
      .mw-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: #121222;
        border-bottom: 2px solid #24243a;
      }
      .mw-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        color: #00e5ff;
        letter-spacing: 1px;
        margin: 0;
      }
      .mw-close-btn {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        background: #1a1a2e;
        color: #ff1155;
        border: 2px solid #ff1155;
        padding: 7px 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      .mw-close-btn:hover {
        background: #ff1155;
        color: #ffffff;
      }
      .mw-tabs {
        display: flex;
        gap: 8px;
        padding: 10px 18px;
        background: #0e0e1a;
        border-bottom: 2px solid #24243a;
        flex-wrap: wrap;
      }
      .mw-tab-btn {
        font-family: 'Press Start 2P', monospace;
        font-size: 9px;
        padding: 9px 14px;
        background: #141424;
        color: #94a3b8;
        border: 2px solid #26263e;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.1s ease, border-color 0.1s ease;
      }
      .mw-tab-btn:hover {
        color: #ffffff;
        border-color: #475569;
      }
      .mw-tab-btn.active {
        background: #002b36;
        color: #00e5ff;
        border-color: #00e5ff;
      }
      .mw-body {
        padding: 18px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .mw-section {
        background: #11111e;
        border: 1px solid #25253c;
        padding: 16px;
      }
      .mw-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .mw-section-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #ffffff;
        margin: 0;
      }
      .mw-subtext {
        font-size: 12px;
        line-height: 1.5;
        color: #94a3b8;
        margin: 0 0 12px 0;
      }
      .mw-dropzone {
        border: 2px dashed #00e5ff;
        background: #0a141d;
        padding: 24px 16px;
        text-align: center;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .mw-dropzone.dragover {
        background: #002e3d;
        border-color: #00ff66;
      }
      .mw-dropzone-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #00e5ff;
        margin-bottom: 8px;
      }
      .mw-dropzone-hint {
        font-size: 12px;
        color: #cbd5e1;
        line-height: 1.5;
      }
      .mw-btn {
        font-family: 'Press Start 2P', monospace;
        font-size: 9px;
        padding: 9px 14px;
        background: #003847;
        color: #00e5ff;
        border: 2px solid #00e5ff;
        cursor: pointer;
        white-space: nowrap;
      }
      .mw-btn:hover:not(:disabled) {
        background: #00e5ff;
        color: #07070c;
      }
      .mw-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mw-btn.secondary {
        background: #181828;
        color: #e2e8f0;
        border-color: #3b3b58;
      }
      .mw-btn.secondary:hover:not(:disabled) {
        background: #2d2d46;
        color: #ffffff;
      }
      .mw-btn.danger {
        background: #2a0a16;
        color: #ff1155;
        border-color: #ff1155;
        padding: 7px 10px;
        font-size: 8px;
      }
      .mw-btn.danger:hover {
        background: #ff1155;
        color: #ffffff;
      }
      .mw-banner {
        padding: 12px 14px;
        border: 1px solid #00e5ff;
        background: #091d26;
        font-size: 12px;
        line-height: 1.5;
      }
      .mw-banner.warn {
        border-color: #ffdd00;
        background: #241f06;
        color: #fef08a;
      }
      .mw-banner.err {
        border-color: #ff1155;
        background: #290913;
        color: #fecdd3;
      }
      .mw-minit-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
        gap: 12px;
      }
      .mw-minit-card {
        background: #0d0d18;
        border: 1px solid #282842;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .mw-minit-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .mw-minit-icon {
        width: 40px;
        height: 40px;
        background: #161626;
        border: 1px solid #323250;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        image-rendering: pixelated;
      }
      .mw-minit-icon img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      .mw-minit-name {
        font-family: 'Press Start 2P', monospace;
        font-size: 9px;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mw-minit-meta {
        font-size: 11px;
        color: #94a3b8;
        font-variant-numeric: tabular-nums;
      }
      .mw-controls-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .mw-select {
        background: #0d0d18;
        color: #ffffff;
        border: 2px solid #2e2e4a;
        padding: 7px 10px;
        font-family: monospace;
        font-size: 12px;
      }
      .mw-kpi-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }
      .mw-kpi-box {
        background: #0c0c16;
        border: 1px solid #24243a;
        padding: 10px 12px;
      }
      .mw-kpi-label {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 4px;
      }
      .mw-kpi-val {
        font-family: 'Press Start 2P', monospace;
        font-size: 11px;
        color: #00e5ff;
        font-variant-numeric: tabular-nums;
      }
      .mw-table-wrap {
        overflow-x: auto;
        border: 1px solid #25253c;
      }
      .mw-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .mw-table th,
      .mw-table td {
        padding: 8px 10px;
        text-align: left;
        border-bottom: 1px solid #1e1e32;
        white-space: nowrap;
      }
      .mw-table th {
        background: #161628;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 600;
      }
      .mw-table tr:hover td {
        background: #151525;
      }
      .mw-bar-track {
        width: 72px;
        height: 7px;
        background: #1e1e30;
        display: inline-block;
        vertical-align: middle;
        margin-right: 6px;
      }
      .mw-bar-fill {
        height: 100%;
        background: #00e5ff;
      }
      .mw-matrix-cell {
        text-align: center !important;
        font-weight: 600;
        min-width: 58px;
      }
      .mw-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #1e1e32;
        gap: 16px;
      }
      .mw-toggle-row:last-child {
        border-bottom: none;
      }
      .mw-checkbox {
        width: 18px;
        height: 18px;
        accent-color: #00e5ff;
        cursor: pointer;
      }
      .mw-progress-bar {
        width: 100%;
        height: 12px;
        background: #161626;
        border: 1px solid #2e2e4a;
        overflow: hidden;
        margin-top: 8px;
      }
      .mw-progress-fill {
        height: 100%;
        background: #00e5ff;
        width: 0%;
        transition: width 0.1s linear;
      }
    `;
    document.head.appendChild(style);
  }

  _createDOM() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'mw-backdrop';
    this.backdrop.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.windowEl = document.createElement('div');
    this.windowEl.className = 'mw-window';
    this.backdrop.appendChild(this.windowEl);

    // Hidden file input for .js and .png auto-sync
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.multiple = true;
    this.fileInput.accept = '.js,.mjs,.png,.webp,.gif,.svg';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this._handleFilesSelected(e.target.files);
        this.fileInput.value = '';
      }
    });
    document.body.appendChild(this.fileInput);
    document.body.appendChild(this.backdrop);
  }

  open(tab = null) {
    if (tab) this.activeTab = tab;
    AudioSys.init();
    AudioSys.play('click');
    this.render();
    this.backdrop.classList.add('open');
  }

  close() {
    AudioSys.play('click');
    this.backdrop.classList.remove('open');
  }

  async _handleFilesSelected(fileList) {
    AudioSys.play('click');
    const result = await CustomMinitManager.importFiles(fileList, this.app);

    const details = [];
    if (result.importedMinits.length > 0) {
      const names = result.importedMinits
        .map((m) => `${m.name} (${m.id}${m.hasSyncedPng ? ' + PNG synced' : ' + procedural icon'})`)
        .join(', ');
      details.push(`Imported & saved to LocalStorage: ${names}`);
    }
    if (result.syncedAssets.length > 0) {
      details.push(`Auto-synced assets: ${result.syncedAssets.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      details.push(...result.warnings);
    }
    if (result.errors.length > 0) {
      details.push(...result.errors);
    }

    if (result.errors.length > 0) {
      this.statusMessage = {
        type: 'err',
        text: 'Import encountered errors:',
        details
      };
    } else if (result.warnings.length > 0) {
      this.statusMessage = {
        type: 'warn',
        text: 'Import completed with notes:',
        details
      };
    } else if (result.importedMinits.length > 0 || result.syncedAssets.length > 0) {
      AudioSys.play('start');
      this.statusMessage = {
        type: 'ok',
        text: 'Minit & assets successfully synced and saved!',
        details
      };
    }

    if (this.onMinitsChanged) {
      this.onMinitsChanged();
    }
    this.render();
  }

  _downloadTemplate() {
    AudioSys.play('click');
    const source = CustomMinitManager.getStarterTemplateSource('nova');
    const blob = new Blob([source], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nova.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _exportCustomMinit(record) {
    AudioSys.play('click');
    const blob = new Blob([record.jsSource], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.fileStem || record.id}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _deleteCustomMinit(id, name) {
    AudioSys.play('crush', 0.4);
    CustomMinitManager.deleteCustomMinit(id);
    this.statusMessage = {
      type: 'warn',
      text: `Deleted custom Minit "${name}" (${id}) from LocalStorage.`,
      details: []
    };
    if (this.onMinitsChanged) {
      this.onMinitsChanged();
    }
    this.render();
  }

  async _runBalanceSimulation() {
    if (this.isRunningBalance) return;
    this.isRunningBalance = true;
    AudioSys.play('start');
    this.render();

    const progressFill = this.windowEl.querySelector('#mw-balance-progress-fill');
    const progressLabel = this.windowEl.querySelector('#mw-balance-progress-label');

    try {
      this.lastBalanceReport = await HeadlessSimulator.runFullBalanceReport({
        roundsPerPair: this.roundsPerPair,
        maxTicks: this.maxTicks,
        onProgress: ({ completed, total, pct, currentPair }) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (progressLabel) {
            progressLabel.textContent = `Simulating ${currentPair} · ${completed} / ${total} duels (${pct}%)`;
          }
        }
      });
      AudioSys.play('win');
    } catch (err) {
      this.statusMessage = {
        type: 'err',
        text: `Balance simulation error: ${err.message}`,
        details: []
      };
    } finally {
      this.isRunningBalance = false;
      this.render();
    }
  }

  render() {
    const customRecords = CustomMinitManager.getStoredRecords();
    const dbg = DebugConfig.state;

    this.windowEl.innerHTML = `
      <div class="mw-header">
        <h2 class="mw-title">MINIT WORKSHOP & DEV SUITE</h2>
        <button class="mw-close-btn" id="mw-close-btn">CLOSE [X]</button>
      </div>

      <div class="mw-tabs">
        <button class="mw-tab-btn ${this.activeTab === 'minits' ? 'active' : ''}" data-tab="minits">
          ADD / MANAGE MINITS (${customRecords.length})
        </button>
        <button class="mw-tab-btn ${this.activeTab === 'balance' ? 'active' : ''}" data-tab="balance">
          HEADLESS BALANCE CHECK
        </button>
        <button class="mw-tab-btn ${this.activeTab === 'debug' ? 'active' : ''}" data-tab="debug">
          DEBUG MODE ${dbg.enabled ? '[ON]' : '[OFF]'}
        </button>
      </div>

      <div class="mw-body" id="mw-body-content">
        ${this.activeTab === 'minits' ? this._renderMinitsTab(customRecords) : ''}
        ${this.activeTab === 'balance' ? this._renderBalanceTab() : ''}
        ${this.activeTab === 'debug' ? this._renderDebugTab(dbg) : ''}
      </div>
    `;

    this._bindEvents(customRecords);
  }

  _renderMinitsTab(customRecords) {
    const allBuiltIns = MinitEngine.Registry.getAllMinits().filter((m) => !m.isCustom);

    return `
      ${
        this.statusMessage
          ? `<div class="mw-banner ${this.statusMessage.type}">
              <strong>${this.statusMessage.text}</strong>
              ${
                this.statusMessage.details?.length
                  ? `<div style="margin-top:6px;">${this.statusMessage.details.map((d) => `<div>· ${d}</div>`).join('')}</div>`
                  : ''
              }
            </div>`
          : ''
      }

      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">01. Import External Minit (.JS + .PNG Auto-Sync)</h3>
          <div class="mw-controls-row">
            <button class="mw-btn secondary" id="mw-download-template-btn">Download Template (.js)</button>
            <button class="mw-btn" id="mw-pick-files-btn">Select .JS & .PNG Files</button>
          </div>
        </div>
        <p class="mw-subtext">
          Select or drag-and-drop your Minit script (e.g. <code>shadow.js</code>) and sprite icon (e.g. <code>shadow.png</code>) together.
          Files with matching names automatically sync, bake in HD pixel mode, and save to LocalStorage.
        </p>

        <div class="mw-dropzone" id="mw-dropzone">
          <div class="mw-dropzone-title">DROP MINIT .JS + MATCHING .PNG FILES HERE</div>
          <div class="mw-dropzone-hint">
            Example: <strong>hero.js</strong> + <strong>hero.png</strong> &nbsp;·&nbsp; Click anywhere in this box to browse files
          </div>
        </div>
      </div>

      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">02. Saved External Minits in LocalStorage (${customRecords.length})</h3>
        </div>
        ${
          customRecords.length === 0
            ? `<p class="mw-subtext" style="margin-bottom:0;">No external Minits saved in LocalStorage yet. Import a <code>.js</code> and <code>.png</code> file above or download the starter template to create your first fighter.</p>`
            : `<div class="mw-minit-grid">
                ${customRecords
                  .map((rec) => {
                    const liveDef = MinitEngine.Registry.getMinit(rec.id);
                    const colorHex = numToHexColor(liveDef?.color || 0x00e5ff);
                    const hp = liveDef?.stats?.hp ?? 1000;
                    const spd = liveDef?.stats?.speed ?? 0.12;
                    const cd = liveDef?.action?.cd ?? 180;
                    const hasPng = Boolean(rec.assets?.base);

                    return `
                      <div class="mw-minit-card">
                        <div class="mw-minit-info">
                          <div class="mw-minit-icon" style="border-color:${colorHex}">
                            ${
                              hasPng
                                ? `<img src="${rec.assets.base}" alt="${rec.name}" />`
                                : `<span style="color:${colorHex};font-family:'Press Start 2P';font-size:10px;">${rec.name.slice(0, 2)}</span>`
                            }
                          </div>
                          <div style="min-width:0;">
                            <div class="mw-minit-name" style="color:${colorHex}">${rec.name}</div>
                            <div class="mw-minit-meta">
                              ID: ${rec.id} · ${hp} HP · SPD ${spd}
                            </div>
                            <div class="mw-minit-meta">
                              CD: ${cd}f · ${hasPng ? 'PNG Synced' : 'Procedural Icon'}
                            </div>
                          </div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
                          <button class="mw-btn secondary" style="padding:5px 8px;font-size:7px;" data-export-id="${rec.id}">Export .JS</button>
                          <button class="mw-btn danger" data-delete-id="${rec.id}" data-delete-name="${rec.name}">Delete</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
        }
      </div>

      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">03. Active Built-In Roster (${allBuiltIns.length} Core Minits)</h3>
        </div>
        <div class="mw-minit-grid">
          ${allBuiltIns
            .map((m) => {
              const colorHex = numToHexColor(m.color);
              const iconUrl = typeof m.textures?.base === 'string' ? m.textures.base : '';
              return `
                <div class="mw-minit-card">
                  <div class="mw-minit-info">
                    <div class="mw-minit-icon" style="border-color:${colorHex}">
                      ${iconUrl ? `<img src="${iconUrl}" alt="${m.name}" />` : ''}
                    </div>
                    <div>
                      <div class="mw-minit-name" style="color:${colorHex}">${m.name}</div>
                      <div class="mw-minit-meta">ID: ${m.id} · ${m.stats.hp} HP · SPD ${m.stats.speed}</div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  _renderBalanceTab() {
    const rep = this.lastBalanceReport;
    const totalMinits = MinitEngine.Registry.getMinitIds().length;
    const uniquePairs = (totalMinits * (totalMinits - 1)) / 2;

    return `
      <div class="mw-section">
        <div class="mw-section-header">
          <div>
            <h3 class="mw-section-title">01. Headless Balance Simulator Configuration</h3>
            <p class="mw-subtext" style="margin:6px 0 0 0;">
              Simulates all ${uniquePairs} unique head-to-head matchups across ${totalMinits} active Minits (including custom Minits) with alternating spawn sides.
            </p>
          </div>
          <div class="mw-controls-row">
            <label style="font-size:12px;color:#cbd5e1;">
              Rounds / Pair:
              <select class="mw-select" id="mw-rounds-select" ${this.isRunningBalance ? 'disabled' : ''}>
                <option value="10" ${this.roundsPerPair === 10 ? 'selected' : ''}>10 Rounds (${uniquePairs * 10} duels)</option>
                <option value="20" ${this.roundsPerPair === 20 ? 'selected' : ''}>20 Rounds (${uniquePairs * 20} duels)</option>
                <option value="40" ${this.roundsPerPair === 40 ? 'selected' : ''}>40 Rounds (${uniquePairs * 40} duels)</option>
                <option value="80" ${this.roundsPerPair === 80 ? 'selected' : ''}>80 Rounds (${uniquePairs * 80} duels)</option>
              </select>
            </label>
            <label style="font-size:12px;color:#cbd5e1;">
              Timeout:
              <select class="mw-select" id="mw-timeout-select" ${this.isRunningBalance ? 'disabled' : ''}>
                <option value="1800" ${this.maxTicks === 1800 ? 'selected' : ''}>30s (1800 ticks)</option>
                <option value="3000" ${this.maxTicks === 3000 ? 'selected' : ''}>50s (3000 ticks)</option>
                <option value="4500" ${this.maxTicks === 4500 ? 'selected' : ''}>75s (4500 ticks)</option>
              </select>
            </label>
            <button class="mw-btn" id="mw-run-balance-btn" ${this.isRunningBalance ? 'disabled' : ''}>
              ${this.isRunningBalance ? 'SIMULATING...' : 'RUN BALANCE CHECK'}
            </button>
          </div>
        </div>

        ${
          this.isRunningBalance
            ? `<div>
                <div id="mw-balance-progress-label" style="font-size:12px;color:#00e5ff;">Initializing headless arena...</div>
                <div class="mw-progress-bar">
                  <div class="mw-progress-fill" id="mw-balance-progress-fill"></div>
                </div>
              </div>`
            : ''
        }
      </div>

      ${
        rep
          ? this._renderBalanceReportContent(rep)
          : `<div class="mw-section" style="text-align:center;padding:32px 16px;">
              <div class="mw-dropzone-title">NO BALANCE REPORT GENERATED YET</div>
              <p class="mw-subtext" style="margin-bottom:0;">
                Click <strong>RUN BALANCE CHECK</strong> above to execute a full round-robin tournament and view winrates, Time-To-Kill (TTK), DPS, and the head-to-head matchup matrix.
              </p>
            </div>`
      }
    `;
  }

  _renderBalanceReportContent(rep) {
    const topFighter = rep.leaderboard[0];
    const highestDps = [...rep.leaderboard].sort((a, b) => b.dps - a.dps)[0];
    const fastestTtk = [...rep.leaderboard].filter((r) => r.wins > 0).sort((a, b) => a.avgTtkSec - b.avgTtkSec)[0];

    return `
      <div class="mw-kpi-row">
        <div class="mw-kpi-box">
          <div class="mw-kpi-label">Total Duels Simulated</div>
          <div class="mw-kpi-val">${rep.totalBattles} Duels (${rep.elapsedMs}ms)</div>
        </div>
        <div class="mw-kpi-box">
          <div class="mw-kpi-label">Highest Winrate</div>
          <div class="mw-kpi-val" style="color:${numToHexColor(topFighter?.color)}">
            ${topFighter ? `${topFighter.name} (${topFighter.winRate.toFixed(1)}%)` : '-'}
          </div>
        </div>
        <div class="mw-kpi-box">
          <div class="mw-kpi-label">Peak Effective DPS</div>
          <div class="mw-kpi-val" style="color:${numToHexColor(highestDps?.color)}">
            ${highestDps ? `${highestDps.name} (${highestDps.dps.toFixed(1)}/s)` : '-'}
          </div>
        </div>
        <div class="mw-kpi-box">
          <div class="mw-kpi-label">Fastest Avg Win TTK</div>
          <div class="mw-kpi-val" style="color:${numToHexColor(fastestTtk?.color)}">
            ${fastestTtk ? `${fastestTtk.name} (${fastestTtk.avgTtkSec.toFixed(1)}s)` : '-'}
          </div>
        </div>
      </div>

      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">02. Fighter Performance & Balance Telemetry</h3>
        </div>
        <div class="mw-table-wrap">
          <table class="mw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Minit</th>
                <th>Winrate</th>
                <th>W - L - D</th>
                <th>Avg Win TTK</th>
                <th>Avg DMG / Duel</th>
                <th>Eff. DPS</th>
                <th>Win HP Left</th>
                <th>Assessment</th>
              </tr>
            </thead>
            <tbody>
              ${rep.leaderboard
                .map((row, idx) => {
                  const colorHex = numToHexColor(row.color);
                  const statusColor =
                    row.balanceStatus === 'OVERTUNED'
                      ? '#ffdd00'
                      : row.balanceStatus === 'UNDERTUNED'
                      ? '#ff1155'
                      : '#00ff66';

                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>
                        <span style="color:${colorHex};font-weight:bold;">${row.name}</span>
                        ${row.isCustom ? '<span style="color:#94a3b8;font-size:10px;"> · CUSTOM</span>' : ''}
                      </td>
                      <td>
                        <div class="mw-bar-track">
                          <div class="mw-bar-fill" style="width:${Math.min(100, Math.round(row.winRate))}%;background:${colorHex};"></div>
                        </div>
                        <strong>${row.winRate.toFixed(1)}%</strong>
                      </td>
                      <td>${row.wins} - ${row.losses} - ${row.draws}</td>
                      <td>${row.avgTtkSec.toFixed(1)}s</td>
                      <td>${Math.round(row.avgDmgDealt)}</td>
                      <td>${row.dps.toFixed(1)}/s</td>
                      <td>${row.avgWinHpPct.toFixed(0)}%</td>
                      <td style="color:${statusColor};font-weight:bold;">${row.balanceStatus}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">03. Head-to-Head Matchup Winrate Matrix (Row vs. Column)</h3>
        </div>
        <p class="mw-subtext">
          Each cell shows the <strong>Row Fighter's Winrate %</strong> and average duel duration against the Column Fighter across ${rep.roundsPerPair} rounds.
        </p>
        <div class="mw-table-wrap">
          <table class="mw-table">
            <thead>
              <tr>
                <th>Row \\ Col</th>
                ${rep.minits
                  .map(
                    (m) =>
                      `<th class="mw-matrix-cell" style="color:${numToHexColor(m.color)}">${m.name.slice(0, 7)}</th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${rep.minits
                .map((rowM) => {
                  return `
                    <tr>
                      <td style="color:${numToHexColor(rowM.color)};font-weight:bold;">${rowM.name}</td>
                      ${rep.minits
                        .map((colM) => {
                          if (rowM.id === colM.id) {
                            return `<td class="mw-matrix-cell" style="color:#475569;background:#090912;">—</td>`;
                          }
                          const cell = rep.matrix[rowM.id]?.[colM.id];
                          if (!cell) return `<td class="mw-matrix-cell">-</td>`;
                          const wr = cell.winRate;
                          const bg =
                            wr >= 65
                              ? 'rgba(0, 255, 102, 0.16)'
                              : wr <= 35
                              ? 'rgba(255, 17, 85, 0.16)'
                              : 'rgba(148, 163, 184, 0.06)';
                          const fg = wr >= 65 ? '#00ff66' : wr <= 35 ? '#ff4466' : '#e2e8f0';
                          return `
                            <td class="mw-matrix-cell" style="background:${bg};color:${fg};" title="${rowM.name} vs ${colM.name}: ${wr.toFixed(1)}% Winrate (${cell.wins}W-${cell.losses}L-${cell.draws}D) | Avg TTK: ${cell.avgTtkSec.toFixed(1)}s">
                              <div>${Math.round(wr)}%</div>
                              <div style="font-size:9px;color:#94a3b8;font-weight:normal;">${cell.avgTtkSec.toFixed(0)}s</div>
                            </td>
                          `;
                        })
                        .join('')}
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderDebugTab(dbg) {
    return `
      <div class="mw-section">
        <div class="mw-section-header">
          <h3 class="mw-section-title">01. Live Combat Debugging & Inspection Overlay</h3>
        </div>
        <p class="mw-subtext">
          When enabled, live duels render real-time collision hitboxes, AOE zone radii, velocity vectors, cooldown meters, combat logs, and interactive time-scale controls.
        </p>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#00e5ff;font-size:13px;">Enable Combat Debugging Mode</div>
            <div style="font-size:11px;color:#94a3b8;">Master switch for all in-duel visual debug overlays and speed controls.</div>
          </div>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-enabled" ${dbg.enabled ? 'checked' : ''} />
        </div>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#ffffff;">Show Hitboxes & AOE Zone Radii</div>
            <div style="font-size:11px;color:#94a3b8;">Draws player collision bounds and active projectile/vortex radius rings.</div>
          </div>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-hitboxes" ${dbg.showHitboxes ? 'checked' : ''} />
        </div>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#ffffff;">Show Velocity & Targeting Vectors</div>
            <div style="font-size:11px;color:#94a3b8;">Draws directional movement vectors and target lock lines between Minits.</div>
          </div>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-vectors" ${dbg.showVectors ? 'checked' : ''} />
        </div>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#ffffff;">Show In-Arena Cooldown & Stat Readouts</div>
            <div style="font-size:11px;color:#94a3b8;">Renders live action cooldown progress bars, exact HP, and damage multipliers on fighters.</div>
          </div>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-cooldowns" ${dbg.showCooldowns ? 'checked' : ''} />
        </div>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#ffffff;">Show Engine Telemetry & Combat Event Log</div>
            <div style="font-size:11px;color:#94a3b8;">Displays FPS, tick timer, active/pooled entities, particle counts, and recent combat hits.</div>
          </div>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-telemetry" ${dbg.showTelemetry ? 'checked' : ''} />
        </div>

        <div class="mw-toggle-row">
          <div>
            <div style="font-weight:bold;color:#ffffff;">Default Simulation Speed Multiplier</div>
            <div style="font-size:11px;color:#94a3b8;">Adjust combat tick speed (can also be changed live during any duel).</div>
          </div>
          <select class="mw-select" id="mw-dbg-timescale">
            <option value="0.25" ${dbg.timeScale === 0.25 ? 'selected' : ''}>0.25x (Slow-Mo Analysis)</option>
            <option value="0.5" ${dbg.timeScale === 0.5 ? 'selected' : ''}>0.5x (Half Speed)</option>
            <option value="1" ${dbg.timeScale === 1 ? 'selected' : ''}>1.0x (Normal Speed)</option>
            <option value="2" ${dbg.timeScale === 2 ? 'selected' : ''}>2.0x (Fast Forward)</option>
            <option value="4" ${dbg.timeScale === 4 ? 'selected' : ''}>4.0x (Turbo Test)</option>
          </select>
        </div>
      </div>
    `;
  }

  _bindEvents(customRecords) {
    const closeBtn = this.windowEl.querySelector('#mw-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Tab switching
    this.windowEl.querySelectorAll('.mw-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        AudioSys.play('click');
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Tab 1 bindings
    const pickBtn = this.windowEl.querySelector('#mw-pick-files-btn');
    if (pickBtn) {
      pickBtn.addEventListener('click', () => this.fileInput.click());
    }

    const templateBtn = this.windowEl.querySelector('#mw-download-template-btn');
    if (templateBtn) {
      templateBtn.addEventListener('click', () => this._downloadTemplate());
    }

    const dropzone = this.windowEl.querySelector('#mw-dropzone');
    if (dropzone) {
      dropzone.addEventListener('click', () => this.fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer?.files?.length) {
          this._handleFilesSelected(e.dataTransfer.files);
        }
      });
    }

    this.windowEl.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        const name = btn.getAttribute('data-delete-name') || id;
        this._deleteCustomMinit(id, name);
      });
    });

    this.windowEl.querySelectorAll('[data-export-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-export-id');
        const rec = customRecords.find((r) => r.id === id);
        if (rec) this._exportCustomMinit(rec);
      });
    });

    // Tab 2 bindings
    const roundsSel = this.windowEl.querySelector('#mw-rounds-select');
    if (roundsSel) {
      roundsSel.addEventListener('change', (e) => {
        this.roundsPerPair = Number(e.target.value) || 20;
      });
    }

    const timeoutSel = this.windowEl.querySelector('#mw-timeout-select');
    if (timeoutSel) {
      timeoutSel.addEventListener('change', (e) => {
        this.maxTicks = Number(e.target.value) || 3000;
      });
    }

    const runBalanceBtn = this.windowEl.querySelector('#mw-run-balance-btn');
    if (runBalanceBtn) {
      runBalanceBtn.addEventListener('click', () => this._runBalanceSimulation());
    }

    // Tab 3 bindings
    const bindChk = (selector, key) => {
      const el = this.windowEl.querySelector(selector);
      if (el) {
        el.addEventListener('change', (e) => {
          AudioSys.play('click');
          DebugConfig.update({ [key]: Boolean(e.target.checked) });
          this.render();
        });
      }
    };

    bindChk('#mw-dbg-enabled', 'enabled');
    bindChk('#mw-dbg-hitboxes', 'showHitboxes');
    bindChk('#mw-dbg-vectors', 'showVectors');
    bindChk('#mw-dbg-cooldowns', 'showCooldowns');
    bindChk('#mw-dbg-telemetry', 'showTelemetry');

    const tsSelect = this.windowEl.querySelector('#mw-dbg-timescale');
    if (tsSelect) {
      tsSelect.addEventListener('change', (e) => {
        AudioSys.play('click');
        DebugConfig.update({ timeScale: Number(e.target.value) || 1.0 });
      });
    }
  }
}
