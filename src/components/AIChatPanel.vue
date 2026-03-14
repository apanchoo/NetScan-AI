<template>
  <transition name="panel-slide">
    <div v-if="visible" class="ai-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="panel-title">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="title-icon">
            <circle cx="8" cy="6" r="3"/>
            <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5"/>
            <path d="M11 4.5c.8.4 1.5 1.2 1.5 2.5"/>
          </svg>
          <span>NetScan-AI</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn" title="Reconfigurer l'IA" @click="reconfigure">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
              <circle cx="8" cy="8" r="2"/>
              <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M11.9 4.1l-.7.7M4.8 11.2l-.7.7"/>
            </svg>
          </button>
          <button class="icon-btn" title="Vider le chat" @click="clearChat">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 4 4 4 13 4"/>
              <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 8v5M10 8v5"/>
              <path d="M4 4l.5 8.5a1 1 0 0 0 1 .5h5a1 1 0 0 0 1-.5L12 4"/>
            </svg>
          </button>
          <button class="icon-btn close-btn" title="Fermer" @click="$emit('close')">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="4" y1="4" x2="12" y2="12"/>
              <line x1="12" y1="4" x2="4" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Not configured -->
      <div v-if="!aiConfigured" class="not-configured">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="setup-icon">
          <circle cx="16" cy="12" r="6"/>
          <path d="M4 28c0-6.6 5.4-10 12-10s12 3.4 12 10"/>
          <path d="M22 9c1.6.8 3 2.4 3 5"/>
        </svg>
        <p>Configure ton fournisseur d'IA pour utiliser l'assistant.</p>
        <button class="configure-btn" @click="reconfigure">Configurer l'IA</button>
      </div>

      <!-- Chat messages -->
      <div v-else class="messages" ref="messagesEl">
        <div v-if="messages.length === 0" class="empty-state">
          <p>Salut ! Je peux t'aider à contrôler NetScan-AI en langage naturel.</p>
          <div class="suggestions">
            <button class="suggestion" @click="sendSuggestion('Démarre la capture')">Démarre la capture</button>
            <button class="suggestion" @click="sendSuggestion('Filtre uniquement le trafic TCP')">Filtre TCP seulement</button>
            <button class="suggestion" @click="sendSuggestion('Quel est le statut actuel ?')">Statut actuel</button>
            <button class="suggestion" @click="sendSuggestion('Réinitialise les données')">Réinitialiser</button>
          </div>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['message', msg.role]"
        >
          <div class="bubble">
            <span v-if="msg.role === 'assistant' && msg.streaming" class="streaming-text">{{ msg.content }}<span class="cursor">|</span></span>
            <span v-else>{{ msg.content }}</span>
          </div>
          <div v-if="msg.actions && msg.actions.length > 0" class="actions-list">
            <div v-for="(a, j) in msg.actions" :key="j" class="action-badge">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
              {{ actionLabel(a.action) }} — {{ a.result }}
            </div>
          </div>
        </div>

        <div v-if="loading" class="message assistant">
          <div class="bubble typing">
            <span class="dot"/><span class="dot"/><span class="dot"/>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div v-if="aiConfigured" class="input-area">
        <textarea
          ref="inputEl"
          v-model="inputText"
          placeholder="Envoie une commande en langage naturel..."
          rows="1"
          :disabled="loading"
          @keydown.enter.exact.prevent="sendMessage"
          @input="autoResize"
        />
        <button class="send-btn" :disabled="loading || !inputText.trim()" @click="sendMessage">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 8L14 2L10 14L8 9L2 8Z"/>
          </svg>
        </button>
      </div>
    </div>
  </transition>

  <!-- Re-configure dialog trigger -->
  <AISetupDialog :visible="showSetup" @done="onSetupDone" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAIStore } from '../store/ai'
import { sendMessage as aiSend } from '../services/aiService'
import type { ChatMessage, ActionResult } from '../services/aiService'
import AISetupDialog from './AISetupDialog.vue'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  actions?: ActionResult[]
}

const ACTION_LABELS: Record<string, string> = {
  start_capture: 'Capture démarrée',
  stop_capture: 'Capture arrêtée',
  reset_capture: 'Données réinitialisées',
  set_filter: 'Filtre appliqué',
  export_csv: 'Export CSV',
  get_status: 'Statut récupéré',
}

export default defineComponent({
  name: 'AIChatPanel',
  components: { AISetupDialog },
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['close'],

  data() {
    return {
      inputText: '',
      messages: [] as DisplayMessage[],
      loading: false,
      showSetup: false,
      history: [] as ChatMessage[],
    }
  },

  computed: {
    aiConfigured(): boolean {
      return useAIStore().configured
    },
  },

  methods: {
    actionLabel(name: string): string {
      return ACTION_LABELS[name] ?? name
    },

    reconfigure() {
      this.showSetup = true
    },

    onSetupDone() {
      this.showSetup = false
    },

    clearChat() {
      this.messages = []
      this.history = []
    },

    sendSuggestion(text: string) {
      this.inputText = text
      this.sendMessage()
    },

    async sendMessage() {
      const text = this.inputText.trim()
      if (!text || this.loading) return

      this.inputText = ''
      this.$nextTick(() => this.autoResize())

      this.messages.push({ role: 'user', content: text })
      this.history.push({ role: 'user', content: text })
      this.scrollToBottom()

      this.loading = true
      const assistantIdx = this.messages.length
      this.messages.push({ role: 'assistant', content: '', streaming: true, actions: [] })

      try {
        const reply = await aiSend(this.history, (chunk) => {
          this.messages[assistantIdx].content += chunk
          this.scrollToBottom()
        })

        this.messages[assistantIdx].content = reply.text
        this.messages[assistantIdx].streaming = false
        this.messages[assistantIdx].actions = reply.actions
        this.history.push({ role: 'assistant', content: reply.text })
      } catch (err: any) {
        const msg = typeof err === 'string'
          ? err
          : (err?.message ?? JSON.stringify(err) ?? String(err))
        this.messages[assistantIdx].content = `Erreur : ${msg}`
        this.messages[assistantIdx].streaming = false
      }

      this.loading = false
      this.scrollToBottom()
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesEl as HTMLElement | undefined
        if (el) el.scrollTop = el.scrollHeight
      })
    },

    autoResize() {
      const el = this.$refs.inputEl as HTMLTextAreaElement | undefined
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    },
  },
})
</script>

<style scoped>
.ai-panel {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: #23232f;
  border-right: 1px solid #35354a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Slide animation — width-based so content reflows */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0;
  opacity: 0;
}

/* Header */
.panel-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 14px;
  border-bottom: 1px solid #35354a;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #9090b0;
  text-transform: uppercase;
}

.title-icon {
  width: 15px;
  height: 15px;
  color: #6060c0;
}

.header-actions {
  display: flex;
  gap: 2px;
}

.icon-btn {
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  color: #555570;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background-color 0.15s;
}
.icon-btn svg { width: 14px; height: 14px; }
.icon-btn:hover { background: #35354a; color: #8888a8; }
.close-btn:hover { background: #3a2828; color: #c08080; }

/* Not configured */
.not-configured {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 14px;
  text-align: center;
}

.setup-icon {
  width: 48px;
  height: 48px;
  color: #4444a0;
  opacity: 0.6;
}

.not-configured p {
  margin: 0;
  font-size: 13px;
  color: #7070a0;
  line-height: 1.5;
}

.configure-btn {
  background: #4444a0;
  border: none;
  color: #d0d0f0;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.configure-btn:hover { background: #5555b8; }

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.messages::-webkit-scrollbar { width: 4px; }
.messages::-webkit-scrollbar-track { background: transparent; }
.messages::-webkit-scrollbar-thumb { background: #35354a; border-radius: 2px; }

.empty-state {
  margin: auto;
  text-align: center;
  padding: 20px 8px;
}

.empty-state p {
  font-size: 13px;
  color: #6060a0;
  margin: 0 0 16px;
  line-height: 1.5;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion {
  background: #2c2c3e;
  border: 1px solid #3a3a52;
  color: #7070a0;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}
.suggestion:hover {
  border-color: #5555a0;
  color: #a0a0c8;
  background: #30304a;
}

/* Message bubbles */
.message {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.message.user { align-items: flex-end; }
.message.assistant { align-items: flex-start; }

.bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.message.user .bubble {
  background: #3a3a58;
  color: #c8c8e8;
  border-bottom-right-radius: 3px;
}

.message.assistant .bubble {
  background: #2c2c3e;
  color: #b0b0d0;
  border-bottom-left-radius: 3px;
}

/* Streaming cursor */
.cursor {
  display: inline-block;
  animation: blink 0.9s step-end infinite;
  color: #6060c0;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Typing dots */
.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
}
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5555a0;
  animation: bounce 1.2s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }

/* Action badges */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 4px;
}

.action-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6060a0;
  padding: 2px 0;
}
.action-badge svg {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  color: #5a9a5a;
}

/* Input area */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #35354a;
  flex-shrink: 0;
}

.input-area textarea {
  flex: 1;
  background: #2c2c3e;
  border: 1px solid #3a3a52;
  border-radius: 8px;
  color: #c0c0e0;
  font-size: 13px;
  padding: 8px 10px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  transition: border-color 0.15s;
  min-height: 36px;
  max-height: 120px;
  overflow-y: auto;
}

.input-area textarea:focus {
  border-color: #5050a0;
}

.input-area textarea::placeholder {
  color: #505070;
}

.input-area textarea:disabled {
  opacity: 0.5;
}

.send-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: #4444a0;
  border: none;
  border-radius: 8px;
  color: #d0d0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, transform 0.1s;
}
.send-btn svg { width: 14px; height: 14px; }
.send-btn:hover:not(:disabled) { background: #5555b8; }
.send-btn:active:not(:disabled) { transform: scale(0.9); }
.send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .panel-slide-enter-active,
  .panel-slide-leave-active { transition: none; }
  .cursor { animation: none; }
  .dot { animation: none; }
}
</style>
