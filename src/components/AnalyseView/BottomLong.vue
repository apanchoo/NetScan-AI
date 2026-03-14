<template>
  <div class="table-wrapper">
    <table class="trames">
      <thead>
        <tr>
          <th>MAC S</th>
          <th>MAC D</th>
          <th>Vlan</th>
          <th>Protocol</th>
          <th>IP S</th>
          <th>IP D</th>
          <th>Transport</th>
          <th>Port S</th>
          <th>Port D</th>
          <th>Application</th>
          <th>Taille</th>
          <th>Heure</th>
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
      MAX_ROWS: 500,
      autoScroll: true,
    }
  },
  watch: {
    safePackets() {
      this.$nextTick(() => this.scrollToBottom())
    },
  },
  computed: {
    captureStore() {
      return useCaptureStore()
    },
    // Ne conserve que des objets valides et limite l'affichage
    safePackets(): PacketMinimal[] {
      const arr = this.packets.filter((p) => !!p && typeof p === 'object')
      return arr.slice(Math.max(0, arr.length - this.MAX_ROWS))
    },
  },
  mounted() {
    // Abonnement aux paquets
    const onPacket = (packet: PacketMinimal | undefined | null) => {
      if (!packet || typeof packet !== 'object') return
      this.packets.push(packet)
      // garde une taille raisonnable même en interne
      if (this.packets.length > 200) this.packets.shift()
    }
    const maybeOff = this.captureStore.onPacket(onPacket)
    if (typeof maybeOff === ‘function’) this.offPacket = maybeOff

    // Pause auto-scroll si l’utilisateur remonte
    const tbody = this.$refs.tbodyEl as HTMLElement | undefined
    if (tbody) {
      tbody.addEventListener(‘scroll’, () => {
        const atBottom = tbody.scrollHeight - tbody.scrollTop - tbody.clientHeight < 32
        this.autoScroll = atBottom
      })
    }

    // Handler reset conservé pour off() symétrique si nécessaire
    const reset = () => { this.packets = [] }
    this.resetHandler = reset
    this.$bus?.on?.('reset', reset)
  },
  beforeUnmount() {
    if (this.offPacket) {
      try { this.offPacket() } catch {}
    }
    if (this.resetHandler) {
      this.$bus?.off?.('reset', this.resetHandler)
    } else {
      // fallback si ton bus accepte off(event) sans callback
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
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
        })
      } catch {
        // older runtimes sans fractionalSecondDigits
        const ms = String(Math.floor((usec % 1_000_000) / 1000)).padStart(3, '0')
        const base = date.toLocaleTimeString('fr-FR', { hour12: false })
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
