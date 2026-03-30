import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIPC } from './ipc'
import { registerHotkey, unregisterHotkey } from './hotkey'

let promptWindow: BrowserWindow | null = null

function createPromptWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.on('blur', () => {
    window.hide()
  })

  return window
}

function togglePromptWindow(): void {
  if (!promptWindow) return

  if (promptWindow.isVisible()) {
    promptWindow.hide()
  } else {
    promptWindow.show()
    promptWindow.focus()
  }
}

app.whenReady().then(() => {
  promptWindow = createPromptWindow()
  setupIPC(promptWindow)

  const success = registerHotkey('CmdOrCtrl+Shift+Space', togglePromptWindow)
  if (!success) {
    console.error('Failed to register global hotkey CmdOrCtrl+Shift+Space')
  }
})

app.on('will-quit', () => {
  unregisterHotkey()
})

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
})
