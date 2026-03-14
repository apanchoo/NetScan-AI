import { defineStore } from 'pinia'

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'lmstudio' | 'openai-compatible'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl: string
  model: string
  configured: boolean
}

const STORAGE_KEY = 'netscanai-ai-config'

function load(): Partial<AIConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export const useAIStore = defineStore('ai', {
  state: (): AIConfig => ({
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    configured: false,
    ...load(),
  }),

  actions: {
    save(config: Omit<AIConfig, 'configured'>) {
      this.provider  = config.provider
      this.apiKey    = config.apiKey
      this.baseUrl   = config.baseUrl
      this.model     = config.model
      this.configured = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        provider:   this.provider,
        apiKey:     this.apiKey,
        baseUrl:    this.baseUrl,
        model:      this.model,
        configured: true,
      }))
    },
    reset() {
      this.provider   = 'anthropic'
      this.apiKey     = ''
      this.baseUrl    = ''
      this.model      = ''
      this.configured = false
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})
