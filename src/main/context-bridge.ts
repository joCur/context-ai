import { clipboard } from 'electron'
import type { SelectedText } from '../shared/ipc'

export interface NativeContextBridge {
  getFrontmostAppPid(): number
  getSelectedTextViaAccessibility(pid?: number): string | null
  simulateCopy(): void
  isAccessibilityGranted(prompt?: boolean): boolean
}

let native: NativeContextBridge | null = null

const CLIPBOARD_DELAY_MS = 150

export function initContextBridge(addon: NativeContextBridge | null): void {
  native = addon
}

export function getSourceAppPid(): number {
  return native?.getFrontmostAppPid() ?? 0
}

export async function getSelectedText(pid = 0): Promise<SelectedText | null> {
  if (!native) return null

  const text = native.getSelectedTextViaAccessibility(pid || undefined)
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

export function checkAccessibilityPermission(prompt = false): boolean {
  return native?.isAccessibilityGranted(prompt) ?? false
}
