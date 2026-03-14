<script setup>
import { ref } from 'vue';
import Capture from '../components/homeVue/Capture.vue';
import FromPcap from '../components/homeVue/FromPcap.vue';

const showCapture = ref(true); // state to know which component is on top

// Function to toggle between Capture and FromPcap
const toggleView = () => {
  showCapture.value = !showCapture.value;
};
</script>

<template>
  <div class="container">
    <div class="tab" @click="toggleView">
      <button>{{ showCapture ? "Open a PCAP" : "Show Capture" }}</button>
    </div>

    <transition name="fade">
      <Capture v-if="showCapture" class="overlay" />
      <FromPcap v-else class="overlay" />
    </transition>

    <div class="footer">
      <span>Version 2.0.0 - Beta:</span>
    </div>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  margin: 40px;

}

.tab {
  position: absolute;
  top: 0;
  right: 10px;
  padding: 5px 10px;
  background-color: #3c3c50;
  color: #9090a0;
  cursor: pointer;
  border-radius: 0 0 5px 5px;
  border: 1px solid #484858;
  border-top: none;
}

.overlay {
  position: relative;
  z-index: 1;
}


.footer {
  padding: 10px;
  text-align: left;
  color: #656578;
  font-size: 0.8em;
}
</style>
