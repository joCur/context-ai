import { app, BrowserWindow } from 'electron'
import { join } from 'path'

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

  return window
}

app.whenReady().then(() => {
  promptWindow = createPromptWindow()
  promptWindow.show()
})

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
})
