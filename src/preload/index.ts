import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction,
  PermissionStatus
} from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'

const api = {
  onSelectedText(callback: (data: SelectedText) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: SelectedText): void =>
      callback(data)
    ipcRenderer.on(IPC.SELECTED_TEXT, handler)
    return () => ipcRenderer.removeListener(IPC.SELECTED_TEXT, handler)
  },

  submitPrompt(submission: PromptSubmission): void {
    ipcRenderer.send(IPC.PROMPT_SUBMIT, submission)
  },

  onStreamToken(callback: (data: StreamToken) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: StreamToken): void =>
      callback(data)
    ipcRenderer.on(IPC.STREAM_TOKEN, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_TOKEN, handler)
  },

  onStreamDone(callback: () => void): () => void {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.STREAM_DONE, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_DONE, handler)
  },

  onStreamError(callback: (error: StreamError) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, error: StreamError): void =>
      callback(error)
    ipcRenderer.on(IPC.STREAM_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_ERROR, handler)
  },

  executeOutputAction(action: OutputAction, responseText?: string): void {
    ipcRenderer.send(IPC.OUTPUT_ACTION, action, responseText)
  },

  onPermissionStatus(callback: (status: PermissionStatus) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, status: PermissionStatus): void =>
      callback(status)
    ipcRenderer.on(IPC.PERMISSION_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.PERMISSION_STATUS, handler)
  },

  requestAccessibilityPermission(): void {
    ipcRenderer.send(IPC.PERMISSION_REQUEST)
  },

  onWindowReset(callback: () => void): () => void {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.WINDOW_RESET, handler)
    return () => ipcRenderer.removeListener(IPC.WINDOW_RESET, handler)
  },

  resizeWindow(height: number): void {
    ipcRenderer.send(IPC.WINDOW_RESIZE, height)
  },

  dismiss(): void {
    ipcRenderer.send(IPC.WINDOW_DISMISS)
  },

  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_GET)
  },

  onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: AppSettings): void =>
      callback(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler)
  },

  openSettings(tab?: string): void {
    ipcRenderer.send(IPC.WINDOW_OPEN_SETTINGS, tab)
  },
}

contextBridge.exposeInMainWorld('api', api)
