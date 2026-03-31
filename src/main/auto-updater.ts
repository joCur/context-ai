import ElectronUpdater from 'electron-updater'
const { autoUpdater } = (ElectronUpdater as any).default || ElectronUpdater
import { Notification } from 'electron'

export function setupAutoUpdater(): void {
  // Don't check for updates in dev mode
  if (process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    const notification = new Notification({
      title: 'Context AI Update Available',
      body: `Version ${info.version} is available. Click to download.`,
    })
    notification.on('click', () => {
      autoUpdater.downloadUpdate()
    })
    notification.show()
  })

  autoUpdater.on('update-downloaded', () => {
    const notification = new Notification({
      title: 'Context AI Update Ready',
      body: 'Update will be installed on next restart.',
    })
    notification.show()
  })

  autoUpdater.on('error', (err) => {
    console.error('[auto-updater] Error:', err.message)
  })

  // Check on launch
  autoUpdater.checkForUpdates().catch(() => {})

  // Check every 24 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 24 * 60 * 60 * 1000)
}
