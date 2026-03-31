import { ipcMain, clipboard, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'
import { checkAccessibilityPermission } from './context-bridge'

export function setupIPC(promptWindow: BrowserWindow): void {
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    // Mock streaming response until M5 (OpenRouter integration) is built
    const mockResponse = `Here's a response to your prompt.

This demonstrates **markdown rendering** with various elements:

- Bullet points work
- So does *italic* and **bold**

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

The selected context was: "${submission.context ?? 'none'}"`;

    const tokens = mockResponse.split(/(?<=[ \n])/);
    let i = 0;
    const interval = setInterval(() => {
      if (i < tokens.length) {
        sendStreamToken(promptWindow, tokens[i]);
        i++;
      } else {
        clearInterval(interval);
        sendStreamDone(promptWindow);
      }
    }, 30);
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

export function sendWindowReset(window: BrowserWindow): void {
  window.webContents.send(IPC.WINDOW_RESET)
}
