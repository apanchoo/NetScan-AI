import { useAIStore } from '../store/ai'
import { invoke, Channel } from '@tauri-apps/api/core'
import { useCaptureStore, useCaptureConfigStore } from '../store/capture'
import type { CaptureEvent } from '../types/capture'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ActionResult {
  action: string
  result: string
}

export interface AIReply {
  text: string
  actions: ActionResult[]
}

// ─── Flow matrix types & summarizer ─────────────────────────────────────────

interface FlowMatrixRow {
  mac_source: string
  mac_destination: string
  vlan_id?: number | null
  protocol_data_link: string
  ip_source: string
  ip_destination: string
  port_source?: number | null
  port_destination?: number | null
  protocol_transport?: string | null
  application_protocol?: string | null
  label_source?: string | null
  label_destination?: string | null
  count: number
  total_bytes: number
  last_seen: string
}

function summarizeFlowMatrix(rows: FlowMatrixRow[], requestedLimit: number): string {
  if (rows.length === 0) return 'La matrice de flux est vide (aucun trafic capturé).'

  // Aggregate stats
  const totalPackets = rows.reduce((s, r) => s + r.count, 0)
  const totalBytes = rows.reduce((s, r) => s + r.total_bytes, 0)

  const protocols: Record<string, number> = {}
  const hosts = new Set<string>()
  for (const r of rows) {
    const proto = r.application_protocol ?? r.protocol_transport ?? r.protocol_data_link ?? 'unknown'
    protocols[proto] = (protocols[proto] ?? 0) + r.count
    if (r.ip_source) hosts.add(r.ip_source)
    if (r.ip_destination) hosts.add(r.ip_destination)
  }

  const topProtocols = Object.entries(protocols)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([p, c]) => `${p}:${c}`)
    .join(', ')

  const fmt = (b: number) =>
    b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB`
    : b > 1_000 ? `${(b / 1_000).toFixed(1)} KB`
    : `${b} B`

  const lines: string[] = [
    `## Matrice de flux — ${rows.length} flows${rows.length >= requestedLimit ? ` (top ${requestedLimit} par volume)` : ''}`,
    `Paquets totaux: ${totalPackets} | Volume: ${fmt(totalBytes)} | Hôtes uniques: ${hosts.size}`,
    `Protocoles: ${topProtocols}`,
    '',
    '| IP src | IP dst | Proto | Port dst | Paquets | Volume |',
    '|--------|--------|-------|----------|---------|--------|',
    ...rows.slice(0, requestedLimit).map(r =>
      `| ${r.ip_source || r.mac_source} | ${r.ip_destination || r.mac_destination} | ${r.application_protocol ?? r.protocol_transport ?? r.protocol_data_link} | ${r.port_destination ?? '-'} | ${r.count} | ${fmt(r.total_bytes)} |`
    ),
  ]

  return lines.join('\n')
}

// ─── HTTP helper — routes local http:// through Rust to bypass CORS ─────────

async function httpPost(url: string, headers: Record<string, string>, body: object): Promise<any> {
  if (url.startsWith('http://')) {
    // Local server (e.g. LM Studio) — use Rust proxy to skip browser CORS
    const text = await invoke<string>('ai_request', {
      url,
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    return JSON.parse(text)
  }

  // HTTPS cloud API — native fetch works (providers support CORS)
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${err}`)
  }
  return resp.json()
}

// ─── App tool definitions ───────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'start_capture',
    description: 'Start network packet capture on the configured interface.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'stop_capture',
    description: 'Stop the ongoing network packet capture.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'reset_capture',
    description: 'Clear all captured data and reset the flow matrix.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'set_filter',
    description:
      'Apply a BPF filter to the capture. Pass empty string to remove the filter. Examples: "tcp port 80", "host 192.168.1.1", "udp", "not arp".',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'BPF filter expression. Empty string clears the filter.',
        },
      },
      required: ['filter'],
    },
  },
  {
    name: 'export_csv',
    description: 'Export the current flow matrix to a CSV file (opens save dialog).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_status',
    description: 'Get the current capture status (running or not, interface, filter).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_flow_matrix',
    description:
      'Read the current flow matrix (captured network traffic). Returns a summary of top flows sorted by packet count. Use this to answer questions about traffic, hosts, protocols, anomalies, etc.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of flows to return (default 150). Reduce for small-context models.',
        },
      },
      required: [],
    },
  },
]

// ─── Execute an app action ──────────────────────────────────────────────────

function tauriErrMsg(err: unknown): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const e = err as any
    return e.message ?? e.error ?? JSON.stringify(err)
  }
  return String(err)
}

async function executeAction(name: string, args: Record<string, any>): Promise<string> {
  const captureStore = useCaptureStore()

  switch (name) {
    case 'start_capture': {
      if (captureStore.isRunning) return 'La capture est déjà en cours.'
      const onEvent = new Channel<CaptureEvent>()
      captureStore.setChannel(onEvent)
      try {
        const status = await invoke('start_capture', { onEvent }) as { is_running: boolean }
        captureStore.updateStatus(status)
        return 'Capture démarrée.'
      } catch (err) {
        throw new Error(tauriErrMsg(err))
      }
    }
    case 'stop_capture': {
      if (!captureStore.isRunning) return 'La capture n\'est pas en cours.'
      const onEvent = captureStore.getChannel()
      try {
        const status = await invoke('stop_capture', { onEvent }) as { is_running: boolean }
        captureStore.updateStatus(status)
        return 'Capture arrêtée.'
      } catch (err) {
        throw new Error(tauriErrMsg(err))
      }
    }
    case 'reset_capture': {
      try {
        await invoke('reset_capture')
        return 'Données réinitialisées.'
      } catch (err) {
        throw new Error(tauriErrMsg(err))
      }
    }
    case 'set_filter': {
      const filter: string = args.filter ?? ''
      try {
        await invoke('set_filter', { filter })
        useCaptureConfigStore().$patch({ activeFilter: filter })
        if (captureStore.isRunning) {
          const onEvent = captureStore.getChannel()
          await invoke('stop_capture', { onEvent })
          const newChannel = new Channel<CaptureEvent>()
          captureStore.setChannel(newChannel)
          const status = await invoke('start_capture', { onEvent: newChannel }) as { is_running: boolean }
          captureStore.updateStatus(status)
        }
        return filter ? `Filtre appliqué : "${filter}"` : 'Filtre supprimé.'
      } catch (err) {
        throw new Error(tauriErrMsg(err))
      }
    }
    case 'get_flow_matrix': {
      const limit: number = args.limit ?? 150
      try {
        const rows = await invoke<FlowMatrixRow[]>('get_flow_matrix', { limit })
        return summarizeFlowMatrix(rows, limit)
      } catch (err) {
        throw new Error(tauriErrMsg(err))
      }
    }
    case 'export_csv': {
      document.dispatchEvent(new CustomEvent('ai-export-csv'))
      return 'Export CSV déclenché.'
    }
    case 'get_status': {
      const status = captureStore.isRunning ? 'en cours' : 'arrêtée'
      return `Capture ${status}.`
    }
    default:
      return `Action inconnue : ${name}`
  }
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un assistant intégré à NetScan-AI, un analyseur de trafic réseau.
Tu aides l'utilisateur à contrôler l'application en langage naturel.
Tu peux démarrer/arrêter la capture, appliquer des filtres BPF, réinitialiser les données, et exporter les résultats.
Réponds en français, de façon concise. Si l'utilisateur demande une action, utilise l'outil correspondant.`

// ─── Provider implementations ────────────────────────────────────────────────

async function callAnthropic(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<AIReply> {
  const store = useAIStore()
  const actions: ActionResult[] = []

  const body = {
    model: store.model || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    })),
    messages: messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content })),
  }

  const data = await httpPost('https://api.anthropic.com/v1/messages', {
    'x-api-key': store.apiKey,
    'anthropic-version': '2023-06-01',
  }, body)

  let textOut = ''
  const toolCalls: Array<{ name: string; input: Record<string, any> }> = []

  for (const block of data.content ?? []) {
    if (block.type === 'text') {
      textOut += block.text
      onChunk(block.text)
    } else if (block.type === 'tool_use') {
      toolCalls.push({ name: block.name, input: block.input ?? {} })
    }
  }

  for (const call of toolCalls) {
    const result = await executeAction(call.name, call.input)
    actions.push({ action: call.name, result })
  }

  return { text: textOut, actions }
}

async function callOpenAI(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  baseUrl = 'https://api.openai.com/v1',
): Promise<AIReply> {
  const store = useAIStore()
  const actions: ActionResult[] = []

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
  ]

  const body = {
    model: store.model || 'gpt-4o',
    messages: apiMessages,
    tools: TOOLS.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    })),
    tool_choice: 'auto',
  }

  const data = await httpPost(`${baseUrl}/chat/completions`,
    store.apiKey ? { authorization: `Bearer ${store.apiKey}` } : {},
    body,
  )
  const message = data.choices?.[0]?.message
  let textOut = message?.content ?? ''

  if (textOut) onChunk(textOut)

  for (const call of message?.tool_calls ?? []) {
    let args: Record<string, any> = {}
    try { args = JSON.parse(call.function.arguments) } catch {}
    try {
      const result = await executeAction(call.function.name, args)
      actions.push({ action: call.function.name, result })
    } catch (err: any) {
      actions.push({ action: call.function.name, result: `Erreur : ${err?.message ?? tauriErrMsg(err)}` })
    }
  }

  return { text: textOut, actions }
}

async function callGemini(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<AIReply> {
  const store = useAIStore()
  const actions: ActionResult[] = []
  const model = store.model || 'gemini-2.0-flash'

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    tools: [{
      function_declarations: TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    }],
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${store.apiKey}`
  const data = await httpPost(url, {}, body)
  let textOut = ''

  for (const candidate of data.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        textOut += part.text
        onChunk(part.text)
      }
      if (part.functionCall) {
        const result = await executeAction(part.functionCall.name, part.functionCall.args ?? {})
        actions.push({ action: part.functionCall.name, result })
      }
    }
  }

  return { text: textOut, actions }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendMessage(
  history: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<AIReply> {
  const store = useAIStore()

  switch (store.provider) {
    case 'anthropic':
      return callAnthropic(history, onChunk)
    case 'openai':
      return callOpenAI(history, onChunk)
    case 'gemini':
      return callGemini(history, onChunk)
    case 'lmstudio': {
      let url = store.baseUrl || 'http://localhost:1234/v1'
      // Ensure the base URL ends with /v1 — LM Studio's API is at /v1/chat/completions
      if (!url.endsWith('/v1') && !url.endsWith('/v1/')) url = url.replace(/\/$/, '') + '/v1'
      return callOpenAI(history, onChunk, url)
    }
    case 'openai-compatible':
      return callOpenAI(history, onChunk, store.baseUrl)
    default:
      throw new Error(`Fournisseur inconnu : ${store.provider}`)
  }
}
