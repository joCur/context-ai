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

// Clipboard capture — must run while source app is still focused
export async function captureViaClipboard(): Promise<string | null> {
  if (!native) return null

  const saved = clipboard.readText()
  clipboard.clear()

  native.simulateCopy()

  await new Promise((resolve) => setTimeout(resolve, CLIPBOARD_DELAY_MS))

  const captured = clipboard.readText()
  clipboard.writeText(saved)

  return (captured && captured.length > 0) ? captured : null
}

// Accessibility API capture — can run after window is shown (uses PID)
export function captureViaAccessibility(pid: number): string | null {
  if (!native) return null
  const text = native.getSelectedTextViaAccessibility(pid || undefined)
  return (text && text.length > 0) ? text : null
}

export function checkAccessibilityPermission(prompt = false): boolean {
  return native?.isAccessibilityGranted(prompt) ?? false
}
