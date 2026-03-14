<template>
  <div class="page-container">

    <!-- Fixed top bar, always full width -->
    <TopBar
      @toggle-config="toggleConfig"
      @toggle-pcap="togglePcap"
      @toggle-filter="toggleFilter"
      @toggle-graph="toggleGraph"
      @toggle-ai="toggleAI"
      :aiPanelOpen="showAI"
    />

    <!-- Body row: sidebar + main content side by side -->
    <div class="body-row">

      <!-- AI sidebar — in normal flow, pushes content -->
      <AIChatPanel :visible="showAI" @close="showAI = false" />

      <!-- Main area -->
      <div class="body-main">
        <!-- Overlay panels (filter, config, import) -->
        <div class="panels">
          <ConfigPanel v-if="showConfig" @update:ConfigPanel-visible="(val: any) => showConfig = val" />
          <ImportPanel v-if="showPcap" @update:visible="(val: any) => showPcap = val"/>
          <Filter :visible="showFilter" @update:visible="(val: any) => showFilter = val"/>
        </div>

        <div class="graph-wrapper">
          <NetworkGraphComponent v-if="showGraph" />
        </div>

        <!-- Packet table: in normal flow, always visible above status bar -->
        <BottomLong />
      </div>

    </div>

    <!-- Only the thin 22px bar stays fixed -->
    <StatusBar />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useCaptureStore } from '../store/capture';

import NetworkGraphComponent from '../components/AnalyseView/NetworkGraphComponent.vue';
import TopBar from '../components/NavBar/TopBar.vue';
import StatusBar from '../components/NavBar/status-bar/StatusBar.vue';
import ConfigPanel from '../components/AnalyseView/panels/ConfigPanel.vue';
import BottomLong from '../components/AnalyseView/BottomLong.vue';
import ImportPanel from '../components/AnalyseView/panels/ImportPalnel.vue';
import Filter from '../components/AnalyseView/panels/Filter.vue';
import AIChatPanel from '../components/AIChatPanel.vue';

export default defineComponent({
  name: 'MainView',
  components: {
    TopBar,
    ImportPanel,
    ConfigPanel,
    NetworkGraphComponent,
    BottomLong,
    StatusBar,
    Filter,
    AIChatPanel,
  },
  data() {
    return {
      showConfig: false,
      showPcap: false,
      showFilter: false,
      showGraph: true,
      showAI: true,
    };
  },
  computed: {
    captureStore() {
      return useCaptureStore();
    }
  },
  methods: {
    toggleConfig() {
      this.showConfig = !this.showConfig;
    },
    togglePcap() {
      this.showPcap = !this.showPcap;
    },
    toggleFilter() {
      this.showFilter = !this.showFilter;
    },
    toggleGraph() {
      this.showGraph = !this.showGraph;
    },
    toggleAI() {
      this.showAI = !this.showAI;
    },
  }
});
</script>


<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-top: 40px;    /* reserve space for fixed TopBar */
  padding-bottom: 23px; /* reserve space for fixed StatusBar */
  box-sizing: border-box;
  overflow: hidden;
}

.body-row {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* Everything beside the AI panel */
.body-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Fills all remaining space between panels toolbar and BottomLong */
.graph-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Force NetworkGraphComponent's root div to fill the wrapper */
.graph-wrapper > * {
  flex: 1;
  min-height: 0;
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 10;
}
</style>
