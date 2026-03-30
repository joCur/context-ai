import { ipcMain, systemPreferences, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'

export function setupIPC(promptWindow: BrowserWindow): void {
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    // Handled in M5 (OpenRouter integration)
    console.log('[ipc] prompt submitted:', submission.prompt)
  })

  ipcMain.on(IPC.OUTPUT_ACTION, (_event, action: OutputAction) => {
    // Handled in M3 (Prompt Window output actions)
    console.log('[ipc] output action:', action)
  })

  ipcMain.on(IPC.PERMISSION_REQUEST, () => {
    if (process.platform === 'darwin') {
      systemPreferences.isTrustedAccessibilityClient(true)
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
