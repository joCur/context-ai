import { globalShortcut } from 'electron'

let currentAccelerator: string | null = null

export function registerHotkey(
  accelerator: string,
  callback: () => void
): boolean {
  unregisterHotkey()
  const success = globalShortcut.register(accelerator, callback)
  if (success) {
    currentAccelerator = accelerator
  }
  return success
}

export function unregisterHotkey(): void {
  if (currentAccelerator) {
    globalShortcut.unregister(currentAccelerator)
    currentAccelerator = null
  }
}

export function getCurrentAccelerator(): string | null {
  return currentAccelerator
}
