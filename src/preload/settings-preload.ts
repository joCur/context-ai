import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'

export interface OpenRouterModel {
  id: string
  name: string
}

const settingsApi = {
  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_GET)
  },

  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_SET, key, value)
  },

  fetchModels(
    apiKey: string
  ): Promise<{ models?: OpenRouterModel[]; error?: string }> {
    return ipcRenderer.invoke(IPC.SETTINGS_FETCH_MODELS, apiKey)
  },

  onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      settings: AppSettings
    ): void => callback(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler)
  },
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)
