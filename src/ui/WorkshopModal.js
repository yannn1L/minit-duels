// ============================================================
// COMPACT DEV & WORKSHOP MODAL OVERLAY (ES Module)
// Streamlined 3-Tab Popup: Minits, Balance Check & Debug Mode
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
    this.maxTicks = 3000;
    this.statusMessage = null;

    this._injectStyles();
    this._createDOM();
  }

  _injectStyles() {
    const existing = document.getElementById('minit-workshop-styles');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'minit-workshop-styles';
    style.textContent = `
      .mw-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(4, 4, 10, 0.82);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 12px;
        user-select: text;
        -webkit-user-select: text;
        touch-action: auto;
      }
      .mw-backdrop.open {
        display: flex;
      }
      .mw-window {
        width: 100%;
        max-width: 640px;
        max-height: 84vh;
        background: #0b0b14;
        border: 2px solid #00e5ff;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.85);
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
        padding: 10px 14px;
        background: #121222;
        border-bottom: 1px solid #24243a;
        gap: 8px;
      }
      .mw-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #00e5ff;
        margin: 0;
        white-space: nowrap;
      }
      .mw-tabs {
        display: flex;
        gap: 6px;
        padding: 8px 14px;
        background: #0e0e1a;
        border-bottom: 1px solid #24243a;
      }
      .mw-tab-btn {
        flex: 1;
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        padding: 8px 6px;
        background: #141424;
        color: #94a3b8;
        border: 1px solid #26263e;
        cursor: pointer;
        white-space: nowrap;
        text-align: center;
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
      .mw-close-btn {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        background: #1a1a2e;
        color: #ff1155;
        border: 1px solid #ff1155;
        padding: 6px 9px;
        cursor: pointer;
        white-space: nowrap;
      }
      .mw-close-btn:hover {
        background: #ff1155;
        color: #ffffff;
      }
      .mw-body {
        padding: 12px 14px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mw-box {
        background: #10101c;
        border: 1px solid #232338;
        padding: 10px 12px;
      }
      .mw-row-between {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .mw-label {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #e2e8f0;
        margin: 0;
      }
      .mw-hint {
        font-size: 11px;
        color: #94a3b8;
        margin: 4px 0 0 0;
        line-height: 1.4;
      }
      .mw-dropzone {
        border: 1px dashed #00e5ff;
        background: #09131c;
        padding: 14px 12px;
        text-align: center;
        cursor: pointer;
        margin-top: 8px;
      }
      .mw-dropzone.dragover {
        background: #002e3d;
        border-color: #00ff66;
      }
      .mw-dropzone-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #00e5ff;
        margin-bottom: 4px;
      }
      .mw-btn {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        padding: 7px 10px;
        background: #003847;
        color: #00e5ff;
        border: 1px solid #00e5ff;
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
        color: #cbd5e1;
        border-color: #3b3b58;
      }
      .mw-btn.secondary:hover:not(:disabled) {
        background: #282840;
        color: #ffffff;
      }
      .mw-btn.danger {
        background: #2a0a16;
        color: #ff1155;
        border-color: #ff1155;
        padding: 5px 8px;
        font-size: 7px;
      }
      .mw-btn.danger:hover {
        background: #ff1155;
        color: #ffffff;
      }
      .mw-banner {
        padding: 8px 10px;
        border: 1px solid #00e5ff;
        background: #091d26;
        font-size: 11px;
        line-height: 1.4;
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
      .mw-minit-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
      }
      .mw-minit-item {
        background: #0c0c16;
        border: 1px solid #24243a;
        padding: 7px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .mw-minit-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .mw-minit-icon {
        width: 28px;
        height: 28px;
        background: #151525;
        border: 1px solid #30304c;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        image-rendering: pixelated;
      }
      .mw-minit-icon img {
        width: 22px;
        height: 22px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      .mw-minit-name {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        white-space: nowrap;
      }
      .mw-minit-meta {
        font-size: 10px;
        color: #94a3b8;
        font-variant-numeric: tabular-nums;
      }
      .mw-select {
        background: #0c0c16;
        color: #ffffff;
        border: 1px solid #2e2e4a;
        padding: 5px 8px;
        font-family: monospace;
        font-size: 11px;
      }
      .mw-table-wrap {
        overflow-x: auto;
        border: 1px solid #232338;
      }
      .mw-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .mw-table th,
      .mw-table td {
        padding: 6px 8px;
        text-align: left;
        border-bottom: 1px solid #1b1b2e;
        white-space: nowrap;
      }
      .mw-table th {
        background: #151526;
        color: #94a3b8;
        font-size: 10px;
      }
      .mw-matrix-cell {
        text-align: center !important;
        font-weight: 600;
        min-width: 44px;
      }
      .mw-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #1b1b2e;
        gap: 12px;
        font-size: 12px;
      }
      .mw-toggle-row:last-child {
        border-bottom: none;
      }
      .mw-checkbox {
        width: 16px;
        height: 16px;
        accent-color: #00e5ff;
        cursor: pointer;
      }
      .mw-progress-bar {
        width: 100%;
        height: 8px;
        background: #161626;
        border: 1px solid #2e2e4a;
        overflow: hidden;
        margin-top: 6px;
      }
      .mw-progress-fill {
        height: 100%;
        background: #00e5ff;
        width: 0%;
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
        .map((m) => `${m.name} (${m.hasSyncedPng ? 'PNG synced' : 'procedural icon'})`)
        .join(', ');
      details.push(`Saved: ${names}`);
    }
    if (result.syncedAssets.length > 0) {
      details.push(`Synced: ${result.syncedAssets.join(', ')}`);
    }
    if (result.warnings.length > 0) details.push(...result.warnings);
    if (result.errors.length > 0) details.push(...result.errors);

    if (result.errors.length > 0) {
      this.statusMessage = { type: 'err', text: 'Import error:', details };
    } else if (result.warnings.length > 0) {
      this.statusMessage = { type: 'warn', text: 'Import note:', details };
    } else if (result.importedMinits.length > 0 || result.syncedAssets.length > 0) {
      AudioSys.play('start');
      this.statusMessage = { type: 'ok', text: 'Minit synced & saved!', details };
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
      text: `Deleted "${name}" (${id}).`,
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
            progressLabel.textContent = `${currentPair} · ${completed}/${total} (${pct}%)`;
          }
        }
      });
      AudioSys.play('win');
    } catch (err) {
      this.statusMessage = {
        type: 'err',
        text: `Simulation error: ${err.message}`,
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
        <h2 class="mw-title">DEV & MINIT WORKSHOP</h2>
        <button class="mw-close-btn" id="mw-close-btn">X</button>
      </div>

      <div class="mw-tabs">
        <button class="mw-tab-btn ${this.activeTab === 'minits' ? 'active' : ''}" data-tab="minits">
          MINITS (${customRecords.length})
        </button>
        <button class="mw-tab-btn ${this.activeTab === 'balance' ? 'active' : ''}" data-tab="balance">
          BALANCE
        </button>
        <button class="mw-tab-btn ${this.activeTab === 'debug' ? 'active' : ''}" data-tab="debug">
          DEBUG ${dbg.enabled ? '[ON]' : '[OFF]'}
        </button>
      </div>

      <div class="mw-body">
        ${this.activeTab === 'minits' ? this._renderMinitsTab(customRecords) : ''}
        ${this.activeTab === 'balance' ? this._renderBalanceTab() : ''}
        ${this.activeTab === 'debug' ? this._renderDebugTab(dbg) : ''}
      </div>
    `;

    this._bindEvents(customRecords);
  }

  _renderMinitsTab(customRecords) {
    return `
      ${
        this.statusMessage
          ? `<div class="mw-banner ${this.statusMessage.type}">
              <strong>${this.statusMessage.text}</strong>
              ${
                this.statusMessage.details?.length
                  ? `<div>${this.statusMessage.details.map((d) => `· ${d}`).join('<br/>')}</div>`
                  : ''
              }
            </div>`
          : ''
      }

      <div class="mw-box">
        <div class="mw-row-between">
          <span class="mw-label">IMPORT MINIT (.JS + .PNG)</span>
          <div style="display:flex;gap:6px;">
            <button class="mw-btn secondary" id="mw-download-template-btn">Template .JS</button>
            <button class="mw-btn" id="mw-pick-files-btn">+ Select Files</button>
          </div>
        </div>
        <div class="mw-dropzone" id="mw-dropzone">
          <div class="mw-dropzone-title">DROP .JS & MATCHING .PNG HERE</div>
          <div class="mw-hint">Same filename auto-syncs (e.g. <b>hero.js</b> + <b>hero.png</b>)</div>
        </div>
      </div>

      <div class="mw-box">
        <div class="mw-row-between">
          <span class="mw-label">SAVED CUSTOM MINITS (${customRecords.length})</span>
        </div>
        ${
          customRecords.length === 0
            ? `<p class="mw-hint">No custom Minits saved yet.</p>`
            : `<div class="mw-minit-list">
                ${customRecords
                  .map((rec) => {
                    const liveDef = MinitEngine.Registry.getMinit(rec.id);
                    const colorHex = numToHexColor(liveDef?.color || 0x00e5ff);
                    const hp = liveDef?.stats?.hp ?? 1000;
                    const spd = liveDef?.stats?.speed ?? 0.12;
                    const hasPng = Boolean(rec.assets?.base);

                    return `
                      <div class="mw-minit-item">
                        <div class="mw-minit-left">
                          <div class="mw-minit-icon" style="border-color:${colorHex}">
                            ${
                              hasPng
                                ? `<img src="${rec.assets.base}" alt="${rec.name}" />`
                                : `<span style="color:${colorHex};font-size:8px;font-weight:bold;">${rec.name.slice(0, 2)}</span>`
                            }
                          </div>
                          <div>
                            <div class="mw-minit-name" style="color:${colorHex}">${rec.name}</div>
                            <div class="mw-minit-meta">${hp} HP · SPD ${spd} · ${hasPng ? 'PNG' : 'Auto Icon'}</div>
                          </div>
                        </div>
                        <div style="display:flex;gap:6px;">
                          <button class="mw-btn secondary" style="padding:4px 7px;font-size:7px;" data-export-id="${rec.id}">.JS</button>
                          <button class="mw-btn danger" data-delete-id="${rec.id}" data-delete-name="${rec.name}">Del</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
        }
      </div>
    `;
  }

  _renderBalanceTab() {
    const rep = this.lastBalanceReport;

    return `
      <div class="mw-box">
        <div class="mw-row-between">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:11px;color:#cbd5e1;">
              Rounds:
              <select class="mw-select" id="mw-rounds-select" ${this.isRunningBalance ? 'disabled' : ''}>
                <option value="10" ${this.roundsPerPair === 10 ? 'selected' : ''}>10</option>
                <option value="20" ${this.roundsPerPair === 20 ? 'selected' : ''}>20</option>
                <option value="40" ${this.roundsPerPair === 40 ? 'selected' : ''}>40</option>
              </select>
            </label>
            <label style="font-size:11px;color:#cbd5e1;">
              Max Time:
              <select class="mw-select" id="mw-timeout-select" ${this.isRunningBalance ? 'disabled' : ''}>
                <option value="1800" ${this.maxTicks === 1800 ? 'selected' : ''}>30s</option>
                <option value="3000" ${this.maxTicks === 3000 ? 'selected' : ''}>50s</option>
                <option value="4500" ${this.maxTicks === 4500 ? 'selected' : ''}>75s</option>
              </select>
            </label>
          </div>
          <button class="mw-btn" id="mw-run-balance-btn" ${this.isRunningBalance ? 'disabled' : ''}>
            ${this.isRunningBalance ? 'RUNNING...' : 'RUN CHECK'}
          </button>
        </div>

        ${
          this.isRunningBalance
            ? `<div style="margin-top:6px;">
                <div id="mw-balance-progress-label" style="font-size:11px;color:#00e5ff;">Simulating...</div>
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
          : `<div class="mw-box" style="text-align:center;padding:18px;">
              <p class="mw-hint" style="margin:0;">Click <b>RUN CHECK</b> to simulate all 1v1 matchups (${this.roundsPerPair} rounds/pair).</p>
            </div>`
      }
    `;
  }

  _renderBalanceReportContent(rep) {
    return `
      <div class="mw-box">
        <div class="mw-row-between" style="margin-bottom:6px;">
          <span class="mw-label">LEADERBOARD (${rep.totalBattles} DUELS · ${rep.elapsedMs}MS)</span>
        </div>
        <div class="mw-table-wrap">
          <table class="mw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Minit</th>
                <th>Win %</th>
                <th>W-L-D</th>
                <th>TTK</th>
                <th>DPS</th>
                <th>State</th>
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
                      <td style="color:${colorHex};font-weight:bold;">${row.name}</td>
                      <td><strong>${row.winRate.toFixed(0)}%</strong></td>
                      <td>${row.wins}-${row.losses}-${row.draws}</td>
                      <td>${row.avgTtkSec.toFixed(1)}s</td>
                      <td>${row.dps.toFixed(0)}/s</td>
                      <td style="color:${statusColor};font-weight:bold;">${row.balanceStatus}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mw-box">
        <div class="mw-row-between" style="margin-bottom:6px;">
          <span class="mw-label">MATCHUP MATRIX (ROW WIN %)</span>
        </div>
        <div class="mw-table-wrap">
          <table class="mw-table">
            <thead>
              <tr>
                <th>vs</th>
                ${rep.minits
                  .map(
                    (m) =>
                      `<th class="mw-matrix-cell" style="color:${numToHexColor(m.color)}">${m.name.slice(0, 5)}</th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${rep.minits
                .map((rowM) => {
                  return `
                    <tr>
                      <td style="color:${numToHexColor(rowM.color)};font-weight:bold;">${rowM.name.slice(0, 7)}</td>
                      ${rep.minits
                        .map((colM) => {
                          if (rowM.id === colM.id) {
                            return `<td class="mw-matrix-cell" style="color:#475569;">—</td>`;
                          }
                          const cell = rep.matrix[rowM.id]?.[colM.id];
                          if (!cell) return `<td class="mw-matrix-cell">-</td>`;
                          const wr = Math.round(cell.winRate);
                          const fg = wr >= 65 ? '#00ff66' : wr <= 35 ? '#ff4466' : '#cbd5e1';
                          return `<td class="mw-matrix-cell" style="color:${fg};" title="${rowM.name} vs ${colM.name}: ${wr}% (${cell.avgTtkSec.toFixed(1)}s)">${wr}%</td>`;
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
      <div class="mw-box">
        <div class="mw-toggle-row">
          <strong style="color:#00e5ff;">Enable Debug Mode</strong>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-enabled" ${dbg.enabled ? 'checked' : ''} />
        </div>
        <div class="mw-toggle-row">
          <span>Show Hitboxes & Zones</span>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-hitboxes" ${dbg.showHitboxes ? 'checked' : ''} />
        </div>
        <div class="mw-toggle-row">
          <span>Show Velocity & Aim Vectors</span>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-vectors" ${dbg.showVectors ? 'checked' : ''} />
        </div>
        <div class="mw-toggle-row">
          <span>Show Fighter Cooldowns & HP</span>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-cooldowns" ${dbg.showCooldowns ? 'checked' : ''} />
        </div>
        <div class="mw-toggle-row">
          <span>Show Telemetry & Combat Log</span>
          <input type="checkbox" class="mw-checkbox" id="mw-dbg-telemetry" ${dbg.showTelemetry ? 'checked' : ''} />
        </div>
        <div class="mw-toggle-row">
          <span>Simulation Speed</span>
          <select class="mw-select" id="mw-dbg-timescale">
            <option value="0.25" ${dbg.timeScale === 0.25 ? 'selected' : ''}>0.25x</option>
            <option value="0.5" ${dbg.timeScale === 0.5 ? 'selected' : ''}>0.5x</option>
            <option value="1" ${dbg.timeScale === 1 ? 'selected' : ''}>1.0x</option>
            <option value="2" ${dbg.timeScale === 2 ? 'selected' : ''}>2.0x</option>
            <option value="4" ${dbg.timeScale === 4 ? 'selected' : ''}>4.0x</option>
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

    this.windowEl.querySelectorAll('.mw-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        AudioSys.play('click');
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

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
