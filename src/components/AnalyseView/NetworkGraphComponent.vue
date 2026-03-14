<script lang="ts">
import { defineComponent, shallowReactive, markRaw, reactive } from "vue"
import { VNetworkGraph, VEdgeLabel } from "v-network-graph"
import * as vNG from "v-network-graph"
import { ForceLayout } from "v-network-graph/lib/force-layout"
import { useCaptureStore } from "../../store/capture"
import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs"
import { EdgeData, EdgeId, GraphData, GraphUpdate, NodeData, NodeId } from "../../types/capture"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentDate } from '../../utils/time';
import LegendComponent from './LegendComponent.vue';

// --- Device Fingerprinting -------------------------------------------------
const OUI_MAP: Record<string, string> = {
  // Apple
  "28:CF:DA": "apple", "A4:5E:60": "apple", "B8:53:AC": "apple", "AC:87:A3": "apple",
  "8C:85:90": "apple", "F0:D1:A9": "apple", "00:17:F2": "apple", "00:1B:63": "apple",
  "00:1C:B3": "apple", "00:23:12": "apple", "64:B0:A6": "apple", "D8:BB:2C": "apple",
  "38:F9:D3": "apple", "18:65:90": "apple", "4C:57:CA": "apple", "A4:D9:31": "apple",
  "C4:B3:01": "apple", "34:36:3B": "apple", "98:00:C6": "apple", "20:C9:D0": "apple",
  "A8:20:66": "apple", "3C:07:54": "apple", "00:0A:95": "apple", "00:03:93": "apple",
  // Cisco (routers/switches)
  "00:00:0C": "router", "00:01:42": "router", "00:01:64": "router", "00:0B:45": "router",
  "00:17:0E": "router", "C4:7D:4F": "router", "F8:B7:E2": "router", "00:13:C3": "router",
  // Ubiquiti
  "04:18:D6": "router", "18:E8:29": "router", "24:A4:3C": "router", "44:D9:E7": "router",
  "68:72:51": "router", "74:83:C2": "router", "DC:9F:DB": "router", "F0:9F:C2": "router",
  // TP-Link
  "14:CC:20": "router", "50:C7:BF": "router", "A0:F3:C1": "router", "EC:08:6B": "router",
  "B0:95:8E": "router", "98:DE:D0": "router",
  // Huawei routers
  "00:18:82": "router", "0C:37:96": "router", "10:47:80": "router", "3C:5A:37": "router",
  // Raspberry Pi
  "B8:27:EB": "linux", "DC:A6:32": "linux", "E4:5F:01": "linux",
  // Samsung phones/tablets
  "00:12:47": "phone", "00:15:B9": "phone", "08:FC:88": "phone", "10:30:47": "phone",
  "18:3F:47": "phone", "24:4B:03": "phone", "40:0E:85": "phone", "60:AF:6D": "phone",
  "70:F9:27": "phone", "8C:77:12": "phone", "94:35:0A": "phone",
  // Huawei phones
  "04:21:9A": "phone", "14:B9:68": "phone", "18:C5:8A": "phone", "28:6E:D4": "phone",
  // Xiaomi / OnePlus / Google phones
  "00:9E:C8": "phone", "10:2A:B3": "phone", "28:6C:07": "phone", "64:09:80": "phone",
  "04:D6:AA": "phone", "3C:5A:B4": "phone", "54:60:09": "phone", "94:EB:2C": "phone",
  // Dell PCs
  "00:14:22": "computer", "00:1A:4B": "computer", "00:21:70": "computer",
  "18:03:73": "computer", "B8:CA:3A": "computer", "F8:DB:88": "computer",
  // HP PCs
  "00:01:E6": "computer", "00:08:02": "computer", "3C:D9:2B": "computer",
  "78:AC:C0": "computer", "94:57:A5": "computer", "E8:39:35": "computer",
  // HP Printers
  "00:0A:57": "printer", "00:0E:7F": "printer", "00:17:A4": "printer",
  "00:18:71": "printer", "1C:C1:DE": "printer",
  // Canon / Epson / Brother printers
  "00:00:85": "printer", "00:1E:8F": "printer",
  "00:00:48": "printer", "AC:18:26": "printer",
  "00:80:77": "printer", "00:1B:A9": "printer",
  // VMware / VirtualBox
  "00:0C:29": "vm", "00:50:56": "vm", "00:05:69": "vm", "08:00:27": "vm",
  // Microsoft
  "00:03:FF": "windows", "00:0D:3A": "windows", "00:12:5A": "windows",
  "00:17:FA": "windows", "28:18:78": "windows", "48:50:73": "windows",
  "7C:1E:52": "windows",
  // Intel / Lenovo / generic PC
  "00:0C:F1": "computer", "00:0E:35": "computer", "00:1B:21": "computer",
  "8C:EC:4B": "computer", "00:1E:67": "computer", "54:EE:75": "computer",
  "84:7B:EB": "computer",
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  router:   "Routeur / Switch",
  server:   "Serveur",
  computer: "Ordinateur / PC",
  phone:    "Mobile / Tablette",
  apple:    "Appareil Apple",
  windows:  "PC Windows",
  linux:    "Linux / Raspberry Pi",
  printer:  "Imprimante",
  vm:       "Machine virtuelle",
  internet: "Internet",
  unknown:  "Inconnu",
}

function isPrivateIp(ip: string): boolean {
  return /^10\./.test(ip)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    || /^192\.168\./.test(ip)
    || /^127\./.test(ip)
    || /^169\.254\./.test(ip)
    || /^::1$/.test(ip)
    || /^fc/.test(ip)
    || /^fd/.test(ip)
}

function detectDeviceType(node: { mac?: string; ip?: string; name?: string }): string {
  const mac = (node.mac || "").toUpperCase()
  if (mac.length >= 8) {
    const oui = mac.slice(0, 8)
    if (OUI_MAP[oui]) return OUI_MAP[oui]
  }
  const ip = node.ip || node.name || ""
  if (ip) {
    const last = ip.split(".").pop() || ""
    if (last === "1" || last === "254") return "router"
    if (!isPrivateIp(ip) && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return "internet"
  }
  return "server"
}

// --- Colors ----------------------------------------------------------------
const EDGE_COLORS_LC: Record<string, string> = Object.freeze({
  arp: "#a89040",
  ipv4: "#a07030",
  ipv6: "#8a5f8a",
  profinet_rt: "#3f7040",
  tls: "#3a5c9a",
  dns: "#8a3c3c",
  ntp: "#a07030",
})
const colorForLabel = (label: string) =>
  EDGE_COLORS_LC[label?.toLowerCase?.() ?? ""] || "#808095"

// --- Helpers ---------------------------------------------------------------
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x }
function hexToRgb(hex: string) {
  const h = hex.startsWith("#") ? hex.slice(1) : hex
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16)
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
function darken(hex: string, factor = 0.2) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex((r * (1 - factor)) | 0, (g * (1 - factor)) | 0, (b * (1 - factor)) | 0)
}
function brighten(hex: string, factor = 0.15) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    (clamp01(r / 255 + factor) * 255) | 0,
    (clamp01(g / 255 + factor) * 255) | 0,
    (clamp01(b / 255 + factor) * 255) | 0
  )
}
const EDGE_SEP = "__"
function edgeKey(e: EdgeData): EdgeId {
  return `${e.source}${EDGE_SEP}${e.target}${EDGE_SEP}${e.label}`
}
function clearReactiveMap<T extends Record<string, any>>(obj: T) {
  for (const k of Object.keys(obj)) delete obj[k]
}
function isFn(x: any, name: string): x is (...a: any[]) => void {
  return x && typeof x[name] === "function"
}

async function svgTextToPngBytes(svgText: string, opts?: { scale?: number; background?: "transparent" | "white" }) {
  const scale = opts?.scale ?? 1
  const background = opts?.background ?? "transparent"

  // 1) Base64-encode du SVG (safe)
  const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)))

  // 2) Crée l'image
  const img = new Image()
  img.decoding = "async"
  img.src = svgBase64

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (e) => reject(e)
  })

  // 3) Déterminer la taille via width/height OU viewBox
  let w = img.width
  let h = img.height

  if (!w || !h) {
    const m = svgText.match(/viewBox="([\d.\-eE]+)\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s+([\d.\-eE]+)"/i)
    if (m) {
      const vbW = parseFloat(m[3]), vbH = parseFloat(m[4])
      w = Math.max(1, Math.round(vbW))
      h = Math.max(1, Math.round(vbH))
    } else {
      // fallback
      w = 1920; h = 1080
    }
  }

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.floor(w * scale))
  canvas.height = Math.max(1, Math.floor(h * scale))
  const ctx = canvas.getContext("2d")!

  if (background === "white") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // 4) Dessin
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // 5) Canvas → PNG (Uint8Array)
  const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b!), "image/png"))
  const ab = await blob.arrayBuffer()
  return new Uint8Array(ab)
}

// --- Component -------------------------------------------------------------
export default defineComponent({
  name: "NetworkGraphComponent",
  components: { VNetworkGraph, VEdgeLabel, LegendComponent },

  data() {
    const forceLayout = markRaw(new ForceLayout({}))
    const simpleLayout = markRaw(new vNG.SimpleLayout())

    const configs = reactive(
      vNG.defineConfigs({
        view: { 
          maxZoomLevel: 5, 
          minZoomLevel: 0.1, 
          layoutHandler: forceLayout, 
          scalingObjects: false 
        },
        node: {
          selectable: true,
          normal: {
            radius: 20,
            color: (node: NodeData) => node.color,
            strokeWidth: 3,
            strokeColor: (node: NodeData) => node._stroke ?? darken(node.color, 0.25),
          },
          hover: {
            radius: 20,
            color: (node: NodeData) => node._hover ?? brighten(node.color, 0.18),
          },
          label: {
            text: (node: NodeData) => node.label || node.name,
            fontSize: 10,
            color: "#c0c0c8",
            direction: "north" as const,
            lineHeight: 2.0,
            margin: 4,
            background: {
               visible: true,
               color: "#1e1e28",
               padding: { vertical: 3, horizontal: 6 },
               borderRadius: 2,
            },
          }
        },
        
        edge: {
          type: "straight",
          gap: 10,
          selectable: true,
          normal: {
            width: 2,
            color: (edge: any) => edge._color ?? colorForLabel(edge.label),
          },
          marker: {
            source: { type: "none", width: 5, height: 5, margin: 0, offset: 0, units: "strokeWidth" as const, color: null },
            target: { type: "arrow" as const, width: 5, height: 5, margin: 0, offset: 0, units: "strokeWidth" as const, color: null },
          },
          label: {
            fontSize: 18,
            lineHeight: 1.1,
            color: "#9a9aa8",
            margin: 4,
              background: {
                visible: true,
                color: "#1e1e28",
                padding: {
                  vertical: 1,
                  horizontal: 4
                },
                borderRadius: 2 },
          },
        },
      })
    )

    return {
      graphData: {
        nodes: shallowReactive(Object.create(null) as Record<NodeId, NodeData>),
        edges: shallowReactive(Object.create(null) as Record<EdgeId, EdgeData>),
        layouts: reactive({}) as Record<string, unknown>,
      },

      forceEnabled: true,
      zoomLevel: 1,

      forceLayout,
      simpleLayout,
      configs,

      // Bandeau bas
      selectedNodeInfos: [] as string[],
      selectedNode: null as NodeData | null,
      selectedNodeId: null as string | null,
      editedLabel: "" as string,
      editedDeviceType: "" as string,
      isSavingLabel: false as boolean,
      deviceTypeLabels: DEVICE_TYPE_LABELS,

      // Queue
      _queue: [] as GraphUpdate[],
      _pendingEdges: [] as GraphUpdate[],
      _raf: 0 as number,

      // Handlers pour cleanup
      resetHandler: null as (() => void) | null,
      _exportPngHandler: null as (() => void) | null,
      _exportSvgHandler: null as (() => void) | null,
    }
  },

  computed: {
    captureStore() { return useCaptureStore() },
    graphNodes(): Record<NodeId, NodeData> { return this.graphData.nodes },
    graphEdges(): Record<EdgeId, EdgeData> { return this.graphData.edges },

    eventHandlers(): vNG.EventHandlers {
      return {
        "node:click": this.onNodeClick,
        "view:click": this.clearNodeInfos,
      }
    },
  },

  mounted() {
    clearReactiveMap(this.graphData.nodes)
    clearReactiveMap(this.graphData.edges)

    this._exportPngHandler = () => this.downloadPng()
    document.addEventListener('export-png', this._exportPngHandler)
    this._exportSvgHandler = () => this.downloadSvg()
    document.addEventListener('export-svg', this._exportSvgHandler)

    this.captureStore.onGraphUpdate((update: GraphUpdate) => {
      this._queue.push(update)
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this.flushQueue()
          this._raf = 0
        })
      }
    })

    this.captureStore.onGraphSnapshot((graphData) => {
      console.log("[NetworkGraphComponent] GraphSnapshot reçu -> reload");
      this.loadFromGraphData(graphData);
    });

    // Abonnement au reset via le bus global
    this.resetHandler = () => this.resetGraph()
    this.$bus?.on?.('reset', this.resetHandler)

    if (this.forceEnabled && isFn(this.forceLayout, "start")) this.forceLayout.start()
  },

  beforeUnmount() {
    if (this._exportPngHandler) document.removeEventListener('export-png', this._exportPngHandler)
    if (this._exportSvgHandler) document.removeEventListener('export-svg', this._exportSvgHandler)
  },

  methods: {
    async printLabels() {
      await invoke('get_label_list').then((labels: any) => {
        console.log(labels)
      })
    },
    // === Réinitialisation ==================================================
    resetGraph() {
      clearReactiveMap(this.graphData.nodes)
      clearReactiveMap(this.graphData.edges)
      this.clearNodeInfos()
    },
    /**
     * Recharge complètement le graphe à partir d'un snapshot complet
     * envoyé par le backend (GraphSnapshot).
     */
async loadFromGraphData(snapshot: GraphData | null | undefined) {
  console.log("[NetworkGraphComponent] GraphSnapshot reçu -> ", snapshot);

  try {
    // 1. Input validation
    if (!snapshot) {
      console.error("[NetworkGraphComponent] Aucune donnée reçue");
      return;
    }

    if (!snapshot.nodes || !snapshot.edges) {
      console.error("[NetworkGraphComponent] Données de graphe invalides:", {
        hasNodes: !!snapshot.nodes,
        hasEdges: !!snapshot.edges
      });
      return;
    }

    // 2. Reset
    clearReactiveMap(this.graphData.nodes);
    clearReactiveMap(this.graphData.edges);
    this.clearNodeInfos();

    // 3. Process nodes
    const nodeEntries = Object.entries(snapshot.nodes || {});
    console.log(`[NetworkGraphComponent] Chargement de ${nodeEntries.length} nœuds`);

    for (const [nodeId, node] of nodeEntries) {
      if (!node) continue;

      try {
        const color = node.color || "#4a6aa0";
        const id = node.id || nodeId;

        this.graphData.nodes[id] = {
          id,
          name: node.name || id,
          mac: node.mac || "",
          ip: node.ip || "",
          color,
          label: node.label || "",
          deviceType: detectDeviceType({ mac: node.mac, ip: node.ip, name: node.name || id }),
          _stroke: darken(color, 0.25),
          _hover: brighten(color, 0.18),
        };
      } catch (error) {
        console.error(`[NetworkGraphComponent] Erreur lors du chargement du nœud ${nodeId}:`, error);
      }
    }

    // 4. Process edges
    const edgeEntries = Object.entries(snapshot.edges || {});
    console.log(`[NetworkGraphComponent] Chargement de ${edgeEntries.length} arêtes`);

    for (const [edgeId, edge] of edgeEntries) {
      if (!edge) continue;

      try {
        const source = edge.source;
        const target = edge.target;
        const label = edge.label || "";

        if (!source || !target) {
          console.warn(`[NetworkGraphComponent] Arête ${edgeId} invalide: source ou target manquante`);
          continue;
        }

        if (!this.graphData.nodes[source] || !this.graphData.nodes[target]) {
          console.warn(`[NetworkGraphComponent] Arête orpheline ignorée: ${source} -> ${target} (${label})`);
          continue;
        }

        const _color = edge._color || colorForLabel(label);
        const key = edgeKey({
          source,
          target,
          label,
          source_port: edge.source_port,
          destination_port: edge.destination_port
        } as EdgeData);

        this.graphData.edges[key] = {
          source,
          target,
          label,
          source_port: edge.source_port ?? null,
          destination_port: edge.destination_port ?? null,
          bidir: edge.bidir || false,
          _color,
        };
      } catch (error) {
        console.error(`[NetworkGraphComponent] Erreur lors du chargement de l'arête ${edgeId}:`, error);
      }
    }

    // 5. Update layout if needed
    if (this.forceEnabled && this.forceLayout?.start) {
      try {
        this.forceLayout.start();
      } catch (error) {
        console.error("[NetworkGraphComponent] Erreur lors du démarrage du layout:", error);
      }
    }

  } catch (error) {
    console.error("[NetworkGraphComponent] Erreur critique dans loadFromGraphData:", error);
  }
}
,

    // === Gestion label =====================================================
    onNodeClick({ node }: { node: string }) {
      const n = this.graphData.nodes[node]
      if (!n) return
      this.selectedNodeId = node
      this.selectedNode = n
      this.editedLabel = n.label ?? ""
      this.editedDeviceType = n.deviceType ?? ""
      this.selectedNodeInfos = this._buildNodeInfos(node)
    },
    clearNodeInfos() {
      this.selectedNodeInfos = []
      this.selectedNode = null
      this.selectedNodeId = null
      this.editedLabel = ""
      this.editedDeviceType = ""
    },
    async editNodeLabel() {
      if (!this.selectedNode || !this.selectedNodeId) return
      const newLabel = String(this.editedLabel ?? "").trim()
      const newDeviceType = this.editedDeviceType || undefined

      // Remplacer le nœud entier pour déclencher shallowReactive
      const updated: NodeData = { ...this.selectedNode, label: newLabel, deviceType: newDeviceType }
      this.graphData.nodes[this.selectedNodeId] = updated
      this.selectedNode = updated
      this.configs.node.label.text = (node: NodeData) => node.label || node.name
      this.selectedNodeInfos = this._buildNodeInfos(this.selectedNodeId)

      // Appel backend avec mac/ip/label
      try {
        this.isSavingLabel = true
        await invoke("add_label", {
          mac: this.selectedNode.mac ?? "",
          ip: this.selectedNode.ip ?? "",
          label: newLabel,
        })
      } catch (e) {
        console.error("Erreur add_label:", e)
      } finally {
        this.isSavingLabel = false
      }
    },
    onEditKeydown(e: KeyboardEvent) {
      if (e.key === "Enter") this.editNodeLabel()
      else if (e.key === "Escape") this.clearNodeInfos()
    },
    cancelEdit() {
      if (this.selectedNode && this.selectedNodeId) {
        this.editedLabel = this.selectedNode.label ?? ""
        this.selectedNodeInfos = this._buildNodeInfos(this.selectedNodeId)
      }
    },

    getDeviceType(node: any): string {
      return node?.deviceType || "unknown"
    },

    // === Bandeau infos =====================================================
    _buildNodeInfos(nodeId: string): string[] {
      const n = this.graphData.nodes[nodeId] as any
      if (!n) return ["Nœud introuvable"]

      let degree = 0
      const protos = new Set<string>()
      for (const e of Object.values(this.graphData.edges) as any[]) {
        if (!e) continue
        if (e.source === nodeId || e.target === nodeId) {
          degree++
          if (e.label) protos.add(String(e.label))
        }
      }

      const dtype = n.deviceType || "unknown"
      const dtypeLabel = DEVICE_TYPE_LABELS[dtype] ?? dtype

      return [
        `ID: ${n.id}`,
        `Nom: ${n.name ?? ""}`,
        `Label: ${n.label ?? "N/A"}`,
        `Type: ${dtypeLabel}`,
        `MAC: ${n.mac ?? ""}`,
        `IP: ${n.ip ?? ""}`,
        `Couleur: ${n.color}`,
        `Degré: ${degree}`,
        `Protocoles: ${[...protos].join(", ") || "—"}`,
      ]
    },

    // === Force Layout ======================================================
    toggleForce() {
      if (this.forceEnabled) {
        const lh: any = (this.configs.view as any).layoutHandler
        if (isFn(lh, "stop")) lh.stop()
        ;(this.configs.view as any).layoutHandler = this.simpleLayout
      } else {
        (this.configs.view as any).layoutHandler = this.forceLayout
        if (isFn(this.forceLayout, "start")) this.forceLayout.start()
      }
      this.forceEnabled = !this.forceEnabled
    },

    // === Export SVG ========================================================
    async downloadSvg() {
        const filePath = await save({
          filters: [{ name: "SVG File", extensions: ["svg"] }],
          defaultPath: getCurrentDate()+ "_network_graph.svg",
        })
        if (!filePath) return
        const vng = (this.$refs as any).graphnodes
        const text = await vng.exportAsSvgText({ embedImages: true })
        await writeTextFile(filePath, text)
        console.log(`SVG exporté dans ${filePath}`)
      },
      async downloadPng() {
      const filePath = await save({
        filters: [{ name: "PNG File", extensions: ["png"] }],
        defaultPath: getCurrentDate()+ "_network_graph.png",
      })
      if (!filePath) return

      const vng = (this.$refs as any).graphnodes
      const svgText = await vng.exportAsSvgText({ embedImages: true })

      // Options : scale x2 et fond blanc (change selon besoin)
      const pngBytes = await svgTextToPngBytes(svgText, { scale: 2, background: "white" })

      await writeFile(filePath, pngBytes)
      console.log(`PNG exporté dans ${filePath}`)
    },


    // === Queue & updates ===================================================
    normalizeGraphUpdate(raw: any): GraphUpdate | null {
      const u = raw?.update ?? raw
      if (!u) return null
      if (u.type && "payload" in u) return u as GraphUpdate
      if (u.NewNode) return { type: "NodeAdded", payload: u.NewNode }
      if (u.NewEdge) return { type: "EdgeAdded", payload: u.NewEdge }
      if (u.EdgeUpdated) return { type: "EdgeUpdated", payload: u.EdgeUpdated }
      return null
    },
    flushQueue() {
      const q = this._queue
      if (!q.length) return
      for (let i = 0; i < q.length; i++) this.applyUpdate(q[i])
      this._queue.length = 0

      if (this._pendingEdges.length) {
        const pend = this._pendingEdges.slice()
        this._pendingEdges.length = 0
        for (const u of pend) this.applyUpdate(u)
      }
    },
    applyUpdate(update: GraphUpdate | any) {
      if (!update) return
      const u = this.normalizeGraphUpdate(update)
      if (!u) return

      switch (u.type) {
        case "NodeAdded": {
          const node = u.payload
          if (node) {
            const color = node.color || "#4a6aa0"
            this.graphData.nodes[node.id] = {
              id: node.id,
              name: node.name,
              mac: node.mac || "",
              ip: node.ip || "",
              color,
              label: node.label || "",
              deviceType: detectDeviceType({ mac: node.mac, ip: node.ip, name: node.name }),
              _stroke: darken(color, 0.25),
              _hover: brighten(color, 0.18),
            }
          }
          break
        }
        case "EdgeAdded": {
          const e = u.payload
          if (!this.graphData.nodes[e.source] || !this.graphData.nodes[e.target]) return
          const key = edgeKey(e)
          const _color = colorForLabel(e.label)
          this.graphData.edges[key] = { ...e, bidir: !!e.bidir, _color }
          break
        }
        case "EdgeUpdated": {
          const e = u.payload
          if (!this.graphData.nodes[e.source] || !this.graphData.nodes[e.target]) return
          const key = edgeKey(e)
          const existing = this.graphData.edges[key]
          const _color = colorForLabel(e.label)
          if (existing) {
            existing.bidir = !!e.bidir
            ;(existing as any)._color = _color
          } else {
            this.graphData.edges[key] = { ...e, bidir: !!e.bidir, _color }
          }
          break
        }
      }
    },
  },
})
</script>

<template>
  <div class="graph-container">
    <div class="graph-controls">
      <!-- Gravité toggle -->
      <button
        class="graph-btn"
        :class="{ active: forceEnabled }"
        @click="toggleForce"
        :title="forceEnabled ? 'Désactiver la gravité' : 'Activer la gravité'"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="5" r="2.5"/>
          <path d="M8 7.5v5"/>
          <path d="M5.5 10.5l2.5 2.5 2.5-2.5"/>
        </svg>
      </button>
    </div>

    <!-- Graph -->
    <v-network-graph
      class="graph"
      ref="graphnodes"
      v-model:zoom-level="zoomLevel"
      :nodes="graphNodes"
      :edges="graphEdges"
      :layouts="graphData.layouts"
      :configs="configs"
      :event-handlers="eventHandlers"
    >
      <template #override-node="{ nodeId, scale }">
        <!-- Outer colored ring (private=blue/green, public=orange) -->
        <circle
          :r="20 * scale"
          :fill="graphNodes[nodeId]?.color ?? '#4a6aa0'"
          :stroke="graphNodes[nodeId]?._stroke ?? '#2a3a60'"
          :stroke-width="3 * scale"
        />
        <!-- Dark inner fill -->
        <circle :r="15 * scale" fill="#1a1a26" />
        <!-- Device icon -->
        <g :transform="`scale(${scale * 0.9})`" fill="#b8b8d0" stroke="#b8b8d0"
           stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <!-- router -->
          <template v-if="getDeviceType(graphNodes[nodeId]) === 'router'">
            <rect x="-7" y="1" width="14" height="5" rx="1.5" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <circle cx="-4" cy="3.5" r="1" fill="#b8b8d0" stroke="none"/>
            <circle cx="-1" cy="3.5" r="1" fill="#b8b8d0" stroke="none"/>
            <line x1="-4" y1="1" x2="-5" y2="-5" stroke="#b8b8d0"/>
            <line x1="0" y1="1" x2="0" y2="-6" stroke="#b8b8d0"/>
            <line x1="4" y1="1" x2="5" y2="-5" stroke="#b8b8d0"/>
            <circle cx="-5.5" cy="-5.5" r="1.2" fill="#b8b8d0" stroke="none"/>
            <circle cx="0" cy="-6.5" r="1.2" fill="#b8b8d0" stroke="none"/>
            <circle cx="5.5" cy="-5.5" r="1.2" fill="#b8b8d0" stroke="none"/>
          </template>
          <!-- server -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'server'">
            <rect x="-7" y="-6.5" width="14" height="3.5" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <rect x="-7" y="-1.5" width="14" height="3.5" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <rect x="-7" y="3.5" width="14" height="3.5" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <circle cx="5" cy="-4.75" r="1" fill="#b8b8d0" stroke="none"/>
            <circle cx="5" cy="0.25" r="1" fill="#b8b8d0" stroke="none"/>
            <circle cx="5" cy="5.25" r="1" fill="#b8b8d0" stroke="none"/>
          </template>
          <!-- computer -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'computer'">
            <rect x="-7" y="-7" width="14" height="9" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <line x1="-7" y1="-2" x2="7" y2="-2" stroke="#b8b8d0" stroke-width="0.7" opacity="0.5"/>
            <rect x="-2" y="2" width="4" height="2.5" rx="0.5" fill="none" stroke="#b8b8d0" stroke-width="1"/>
            <line x1="-5" y1="7" x2="5" y2="7" stroke="#b8b8d0" stroke-width="1.6" stroke-linecap="round"/>
          </template>
          <!-- phone -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'phone'">
            <rect x="-4.5" y="-8" width="9" height="15" rx="2" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <circle cx="0" cy="5" r="1.3" fill="#b8b8d0" stroke="none"/>
            <line x1="-1.5" y1="-6.5" x2="1.5" y2="-6.5" stroke="#b8b8d0" stroke-width="1.3" stroke-linecap="round"/>
          </template>
          <!-- apple -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'apple'">
            <path d="M1.5,-9.5 C2.5,-11 4,-10.5 4,-9" fill="none" stroke="#b8b8d0" stroke-width="1.2"/>
            <path d="M-0.5,-7 C-4.5,-6 -6,-1 -5,3.5 C-4,7 -2,8.5 0,8.5 C2,8.5 3.5,7 3.5,7 C3.5,7 5,8.5 7,7.5 C9,5.5 8,-1 4,-6 C2.5,-7.5 0.5,-7 -0.5,-7 Z" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <path d="M0,-7.5 C0,-9.5 2,-10 2,-8" fill="none" stroke="#b8b8d0" stroke-width="1.2"/>
          </template>
          <!-- windows -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'windows'">
            <rect x="-7.5" y="-7.5" width="6.5" height="6.5" rx="0.5" fill="#b8b8d0" stroke="none" opacity="0.9"/>
            <rect x="1" y="-7.5" width="6.5" height="6.5" rx="0.5" fill="#b8b8d0" stroke="none" opacity="0.7"/>
            <rect x="-7.5" y="1" width="6.5" height="6.5" rx="0.5" fill="#b8b8d0" stroke="none" opacity="0.6"/>
            <rect x="1" y="1" width="6.5" height="6.5" rx="0.5" fill="#b8b8d0" stroke="none" opacity="0.85"/>
          </template>
          <!-- linux / raspberry pi -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'linux'">
            <ellipse cx="0" cy="-2.5" rx="5" ry="6" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <circle cx="-2" cy="-4" r="1.2" fill="#b8b8d0" stroke="none"/>
            <circle cx="2" cy="-4" r="1.2" fill="#b8b8d0" stroke="none"/>
            <path d="M-2.5,0 C-1,1.5 1,1.5 2.5,0" fill="none" stroke="#b8b8d0" stroke-width="1.1"/>
            <path d="M-4,3.5 L-5.5,8 L-0.5,6" fill="none" stroke="#b8b8d0" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M4,3.5 L5.5,8 L0.5,6" fill="none" stroke="#b8b8d0" stroke-width="1.3" stroke-linejoin="round"/>
          </template>
          <!-- printer -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'printer'">
            <rect x="-5.5" y="-8" width="11" height="4.5" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <rect x="-7" y="-3.5" width="14" height="8" rx="1.5" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <rect x="-3.5" y="1" width="7" height="6" rx="0.5" fill="none" stroke="#b8b8d0" stroke-width="1"/>
            <circle cx="4.5" cy="0.5" r="1" fill="#b8b8d0" stroke="none"/>
          </template>
          <!-- vm -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'vm'">
            <rect x="-7" y="-7" width="14" height="14" rx="1.5" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <rect x="-4" y="-4" width="8" height="8" rx="1" fill="none" stroke="#b8b8d0" stroke-width="1" stroke-dasharray="2,1.5"/>
            <text x="0" y="2.5" text-anchor="middle" font-size="4.5" fill="#b8b8d0" stroke="none" font-weight="bold" font-family="monospace">VM</text>
          </template>
          <!-- internet / globe -->
          <template v-else-if="getDeviceType(graphNodes[nodeId]) === 'internet'">
            <circle cx="0" cy="0" r="7.5" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <ellipse cx="0" cy="0" rx="4" ry="7.5" fill="none" stroke="#b8b8d0" stroke-width="1"/>
            <line x1="-7.5" y1="0" x2="7.5" y2="0" stroke="#b8b8d0" stroke-width="1"/>
            <line x1="-6" y1="-4" x2="6" y2="-4" stroke="#b8b8d0" stroke-width="0.8"/>
            <line x1="-6" y1="4" x2="6" y2="4" stroke="#b8b8d0" stroke-width="0.8"/>
          </template>
          <!-- unknown (default) -->
          <template v-else>
            <circle cx="0" cy="-2" r="3.5" fill="none" stroke="#b8b8d0" stroke-width="1.3"/>
            <text x="0" y="1.5" text-anchor="middle" font-size="5" fill="#b8b8d0" stroke="none" font-weight="bold" font-family="sans-serif">?</text>
            <circle cx="0" cy="5.5" r="1.3" fill="#b8b8d0" stroke="none"/>
          </template>
        </g>
      </template>

      <template #edge-label="slotProps">
        <v-edge-label
          v-if="zoomLevel >= 1.2"
          :text="slotProps.edge.label"
          align="center"
          vertical-align="above"
          v-bind="slotProps"
          :font-size="18 * slotProps.scale"
          fill="#9a9aa8"
        />
        <v-edge-label
          v-if="zoomLevel >= 1.8"
          :text="`${slotProps.edge.source_port ?? ''}`"
          align="source"
          vertical-align="below"
          v-bind="slotProps"
          :font-size="14 * slotProps.scale"
          fill="#E0E0E0"
        />
        <v-edge-label
          v-if="zoomLevel >= 1.8"
          :text="`${slotProps.edge.destination_port ?? ''}`"
          align="target"
          vertical-align="below"
          v-bind="slotProps"
          :font-size="14 * slotProps.scale"
          fill="#E0E0E0"
        />
      </template>
    </v-network-graph>

    <!-- Bandeau d'infos en bas -->
    <div class="bottom-info">
      <div class="zoom">Zoom: {{ zoomLevel.toPrecision(2) }}</div>
      <div class="sep" />
      <button class="inline-btn" @click="printLabels" title="Afficher les labels">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <circle cx="4" cy="7" r="1.5"/>
          <circle cx="7" cy="3.5" r="1.5"/>
          <circle cx="10" cy="7" r="1.5"/>
          <circle cx="7" cy="10.5" r="1.5"/>
        </svg>
        Labels
      </button>
      <div class="sep" />
      <div class="node-infos" v-if="selectedNodeInfos.length">
        <strong>Nœud sélectionné</strong>

        <!-- Édition du label et du type -->
        <div class="edit-row">
          <label for="labelInput">Label :</label>
          <input
            id="labelInput"
            v-model="editedLabel"
            type="text"
            placeholder="Entrer un label…"
            @keydown="onEditKeydown"
          />
          <label for="deviceTypeSelect">Type :</label>
          <select id="deviceTypeSelect" v-model="editedDeviceType" class="device-select">
            <option v-for="(label, value) in deviceTypeLabels" :key="value" :value="value">{{ label }}</option>
          </select>
          <button
            class="primary"
            :disabled="isSavingLabel || !selectedNode"
            @click="editNodeLabel"
            title="Valider la modification"
          >
            {{ isSavingLabel ? "Enregistrement…" : "Enregistrer" }}
          </button>
          <button class="ghost" @click="clearNodeInfos" :disabled="isSavingLabel">Annuler</button>
        </div>

        <ul>
          infos : 
          <li v-for="(info, idx) in selectedNodeInfos" :key="idx">{{ info }}</li>
        </ul>
      </div>
      <div class="node-infos hint" v-else>
        Clique sur un nœud pour afficher ses informations.
      </div>
      
    </div>
    <LegendComponent />
  </div>
</template>

<style scoped>
.graph-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #282838;
  overflow: hidden;
}
.graph { flex: 1; background: #1e1e28; }

/* Contrôles flottants */
.graph-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
}

.graph-btn {
  width: 28px;
  height: 28px;
  background: rgba(28, 28, 32, 0.75);
  border: 1px solid #3c3c50;
  border-radius: 5px;
  color: #585870;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  backdrop-filter: blur(4px);
}

.graph-btn svg {
  width: 14px;
  height: 14px;
}

.graph-btn:hover {
  color: #888894;
  background: rgba(30, 30, 34, 0.9);
  border-color: #484858;
  transform: translateY(-1px);
}
.graph-btn:active {
  transform: scale(0.9);
}

.graph-btn.active {
  color: #5a8a9a;
  border-color: #2a4a55;
  background: rgba(30, 50, 60, 0.6);
}

/* Bandeau bas */
.bottom-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(24, 24, 28, 0.92);
  color: #a0a0b4;
  border-top: 1px solid #484860;
  backdrop-filter: blur(4px);
  z-index: 20;
}
.bottom-info .zoom {
  font-variant-numeric: tabular-nums;
  font-family: monospace;
  font-size: 11px;
  color: #585870;
}
.bottom-info .sep {
  width: 1px;
  height: 16px;
  background: #3c3c50;
}

.inline-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: #585870;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.15s ease;
}
.inline-btn svg { width: 11px; height: 11px; }
.inline-btn:hover { color: #888894; }
.node-infos {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.node-infos ul {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.node-infos li { opacity: 0.95; }
.node-infos.hint { color: #8888a0; font-style: italic; font-size: 12px; }

.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 10px;
}
.edit-row input {
  background: #343448;
  color: #d4d4d8;
  border: 1px solid #545465;
  border-radius: 6px;
  padding: 6px 8px;
  min-width: 180px;
}
.device-select {
  background: #343448;
  color: #d4d4d8;
  border: 1px solid #545465;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888894'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}
.device-select:focus {
  outline: none;
  border-color: #3a5a80;
}
.device-select option {
  background: #2a2a3a;
  color: #d4d4d8;
}
button.primary {
  background: #2e4a68;
  color: #d4d4d8;
  border: 1px solid #3a5a80;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
button.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
button.ghost {
  background: transparent;
  color: #888894;
  border: 1px solid #484858;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
</style>
