import type { AppSettings } from '../shared/settings-types'

export interface OpenRouterModel {
  id: string
  name: string
}

export interface SettingsAPI {
  getSettings(): Promise<AppSettings>
  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<AppSettings>
  fetchModels(
    apiKey: string
  ): Promise<{ models?: OpenRouterModel[]; error?: string }>
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
}

declare global {
  interface Window {
    settingsApi: SettingsAPI
  }
}
