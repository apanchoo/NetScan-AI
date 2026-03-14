<template>
  <div class="table-wrapper">
    <table class="trames">
      <thead>
        <tr>
          <th>MAC S</th>
          <th>MAC D</th>
          <th>VLAN</th>
          <th>Protocol</th>
          <th>Src IP</th>
          <th>Dst IP</th>
          <th>Transport</th>
          <th>Src Port</th>
          <th>Dst Port</th>
          <th>Application</th>
          <th>Size</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody ref="tbodyEl">
        <tr v-for="(packet, index) in safePackets" :key="index">
          <td>{{ packet?.flow?.source_mac ?? '-' }}</td>
          <td>{{ packet?.flow?.destination_mac ?? '-' }}</td>
          <td>{{ packet?.flow?.vlan?.id ?? '-' }}</td>
          <td>{{ packet?.flow?.ethertype ?? '-' }}</td>
          <td>{{ packet?.flow?.source ?? '-' }}</td>
          <td>{{ packet?.flow?.destination ?? '-' }}</td>
          <td>{{ packet?.flow?.protocol ?? '-' }}</td>
          <td>{{ packet?.flow?.source_port ?? '-' }}</td>
          <td>{{ packet?.flow?.destination_port ?? '-' }}</td>
          <td>{{ packet?.flow?.application_protocol ?? '-' }}</td>
          <td>{{ packet?.len ?? '-' }}</td>
          <td>{{ formatTimestamp(packet?.ts_sec, packet?.ts_usec) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCaptureStore } from '../../store/capture'
import type { PacketMinimal } from '../../types/capture'

export default defineComponent({
  data() {
    return {
      packets: [] as PacketMinimal[],
      offPacket: null as null | (() => void),
      resetHandler: null as null | (() => void),
      autoScroll: true,
      _buffer: [] as PacketMinimal[],  // non-reactive buffer
      _raf: 0,
    }
  },
  computed: {
    captureStore() {
      return useCaptureStore()
    },
    safePackets(): PacketMinimal[] {
      return this.packets
    },
  },
  mounted() {
    // Subscribe to packets — accumulate in non-reactive buffer
    const onPacket = (packet: PacketMinimal | undefined | null) => {
      if (!packet || typeof packet !== 'object') return
      this._buffer.push(packet)
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          if (this._buffer.length === 0) { this._raf = 0; return }
          for (const p of this._buffer) this.packets.push(p)
          this._buffer = []
          if (this.packets.length > 500) this.packets.splice(0, this.packets.length - 500)
          this._raf = 0
          this.$nextTick(() => this.scrollToBottom())
        })
      }
    }
    const maybeOff = this.captureStore.onPacket(onPacket)
    if (typeof maybeOff === 'function') this.offPacket = maybeOff

    // Pause auto-scroll when user scrolls up
    const tbody = this.$refs.tbodyEl as HTMLElement | undefined
    if (tbody) {
      tbody.addEventListener('scroll', () => {
        const atBottom = tbody.scrollHeight - tbody.scrollTop - tbody.clientHeight < 32
        this.autoScroll = atBottom
      })
    }

    const reset = () => { this.packets = []; this._buffer = [] }
    this.resetHandler = reset
    this.$bus?.on?.('reset', reset)
  },
  beforeUnmount() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0 }
    if (this.offPacket) {
      try { this.offPacket() } catch {}
    }
    if (this.resetHandler) {
      this.$bus?.off?.('reset', this.resetHandler)
    } else {
      this.$bus?.off?.('reset')
    }
  },
  methods: {
    scrollToBottom() {
      if (!this.autoScroll) return
      const tbody = this.$refs.tbodyEl as HTMLElement | undefined
      if (tbody) tbody.scrollTop = tbody.scrollHeight
    },
    formatTimestamp(sec?: number, usec?: number): string {
      if (typeof sec !== 'number' || typeof usec !== 'number') return '-'
      const date = new Date(sec * 1000 + Math.floor(usec / 1000))
      try {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
        })
      } catch {
        // older runtimes sans fractionalSecondDigits
        const ms = String(Math.floor((usec % 1_000_000) / 1000)).padStart(3, '0')
        const base = date.toLocaleTimeString('en-US', { hour12: false })
        return `${base}.${ms}`
      }
    },
  },
})
</script>

<style scoped>
.table-wrapper {
  height: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #2c2c3a;
  border-top: 1px solid #383850;
  overflow: hidden;
}

.trames {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  font-family: 'Courier New', Courier, monospace;
}

thead {
  display: table;
  width: 100%;
  table-layout: fixed;
  flex-shrink: 0;
}

tbody {
  display: block;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
  animation: row-in 0.18s cubic-bezier(0.25, 1, 0.5, 1);
}

td, th {
  padding: 6px 8px;
  text-align: center;
  color: #7090a8;
  background-color: #2c2c3a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11px;
}

th {
  color: #687888;
  font-weight: 500;
}

tbody::-webkit-scrollbar {
  width: 4px;
}
tbody::-webkit-scrollbar-track {
  background: #23232f;
}
tbody::-webkit-scrollbar-thumb {
  background: #3c3c50;
  border-radius: 2px;
}

@keyframes row-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
