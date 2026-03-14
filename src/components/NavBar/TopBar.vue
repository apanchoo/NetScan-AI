<template>
  <div class="top-bar">

    <!-- App controls: left side -->
    <div class="bar-left">

    <!-- Start -->
    <button class="image-btn logo-btn" @click="start" title="Start (ctrl+p)" :disabled="isRunning">
      <img src="/src-tauri/icons/StoreLogo.png" alt="NetScan-AI" class="logo-img" />
      <span v-if="isRecording" class="rec-dot" />
    </button>

    <!-- Stop -->
    <button class="image-btn" @click="stop" title="Stop (ctrl+shift+p)" :disabled="!isRunning">
      <svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg>
    </button>

    <!-- Reset -->
    <button class="image-btn" @click="reset" title="Reset (ctrl+shift+r)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3"/>
        <path d="M13.5 3v2.5H11"/>
      </svg>
    </button>

    <div class="sep"/>

    <!-- Config -->
    <button class="image-btn" title="Settings (ctrl+,)" :disabled="isRunning" @click="handleConfigClick">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <circle cx="8" cy="8" r="2"/>
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M11.9 4.1l-.7.7M4.8 11.2l-.7.7"/>
      </svg>
    </button>

    <!-- Save dropdown (CSV / PNG) -->
    <div class="export-wrap">
      <button class="image-btn" @click="showSaveMenu = !showSaveMenu" title="Save (ctrl+s)">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.5 13.5h11V5l-3-3H2.5v11.5z"/>
          <rect x="5" y="9" width="6" height="4.5" rx="0.5"/>
          <rect x="5.5" y="2.5" width="4" height="3" rx="0.5"/>
        </svg>
      </button>
      <Transition name="menu-fade">
        <div v-if="showSaveMenu" class="export-menu">
          <button @click="triggerSave">Export CSV</button>
          <button @click="triggerSavePng">Export PNG</button>
          <button @click="triggerSaveSvg">Export SVG</button>
        </div>
      </Transition>
    </div>

    <!-- Open -->
    <button class="image-btn" @click="displayPcapOpener" title="Open (ctrl+o)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1.5 4.5h4l1.5 2H14v7H1.5V4.5z"/>
        <path d="M1.5 6.5v-3a1 1 0 0 1 1-1h3"/>
      </svg>
    </button>

    <!-- Logs -->
    <button class="image-btn" @click="export_logs" title="Logs (ctrl+l)" >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <rect x="3" y="1.5" width="10" height="13" rx="1"/>
        <line x1="5.5" y1="5" x2="10.5" y2="5"/>
        <line x1="5.5" y1="8" x2="10.5" y2="8"/>
        <line x1="5.5" y1="11" x2="8.5" y2="11"/>
      </svg>
    </button>

    <!-- Filter -->
    <button class="image-btn" @click="handleFilterClick" title="Filter (ctrl+f)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3.5h12M4.5 7.5h7M7 11.5h2"/>
      </svg>
    </button>

    <!-- AI Chat -->
    <button class="image-btn" :class="{ 'ai-btn-active': aiPanelOpen }" @click="handleAIClick" title="AI Assistant (ctrl+i)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="6" r="2.5"/>
        <path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/>
        <path d="M11.5 4c.8.5 1.5 1.5 1.5 3"/>
      </svg>
    </button>

    <!-- Export rules dropdown -->
    <div class="export-wrap">
      <button class="image-btn" @click="showExportMenu = !showExportMenu" title="Export rules">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2v8M5 7l3 3 3-3"/>
          <path d="M3 12h10"/>
          <path d="M11 9.5l2 2-2 2"/>
        </svg>
      </button>
      <Transition name="menu-fade">
        <div v-if="showExportMenu" class="export-menu">
          <button @click="exportRules('snort')">Snort</button>
          <button @click="exportRules('suricata')">Suricata</button>
          <button @click="exportRules('iptables')">iptables</button>
        </div>
      </Transition>
    </div>

    <div class="sep"/>

    <!-- Quit -->
    <button class="image-btn quit-btn" @click="quit" title="Quit (ctrl+q)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <circle cx="8" cy="8" r="5.5"/>
        <path d="M8 4.5v3.5"/>
        <path d="M8 4.5v0" stroke-width="2"/>
        <path d="M5.2 5.5A4 4 0 1 0 10.8 5.5"/>
      </svg>
    </button>

    </div><!-- end bar-left -->

    <!-- Title centered — drag region -->
    <div class="bar-title" @mousedown="onDragStart">NetScan-AI</div>

    <!-- Window controls: right side -->
    <div class="bar-right">
      <button class="wm-btn" @click="minimizeWindow" title="Minimize">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="3.5" y1="8" x2="12.5" y2="8"/>
        </svg>
      </button>
      <button class="wm-btn" @click="toggleMaximize" title="Maximize">
        <svg v-if="!isMaximized" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3.5" y="3.5" width="9" height="9" rx="1"/>
        </svg>
        <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="5" width="7" height="7" rx="1"/>
          <path d="M4 11V4h7"/>
        </svg>
      </button>
      <button class="wm-btn wm-close" @click="closeWindow" title="Close">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="4" y1="4" x2="12" y2="12"/>
          <line x1="12" y1="4" x2="4" y2="12"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script lang="ts">
import { Channel, invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit } from '@tauri-apps/plugin-process';
import { info, error } from '@tauri-apps/plugin-log';
import { save } from '@tauri-apps/plugin-dialog';
import { downloadDir } from '@tauri-apps/api/path';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
// when using `"withGlobalTauri": true`, you may use
// const { register } = window.__TAURI__.globalShortcut;



import { displayCaptureError } from '../../errors/capture';
import { getCurrentDate } from '../../utils/time';
import { useCaptureStore } from '../../store/capture';
import { CaptureEvent } from '../../types/capture';

// Stored outside Vue to prevent the reactive Proxy from breaking Tauri methods
let appWindow: ReturnType<typeof getCurrentWebviewWindow> | null = null;

export default {
  name: "TopBar",
  emits: ['toggle-config','toggle-pcap','toggle-filter','toggle-ai'],
  props: {
    aiPanelOpen: { type: Boolean, default: false },
  },

  computed: {
    buttonText(): string {
      return this.captureStore.showMatrice ? 'Graphique' : 'Matrice';
    },
    captureStore() {
      return useCaptureStore();
    },

    isRunning(): boolean {
      return this.captureStore.isRunning;
    },
  },
  data() {
    return {
      showMatrice: true,
      shortcuts: [] as string[],
      isMaximized: false,
      isRecording: false,
      showSaveMenu: false,
      showExportMenu: false,
      _closeMenu: null as null | (() => void),
    };
  },
  async mounted() {
    appWindow = getCurrentWebviewWindow();
    const closeMenu = () => { this.showExportMenu = false; this.showSaveMenu = false; };
    document.addEventListener('click', closeMenu, true);
    this._closeMenu = closeMenu;
    this.isMaximized = await appWindow.isMaximized();
    await appWindow.onResized(async () => {
      this.isMaximized = await appWindow!.isMaximized();
    });

    // Sauvegardes
    this.bindShortcut('CommandOrControl+S', () => this.SaveAsCsv());
    this.bindShortcut('CommandOrControl+Shift+S', () => this.SaveAsXlsx());

    // Reset
    this.bindShortcut('CommandOrControl+Shift+R', () => this.reset());

    // Start / Stop
    // Choix 1 (classique "Play/Stop")
    this.bindShortcut('CommandOrControl+P', () => this.start());
    this.bindShortcut('CommandOrControl+Shift+P', () => this.stop());

    // Ouvrir (pcap opener)
    this.bindShortcut('CommandOrControl+O', () => this.displayPcapOpener());

    // Config
    this.bindShortcut('CommandOrControl+,', () => this.handleConfigClick());

    // Filtre
    this.bindShortcut('CommandOrControl+F', () => this.handleFilterClick());

    // IA
    this.bindShortcut('CommandOrControl+I', () => this.handleAIClick());

    // Logs
    this.bindShortcut('CommandOrControl+L', () => this.export_logs());

    // Quit
    this.bindShortcut('CommandOrControl+Q', () => this.quit());
  },

  async beforeUnmount() {
    await this.unbindAllShortcuts();
    if (this._closeMenu) document.removeEventListener('click', this._closeMenu, true);
  },
  methods: {
    bindShortcut(shortcut: string, handler: () => void) {
      this.shortcuts.push(shortcut);
      register(shortcut, (event) => {
        if (event.state === 'Released') handler();
      });
    },

    async unbindAllShortcuts() {
      // unregister accepte string | string[]
      if (this.shortcuts.length > 0) {
        await unregister(this.shortcuts);
      }
      this.shortcuts = [];
    },
    async export_logs() {
      info("export logs")
      const response = await save({
        filters: [{
          name: '.log',
          extensions: ['log']
        }],
        title: 'Save logs',
        defaultPath: 'netscan-ai.log'
      });

      if (response) {
        const saveResponse = await invoke('export_logs', { destination: response });
        info("Save completed:", saveResponse);
        return saveResponse;
      } else {
        info("No file path selected");
        throw new Error("Save cancelled or path not selected");
      }
    },

    async SaveAsCsv() {
      info("Save as csv")
      save({
        filters: [{
          name: '.csv',
          extensions: ['csv']
        }],
        title: 'Save the flow matrix',
        defaultPath: getCurrentDate()+ '_DR_Matrice.csv'
      
      }).then((response) => 
        invoke('export_csv', { path: response })
          .then((response: any) => 
            info("response: ", response))
          .catch((error: any) => 
            error("error: ", error))
      )
    },
    async SaveAsXlsx() {
      try {
        info("Starting xlsx save");
        const response = await save({
          filters: [{
            name: '.xlsx',
            extensions: ['xlsx']
          }],
          title: 'Save the flow matrix',
          defaultPath: getCurrentDate() + '_DR_Matrice' + '.xlsx'
        });

        if (response) {
          const saveResponse = await invoke('save_packets_to_excel', { file_path: response });
          info("Save completed:", saveResponse);
          return saveResponse;
        } else {
          info("No file path selected");
          throw new Error("Save cancelled or path not selected");
        }
      } catch (error) {
        error("Error saving to xlsx:", error);
        throw error;
      }
    },
    async triggerSave() {
      this.showSaveMenu = false;
      this.SaveAsCsv();
    },
    triggerSavePng() {
      this.showSaveMenu = false;
      document.dispatchEvent(new CustomEvent('export-png'));
    },
    triggerSaveSvg() {
      this.showSaveMenu = false;
      document.dispatchEvent(new CustomEvent('export-svg'));
    },
    async reset() {
      info("reset")
      await invoke('reset_capture');
      this.$bus.emit('reset');
    },


    handleConfigClick() {
      info("[TopBar] Bouton config cliqué");
      this.$emit('toggle-config');
    },
    displayPcapOpener() {
      info("[TopBar] Bouton open cliqué");
      this.$emit('toggle-pcap');
    },
    handleFilterClick() {
      info("[TopBar] Bouton filter cliqué");
      this.$emit('toggle-filter');
    },
    handleAIClick() {
      info("[TopBar] Bouton IA cliqué");
      this.$emit('toggle-ai');
    },

    async startPcapRecord() {
      this.showSaveMenu = false;
      const path = await save({
        filters: [{ name: 'PCAP', extensions: ['pcap'] }],
        title: 'Save as PCAP',
        defaultPath: getCurrentDate() + '_capture.pcap',
      });
      if (!path) return;
      await invoke('start_pcap_record', { path }).catch((e: any) => error('start_pcap_record:', e));
      this.isRecording = true;
    },

    async stopPcapRecord() {
      this.showSaveMenu = false;
      const path = await invoke<string>('stop_pcap_record').catch((e: any) => { error('stop_pcap_record:', e); return null });
      this.isRecording = false;
      if (path) info('PCAP saved: ' + path);
    },

    async exportRules(type: 'snort' | 'suricata' | 'iptables') {
      this.showExportMenu = false;
      const ext = type === 'iptables' ? 'sh' : 'rules';
      const path = await save({
        filters: [{ name: type, extensions: [ext] }],
        title: `Export ${type} rules`,
        defaultPath: `${getCurrentDate()}_${type}.${ext}`,
      });
      if (!path) return;
      const cmd = type === 'snort' ? 'export_snort_rules'
                : type === 'suricata' ? 'export_suricata_rules'
                : 'export_iptables';
      await invoke(cmd, { path }).catch((e: any) => error(`${cmd}:`, e));
      info(`${type} rules exported: ${path}`);
    },
    async start() {
      if (this.captureStore.isRunning) return;

      const dir = await downloadDir().catch(() => '.');
      const pcapPath = `${dir}/${getCurrentDate()}_capture.pcap`;
      await invoke('start_pcap_record', { path: pcapPath })
        .then(() => { this.isRecording = true; info('PCAP recording: ' + pcapPath); })
        .catch((e: any) => error('start_pcap_record:', e));

      const onEvent = new Channel<CaptureEvent>();
      this.captureStore.setChannel(onEvent);
      await invoke('start_capture', { onEvent })
        .then((status) => {
          const typedStatus = status as { is_running: boolean };
          this.captureStore.updateStatus(typedStatus);
          info('Capture started: ' + this.captureStore.isRunning);
        })
        .catch(displayCaptureError);
    },
    async stop() {
      if (!this.captureStore.isRunning) return;

      const onEvent = this.captureStore.getChannel();
      await invoke('stop_capture', { onEvent })
        .then((status) => {
          const typedStatus = status as { is_running: boolean };
          this.captureStore.updateStatus(typedStatus);
          info('Capture stopped: ' + this.captureStore.isRunning);
        })
        .catch(displayCaptureError);

      if (this.isRecording) {
        await invoke<string>('stop_pcap_record')
          .then((path) => { this.isRecording = false; info('PCAP saved: ' + path); })
          .catch((e: any) => error('stop_pcap_record:', e));
      }
    },
    toggleView() {
      info('View toggled');
    },
    async quit() {
      info('Close requested');
      await exit(0);
    },
    toggleConfig() {
      info('Opening config panel');
    },

    async minimizeWindow() {
      await appWindow?.minimize();
    },
    async toggleMaximize() {
      await appWindow?.toggleMaximize();
    },
    async closeWindow() {
      await appWindow?.close();
    },
    async onDragStart(e: MouseEvent) {
      if (e.button === 0) {
        await appWindow?.startDragging();
      }
    },
  }
}
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 40px;
  width: 100%;
  background-color: #2c2c3a;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #3c3c50;
  z-index: 9999;
  user-select: none;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  flex-shrink: 0;
}

.bar-title {
  flex: 1;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: #585872;
  text-transform: uppercase;
  cursor: default;
}

.bar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
}

/* Window management buttons */
.wm-btn {
  width: 46px;
  height: 100%;
  background: transparent;
  border: none;
  color: #585872;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.wm-btn svg {
  transition: transform 0.1s ease;
}
.wm-btn:active svg {
  transform: scale(0.82);
}

.wm-btn svg {
  width: 14px;
  height: 14px;
}

.wm-btn:hover {
  background-color: #383850;
  color: #9090a0;
}

.wm-close:hover {
  background-color: #5a2828;
  color: #e0a0a0;
}

.image-btn {
  background: transparent;
  border: none;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  color: #6a6a80;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
}

.image-btn svg {
  width: 16px;
  height: 16px;
  display: block;
  transition: transform 0.1s ease;
}

.image-btn:hover {
  background-color: #383850;
  color: #9090a0;
}

.image-btn:active {
  color: #d4d4d8;
  background-color: #3c3c50;
  transform: scale(0.88);
}

.image-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background-color: transparent;
  color: #6a6a80;
}

.quit-btn:hover {
  color: #8a4a4a;
}

.logo-btn {
  padding: 3px;
  margin-right: 4px;
  position: relative;
}

.logo-img {
  width: 22px;
  height: 22px;
  display: block;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.logo-btn:hover .logo-img {
  opacity: 1;
}

.logo-btn:disabled .logo-img {
  opacity: 0.25;
}

.sep {
  width: 1px;
  height: 18px;
  background: #3c3c50;
  margin: 0 2px;
  flex-shrink: 0;
}

.ai-btn-active {
  color: #8080d0;
  background-color: #2e2e4a;
}
.ai-btn-active:hover {
  color: #a0a0e8;
  background-color: #35355a;
}

.rec-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e05555;
  animation: rec-pulse 1.2s ease-in-out infinite;
}

@keyframes rec-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Export rules dropdown */
.export-wrap {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: #2c2c3a;
  border: 1px solid #3c3c50;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 120px;
  z-index: 10000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: #a0a0b8;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.export-menu button:hover {
  background: #383850;
  color: #d4d4d8;
}

.export-menu button.record-item {
  color: #e05555;
}
.export-menu button.record-item:hover {
  background: #3a2020;
  color: #f07070;
}

.menu-fade-enter-active, .menu-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s cubic-bezier(0.22, 1, 0.36, 1);
}
.menu-fade-enter-from, .menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>