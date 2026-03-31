import { ipcMain, clipboard, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'
import { checkAccessibilityPermission } from './context-bridge'

export function setupIPC(promptWindow: BrowserWindow): void {
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    // Handled in M5 (OpenRouter integration)
    console.log('[ipc] prompt submitted:', submission.prompt)
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
