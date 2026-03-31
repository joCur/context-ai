import { ipcMain, type BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'
import type { SettingsStore } from './settings-store'

export interface OpenRouterModel {
  id: string
  name: string
}

async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data = (await response.json()) as { data: Array<{ id: string; name: string }> }
  return data.data.map((m) => ({ id: m.id, name: m.name }))
}

export function setupSettingsIPC(
  settingsStore: SettingsStore,
  getAllWindows: () => BrowserWindow[]
): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): AppSettings => {
    return settingsStore.getAll()
  })

  ipcMain.handle(
    IPC.SETTINGS_SET,
    (_event, key: keyof AppSettings, value: AppSettings[keyof AppSettings]): AppSettings => {
      const updated = settingsStore.set(key, value)

      // Broadcast change to all windows
      for (const win of getAllWindows()) {
        win.webContents.send(IPC.SETTINGS_CHANGED, updated)
      }

      return updated
    }
  )

  ipcMain.handle(
    IPC.SETTINGS_FETCH_MODELS,
    async (_event, apiKey: string): Promise<{ models?: OpenRouterModel[]; error?: string }> => {
      try {
        const models = await fetchModels(apiKey)
        return { models }
      } catch (err) {
        return { error: (err as Error).message }
      }
    }
  )
}
