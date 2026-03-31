import { app, BrowserWindow, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { setupIPC, sendSelectedText, sendPermissionStatus, sendWindowReset } from './ipc'
import { setupSettingsIPC } from './settings-ipc'
import { createSettingsStore } from './settings-store'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { initContextBridge, captureViaClipboard, captureViaAccessibility, getSourceAppPid, checkAccessibilityPermission } from './context-bridge'
import type { NativeContextBridge } from './context-bridge'

let promptWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tray: Tray | null = null

const settingsStore = createSettingsStore()

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

function getAllWindows(): BrowserWindow[] {
  const windows: BrowserWindow[] = []
  if (promptWindow && !promptWindow.isDestroyed()) windows.push(promptWindow)
  if (settingsWindow && !settingsWindow.isDestroyed()) windows.push(settingsWindow)
  return windows
}

let blurGuard = false

function createPromptWindow(): BrowserWindow {
  const settings = settingsStore.getAll()

  const window = new BrowserWindow({
    width: settings.promptWindowWidth,
    height: 80,
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
    if (!blurGuard && settingsStore.get('hideOnBlur')) {
      window.hide()
    }
  })

  return window
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 500,
    title: 'Context AI — Settings',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/settings.js'),
      sandbox: false
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings/')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  // Show dock icon while settings is open
  if (process.platform === 'darwin') {
    app.dock.show()
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
    if (process.platform === 'darwin') {
      app.dock.hide()
    }
  })
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

  // Capture text while source app is still focused
  const sourcePid = getSourceAppPid()

  // Try AX API first (instant for most apps)
  let text = captureViaAccessibility(sourcePid)
  let method: 'accessibility' | 'clipboard' = 'accessibility'

  // Fall back to clipboard if AX returned nothing
  if (!text) {
    text = await captureViaClipboard()
    method = 'clipboard'
  }

  // Now show window
  blurGuard = true
  sendWindowReset(promptWindow)

  promptWindow.setVisibleOnAllWorkspaces(true, { skipTransformProcessType: true })
  promptWindow.show()
  promptWindow.focus()
  setTimeout(() => {
    promptWindow?.setVisibleOnAllWorkspaces(false, { skipTransformProcessType: true })
    blurGuard = false
  }, 100)

  checkAndSendPermissionStatus(false)

  if (text) {
    sendSelectedText(promptWindow, text, method)
  }
}

function registerCurrentHotkey(): void {
  const hotkey = settingsStore.get('hotkey')
  const success = registerHotkey(hotkey, () => {
    onHotkeyPressed()
  })
  if (!success) {
    console.error(`Failed to register global hotkey ${hotkey}`)
  }
}

app.whenReady().then(() => {
  initContextBridge(loadNativeAddon())

  promptWindow = createPromptWindow()
  setupIPC(promptWindow, settingsStore)

  // Build a patched store that triggers side effects when settings change
  const patchedStore = {
    ...settingsStore,
    set<K extends keyof import('../shared/settings-types').AppSettings>(
      key: K,
      value: import('../shared/settings-types').AppSettings[K]
    ) {
      const result = settingsStore.set(key, value)

      if (key === 'hotkey') {
        unregisterHotkey()
        registerCurrentHotkey()
      }

      if (key === 'launchAtStartup') {
        app.setLoginItemSettings({ openAtLogin: value as boolean })
      }

      if (key === 'promptWindowWidth' && promptWindow && !promptWindow.isDestroyed()) {
        const bounds = promptWindow.getBounds()
        promptWindow.setBounds({ ...bounds, width: value as number })
      }

      return result
    },
  }

  setupSettingsIPC(patchedStore, getAllWindows)

  // Hide dock icon on macOS — this is a tray app
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  // Create tray icon — use Template naming convention for macOS auto-colorization
  const trayIcon = nativeImage.createFromPath(getTrayIconPath())
  trayIcon.setTemplateImage(true)
  tray = new Tray(trayIcon)
  tray.setToolTip('Context AI')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Context AI', click: () => onHotkeyPressed() },
    { label: 'Settings', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]))

  // Check permission on startup with prompt — window is hidden so dialog won't be covered
  checkAndSendPermissionStatus(true)

  promptWindow.webContents.on('did-finish-load', () => {
    checkAndSendPermissionStatus(false)
  })

  registerCurrentHotkey()

  // Apply launch-at-startup setting
  const launchSetting = settingsStore.get('launchAtStartup')
  app.setLoginItemSettings({ openAtLogin: launchSetting })
})

app.on('will-quit', () => {
  unregisterHotkey()
})

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
})
