<template>
  <Teleport to="body">
    <div class="setup-backdrop" v-if="visible">
      <div class="setup-dialog">

        <!-- Header -->
        <div class="setup-header">
          <div class="setup-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10"/>
              <path d="M12 6v6l4 2"/>
              <path d="M18 14l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <h1 class="setup-title">Configurer l'IA</h1>
            <p class="setup-sub">
              <span v-if="step === 1">Choisissez le fournisseur que vous souhaitez utiliser.</span>
              <span v-else>Renseignez les informations d'accès pour <strong>{{ currentProvider?.label }}</strong>.</span>
            </p>
          </div>
        </div>

        <!-- Step 1 — provider selection -->
        <div v-if="step === 1" class="step-providers">
          <button
            v-for="p in providers"
            :key="p.id"
            class="provider-card"
            :class="{ selected: selectedProvider === p.id }"
            @click="selectedProvider = p.id"
          >
            <div class="provider-icon" :style="{ color: p.color }">
              <svg v-if="p.id === 'anthropic'" viewBox="0 0 24 24" fill="currentColor"><path d="M13.8 2h-3.6L4 22h3.8l1.5-4.2h5.4l1.5 4.2H20L13.8 2zm-3.5 12.4 1.7-4.8 1.7 4.8H10.3z"/></svg>
              <svg v-else-if="p.id === 'openai'" viewBox="0 0 24 24" fill="currentColor"><path d="M22.3 9.8a5.9 5.9 0 0 0-.5-4.9 6.1 6.1 0 0 0-6.6-2.9A6 6 0 0 0 10.7 0a6.1 6.1 0 0 0-5.8 4.2 6 6 0 0 0-4 2.9 6.1 6.1 0 0 0 .7 7.1 6 6 0 0 0 .5 4.9 6.1 6.1 0 0 0 6.6 2.9A6 6 0 0 0 13.3 24a6.1 6.1 0 0 0 5.8-4.2 6 6 0 0 0 4-2.9 6.1 6.1 0 0 0-.8-7.1zM13.3 22.5a4.5 4.5 0 0 1-2.9-1.1l.1-.1 4.9-2.8a.8.8 0 0 0 .4-.7v-6.8l2.1 1.2v5.5a4.5 4.5 0 0 1-4.6 3.8zm-9.8-4.1a4.5 4.5 0 0 1-.5-3l.1.1 4.9 2.8a.8.8 0 0 0 .8 0l5.9-3.4v2.4a.1.1 0 0 1 0 .1L9.8 20a4.5 4.5 0 0 1-6.3-1.6zm-1.3-10a4.5 4.5 0 0 1 2.3-2L4.4 12v5.6a.8.8 0 0 0 .4.7l5.9 3.4-2.1 1.2A4.5 4.5 0 0 1 2.2 8.4zm17.4 3.9L13.7 9l2.1-1.2a4.5 4.5 0 0 1 4.7 7.3l-.1-.1V9.4a.8.8 0 0 0-.8-.8l-5.9-3.4 2.1-1.2a4.5 4.5 0 0 1 6.4 1.6 4.5 4.5 0 0 1-.5 3.4l-.2.3zm-11.8.7 2.4-1.4 2.4 1.4v2.7l-2.4 1.4-2.4-1.4V13z"/></svg>
              <svg v-else-if="p.id === 'gemini'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/><path d="M12 0L9 9H3l5.2 3.8L6 22l6-4.2 6 4.2-2.2-9.2L21 9h-6z"/></svg>
              <svg v-else-if="p.id === 'lmstudio'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2m2 0h6M7 12h4m2 0h4"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
            </div>
            <div class="provider-info">
              <span class="provider-name">{{ p.label }}</span>
              <span class="provider-desc">{{ p.desc }}</span>
            </div>
            <div class="provider-check" v-if="selectedProvider === p.id">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,7 5.5,10.5 12,3"/></svg>
            </div>
          </button>
        </div>

        <!-- Step 2 — credentials -->
        <div v-if="step === 2" class="step-credentials">

          <!-- API key (all except lmstudio) -->
          <div class="cred-field" v-if="needsKey">
            <label>Clé API</label>
            <div class="key-input-wrap">
              <input
                :type="showKey ? 'text' : 'password'"
                v-model="form.apiKey"
                :placeholder="currentProvider?.keyPlaceholder"
                class="cred-input"
                autocomplete="off"
              />
              <button class="key-toggle" @click="showKey = !showKey" type="button">
                <svg v-if="!showKey" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2l12 12M6.7 6.8A2 2 0 0 0 9.2 9.3M4.1 4.2C2.6 5.2 1.4 6.8 1 8c1 2.7 4 5 7 5a7 7 0 0 0 3.3-.8M7 3.1C7.3 3 7.7 3 8 3c3 0 6 2.3 7 5-.3.9-.8 1.7-1.5 2.4"/></svg>
              </button>
            </div>
          </div>

          <!-- Base URL (lmstudio + openai-compatible) -->
          <div class="cred-field" v-if="needsUrl">
            <label>URL du serveur</label>
            <input
              type="text"
              v-model="form.baseUrl"
              :placeholder="currentProvider?.urlPlaceholder"
              class="cred-input"
            />
          </div>

          <!-- Model -->
          <div class="cred-field">
            <label>Modèle</label>
            <div v-if="currentProvider?.models?.length" class="model-select-wrap">
              <select v-model="form.model" class="cred-select">
                <option v-for="m in currentProvider.models" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
            </div>
            <input
              v-else
              type="text"
              v-model="form.model"
              placeholder="ex: llama-3-8b-instruct"
              class="cred-input"
            />
          </div>

          <!-- LM Studio hint -->
          <p class="cred-hint" v-if="selectedProvider === 'lmstudio'">
            Lancez LM Studio et activez le serveur local (<code>Developer → Start Server</code>). L'URL doit inclure <code>/v1</code>, ex&nbsp;: <code>http://localhost:1234/v1</code>. Aucune clé API n'est requise.
          </p>
          <p class="cred-hint" v-else>
            La clé est stockée localement sur votre machine.
          </p>

        </div>

        <!-- Footer -->
        <div class="setup-footer">
          <button class="btn-skip" @click="skip">Configurer plus tard</button>
          <div class="footer-right">
            <button v-if="step === 2" class="btn-back" @click="step = 1">Retour</button>
            <button v-if="step === 1" class="btn-continue" @click="goToStep2" :disabled="!selectedProvider">Continuer</button>
            <button v-if="step === 2" class="btn-save" @click="save" :disabled="!canSave">Enregistrer</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAIStore } from '../store/ai'
import type { AIProvider } from '../store/ai'

interface ProviderDef {
  id: AIProvider
  label: string
  desc: string
  color: string
  keyPlaceholder?: string
  urlPlaceholder?: string
  models?: { id: string; label: string }[]
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    desc: 'Claude — modèles rapides et précis',
    color: '#c97b4b',
    keyPlaceholder: 'sk-ant-…',
    models: [
      { id: 'claude-opus-4-6',    label: 'Claude Opus 4.6'    },
      { id: 'claude-sonnet-4-6',  label: 'Claude Sonnet 4.6'  },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5'   },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    desc: 'GPT-4o et GPT-4o mini',
    color: '#10a37f',
    keyPlaceholder: 'sk-…',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o'      },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    desc: 'Gemini 2.0 Flash et 1.5 Pro',
    color: '#4285f4',
    keyPlaceholder: 'AIza…',
    models: [
      { id: 'gemini-2.0-flash',  label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro',    label: 'Gemini 1.5 Pro'   },
      { id: 'gemini-1.5-flash',  label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    desc: 'Modèles locaux via LM Studio',
    color: '#a78bfa',
    urlPlaceholder: 'http://localhost:1234/v1',
  },
  {
    id: 'openai-compatible',
    label: 'Compatible OpenAI',
    desc: 'Ollama, Together AI, Mistral…',
    color: '#6b7280',
    keyPlaceholder: 'clé API (si requise)',
    urlPlaceholder: 'https://api.exemple.com',
  },
]

export default defineComponent({
  name: 'AISetupDialog',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['done'],

  data() {
    return {
      step: 1 as 1 | 2,
      selectedProvider: null as AIProvider | null,
      showKey: false,
      form: {
        apiKey: '',
        baseUrl: '',
        model:   '',
      },
    }
  },

  computed: {
    providers(): ProviderDef[] { return PROVIDERS },
    currentProvider(): ProviderDef | undefined {
      return PROVIDERS.find(p => p.id === this.selectedProvider)
    },
    needsKey(): boolean {
      return this.selectedProvider !== 'lmstudio'
    },
    needsUrl(): boolean {
      return this.selectedProvider === 'lmstudio' || this.selectedProvider === 'openai-compatible'
    },
    canSave(): boolean {
      if (!this.selectedProvider) return false
      if (this.needsKey && !this.form.apiKey.trim()) return false
      if (this.needsUrl && !this.form.baseUrl.trim()) return false
      if (!this.form.model.trim()) return false
      return true
    },
  },

  methods: {
    goToStep2() {
      if (!this.selectedProvider) return
      // pre-fill defaults
      const p = this.currentProvider!
      this.form.apiKey  = ''
      this.form.baseUrl = p.urlPlaceholder ?? ''
      this.form.model   = p.models?.[0]?.id ?? ''
      this.showKey = false
      this.step = 2
    },
    save() {
      if (!this.canSave || !this.selectedProvider) return
      const store = useAIStore()
      store.save({
        provider: this.selectedProvider,
        apiKey:   this.form.apiKey.trim(),
        baseUrl:  this.form.baseUrl.trim(),
        model:    this.form.model.trim(),
      })
      this.$emit('done')
    },
    skip() {
      this.$emit('done')
    },
  },
})
</script>

<style scoped>
.setup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}

.setup-dialog {
  background: #363648;
  border: 1px solid #4a4a60;
  border-radius: 12px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
  width: 540px;
  max-width: 96vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: pop-in 0.22s cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
}

@keyframes pop-in {
  from { transform: scale(0.94) translateY(8px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);   opacity: 1; }
}

/* Header */
.setup-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 22px 16px;
  border-bottom: 1px solid #4a4a60;
  flex-shrink: 0;
}

.setup-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(90, 120, 180, 0.12);
  border: 1px solid rgba(90, 120, 180, 0.25);
  color: #7090c0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.setup-icon svg { width: 20px; height: 20px; }

.setup-title {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 600;
  color: #c8c8dc;
  letter-spacing: 0.01em;
}
.setup-sub {
  margin: 0;
  font-size: 12px;
  color: #686880;
  line-height: 1.4;
}
.setup-sub strong { color: #9090b0; font-weight: 500; }

/* Provider cards */
.step-providers {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #2c2c3a;
  border: 1px solid #484860;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.1s ease;
  width: 100%;
}
.provider-card:hover  { border-color: #6868a0; background: #34344a; }
.provider-card:active { transform: scale(0.99); }
.provider-card.selected {
  border-color: #5a6a9a;
  background: #30304a;
}

.provider-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.provider-icon svg { width: 22px; height: 22px; }

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.provider-name {
  font-size: 13px;
  font-weight: 500;
  color: #c0c0d8;
}
.provider-desc {
  font-size: 11px;
  color: #686880;
}

.provider-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b4f7a;
  border: 1px solid #5a6a9a;
  color: #88aacc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.provider-check svg { width: 10px; height: 10px; }

/* Credentials */
.step-credentials {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.cred-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cred-field label {
  font-size: 11px;
  font-weight: 500;
  color: #808096;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.key-input-wrap {
  display: flex;
  align-items: center;
  background: #2c2c3a;
  border: 1px solid #484860;
  border-radius: 5px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.key-input-wrap:focus-within { border-color: #5a6a80; }

.cred-input {
  flex: 1;
  background: #2c2c3a;
  border: 1px solid #484860;
  border-radius: 5px;
  color: #b8b8d0;
  font-size: 13px;
  padding: 8px 12px;
  transition: border-color 0.15s, color 0.15s;
  font-family: monospace;
}
.key-input-wrap .cred-input {
  border: none;
  border-radius: 0;
  flex: 1;
}
.cred-input:focus {
  outline: none;
  border-color: #5a6a80;
  color: #d0d0e0;
  box-shadow: 0 0 0 2px rgba(90, 106, 128, 0.18);
}

.key-toggle {
  width: 34px;
  height: 100%;
  background: transparent;
  border: none;
  color: #585870;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  transition: color 0.15s;
  flex-shrink: 0;
}
.key-toggle:hover { color: #9090a8; }
.key-toggle svg { width: 14px; height: 14px; }

.model-select-wrap { position: relative; }
.cred-select {
  width: 100%;
  background: #2c2c3a;
  border: 1px solid #484860;
  border-radius: 5px;
  color: #b8b8d0;
  font-size: 13px;
  padding: 8px 32px 8px 12px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23686884' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
  transition: border-color 0.15s;
}
.cred-select:focus { outline: none; border-color: #5a6a80; }
.cred-select option { background: #363648; color: #b8b8d0; }

.cred-hint {
  margin: 0;
  font-size: 11px;
  color: #585870;
  line-height: 1.6;
  background: #2c2c3a;
  border: 1px solid #404055;
  border-radius: 5px;
  padding: 8px 12px;
}
.cred-hint code {
  font-family: monospace;
  color: #7898a8;
  background: rgba(255,255,255,0.05);
  padding: 1px 5px;
  border-radius: 3px;
}

/* Footer */
.setup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 18px;
  border-top: 1px solid #4a4a60;
  flex-shrink: 0;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.btn-skip {
  background: transparent;
  border: none;
  color: #585870;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 0;
  transition: color 0.15s;
}
.btn-skip:hover { color: #808096; }

.btn-back {
  padding: 8px 18px;
  background: transparent;
  border: 1px solid #484860;
  border-radius: 6px;
  color: #808096;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, transform 0.1s ease;
}
.btn-back:hover  { border-color: #60607a; color: #a8a8be; }
.btn-back:active { transform: scale(0.97); }

.btn-continue,
.btn-save {
  padding: 8px 22px;
  background: #304868;
  border: 1px solid #3e5c80;
  border-radius: 6px;
  color: #88b4cc;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s ease;
}
.btn-continue:hover,
.btn-save:hover   { background: #3a5878; border-color: #4a6888; color: #aaced0; }
.btn-continue:active,
.btn-save:active  { transform: scale(0.97); }
.btn-continue:disabled,
.btn-save:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
