import { clipboard } from 'electron'
import type { SelectedText } from '../shared/ipc'

export interface NativeContextBridge {
  getSelectedTextViaAccessibility(): string | null
  simulateCopy(): void
  isAccessibilityGranted(): boolean
}

let native: NativeContextBridge | null = null

const CLIPBOARD_DELAY_MS = 150

export function initContextBridge(addon: NativeContextBridge | null): void {
  native = addon
}

export async function getSelectedText(): Promise<SelectedText | null> {
  if (!native) return null

  const text = native.getSelectedTextViaAccessibility()
  if (text && text.length > 0) {
    return { text, method: 'accessibility' }
  }

  const saved = clipboard.readText()
  clipboard.clear()

  native.simulateCopy()

  await new Promise((resolve) => setTimeout(resolve, CLIPBOARD_DELAY_MS))

  const captured = clipboard.readText()
  clipboard.writeText(saved)

  if (captured && captured.length > 0) {
    return { text: captured, method: 'clipboard' }
  }

  return null
}

export function checkAccessibilityPermission(): boolean {
  return native?.isAccessibilityGranted() ?? false
}
