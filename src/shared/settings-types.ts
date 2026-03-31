import type { OutputAction } from './ipc'

export type { OutputAction }

export interface QuickAction {
  id: string
  name: string
  template: string
}

export interface AppSettings {
  hotkey: string
  defaultOutputAction: OutputAction
  autoDismiss: boolean
  autoDismissDelay: number
  hideOnBlur: boolean
  launchAtStartup: boolean
  apiKey: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  quickActions: QuickAction[]
  accentColor: string
  promptWindowWidth: number
  fontSize: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'CmdOrCtrl+Shift+Space',
  defaultOutputAction: 'display',
  autoDismiss: false,
  autoDismissDelay: 2000,
  hideOnBlur: true,
  launchAtStartup: false,
  apiKey: '',
  model: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  quickActions: [
    { id: 'rewrite', name: 'Rewrite', template: 'Rewrite the following text:\n\n{{selection}}' },
    { id: 'summarize', name: 'Summarize', template: 'Summarize the following text:\n\n{{selection}}' },
    { id: 'fix-grammar', name: 'Fix Grammar', template: 'Fix the grammar in the following text:\n\n{{selection}}' },
    { id: 'translate', name: 'Translate', template: 'Translate the following text to English:\n\n{{selection}}' },
    { id: 'explain', name: 'Explain', template: 'Explain the following text:\n\n{{selection}}' },
  ],
  accentColor: '#00d4ff',
  promptWindowWidth: 560,
  fontSize: 14,
}
