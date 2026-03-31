import { ipcMain, clipboard, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'
import { checkAccessibilityPermission } from './context-bridge'
import { buildChatRequest, streamChatCompletion } from './openrouter'
import type { SettingsStore } from './settings-store'

export function setupIPC(promptWindow: BrowserWindow, settingsStore: SettingsStore): void {
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    const settings = settingsStore.getAll()

    if (!settings.apiKey) {
      sendStreamError(promptWindow, 'No API key configured. Open Settings → AI Provider to add your OpenRouter API key.')
      return
    }

    if (!settings.model) {
      sendStreamError(promptWindow, 'No model selected. Open Settings → AI Provider to choose a model.')
      return
    }

    const request = buildChatRequest({
      prompt: submission.prompt,
      context: submission.context,
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    })

    streamChatCompletion(settings.apiKey, request, {
      onToken: (content) => sendStreamToken(promptWindow, content),
      onDone: () => sendStreamDone(promptWindow),
      onError: (message) => sendStreamError(promptWindow, message),
    })
  })

  ipcMain.on(IPC.OUTPUT_ACTION, (_event, action: OutputAction, responseText?: string) => {
    if (action === 'copy' && responseText) {
      clipboard.writeText(responseText)
      promptWindow.hide()
    } else if (action === 'replace' && responseText) {
      clipboard.writeText(responseText)
      promptWindow.hide()
    }
  })

  ipcMain.on(IPC.WINDOW_DISMISS, () => {
    promptWindow.hide()
  })

  ipcMain.on(IPC.WINDOW_RESIZE, (_event, height: number) => {
    const bounds = promptWindow.getBounds()
    const maxHeight = Math.round(require('electron').screen.getPrimaryDisplay().workAreaSize.height * 0.8)
    promptWindow.setBounds({ ...bounds, height: Math.min(height, maxHeight) })
  })

  ipcMain.on(IPC.PERMISSION_REQUEST, () => {
    if (process.platform === 'darwin') {
      promptWindow.hide()
      checkAccessibilityPermission(true)
    }
  })
}

export function sendSelectedText(
  window: BrowserWindow,
  text: string,
  method: 'accessibility' | 'clipboard'
): void {
  window.webContents.send(IPC.SELECTED_TEXT, { text, method })
}

export function sendStreamToken(window: BrowserWindow, content: string): void {
  window.webContents.send(IPC.STREAM_TOKEN, { content })
}

export function sendStreamDone(window: BrowserWindow): void {
  window.webContents.send(IPC.STREAM_DONE)
}

export function sendStreamError(window: BrowserWindow, message: string): void {
  window.webContents.send(IPC.STREAM_ERROR, { message })
}

export function sendPermissionStatus(window: BrowserWindow, accessibility: boolean): void {
  window.webContents.send(IPC.PERMISSION_STATUS, { accessibility })
}

export function sendWindowReset(window: BrowserWindow): void {
  window.webContents.send(IPC.WINDOW_RESET)
}
