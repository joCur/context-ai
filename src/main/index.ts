import { app, BrowserWindow, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { setupIPC, sendSelectedText, sendPermissionStatus, sendWindowReset } from './ipc'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { initContextBridge, getSelectedText, getSourceAppPid, checkAccessibilityPermission } from './context-bridge'
import type { NativeContextBridge } from './context-bridge'

let promptWindow: BrowserWindow | null = null
let tray: Tray | null = null

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'trayTemplate.png')
  }
  return join(__dirname, '../../resources/trayTemplate.png')
}

function getIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.png')
  }
  return join(__dirname, '../../resources/icon.png')
}

function loadNativeAddon(): NativeContextBridge | null {
  try {
    const addonPath = join(
      app.getAppPath(),
      'native',
      'build',
      'Release',
      'context_bridge.node'
    )
    return require(addonPath)
  } catch (err) {
    console.warn('[context-bridge] Native addon not available:', (err as Error).message)
    return null
  }
}

let blurGuard = false

function createPromptWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 560,
    height: 600,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
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
    if (!blurGuard) {
      window.hide()
    }
  })

  return window
}

function checkAndSendPermissionStatus(prompt: boolean): void {
  if (!promptWindow) return
  if (process.platform !== 'darwin') {
    sendPermissionStatus(promptWindow, true)
    return
  }
  const granted = checkAccessibilityPermission(prompt)
  sendPermissionStatus(promptWindow, granted)
}

async function onHotkeyPressed(): Promise<void> {
  if (!promptWindow) return

  // Grab source app PID instantly (< 1ms), then show window
  const sourcePid = getSourceAppPid()

  blurGuard = true
  sendWindowReset(promptWindow)
  promptWindow.show()
  promptWindow.focus()
  setTimeout(() => { blurGuard = false }, 200)

  checkAndSendPermissionStatus(false)

  // Capture text using saved PID (works even after our window has focus)
  const result = await getSelectedText(sourcePid)
  if (result) {
    sendSelectedText(promptWindow, result.text, result.method)
  }
}

app.whenReady().then(() => {
  initContextBridge(loadNativeAddon())

  promptWindow = createPromptWindow()
  setupIPC(promptWindow)

  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(getIconPath())
    app.dock.setIcon(dockIcon)
  }

  // Create tray icon — use Template naming convention for macOS auto-colorization
  const trayIcon = nativeImage.createFromPath(getTrayIconPath())
  trayIcon.setTemplateImage(true)
  tray = new Tray(trayIcon)
  tray.setToolTip('Context AI')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Context AI', click: () => onHotkeyPressed() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]))

  // Check permission on startup with prompt — window is hidden so dialog won't be covered
  checkAndSendPermissionStatus(true)

  promptWindow.webContents.on('did-finish-load', () => {
    checkAndSendPermissionStatus(false)
  })

  const success = registerHotkey('CmdOrCtrl+Shift+Space', () => {
    onHotkeyPressed()
  })
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
