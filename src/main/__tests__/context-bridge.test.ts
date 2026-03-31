import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn(() => ''),
    writeText: vi.fn(),
    clear: vi.fn()
  }
}))

import { clipboard } from 'electron'
import {
  initContextBridge,
  captureViaClipboard,
  captureViaAccessibility,
  checkAccessibilityPermission,
  type NativeContextBridge
} from '../context-bridge'

function createMockNative(
  overrides: Partial<NativeContextBridge> = {}
): NativeContextBridge {
  return {
    getFrontmostAppPid: vi.fn(() => 123),
    getSelectedTextViaAccessibility: vi.fn(() => null),
    simulateCopy: vi.fn(),
    isAccessibilityGranted: vi.fn(() => true),
    ...overrides
  }
}

describe('context-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initContextBridge(null)
  })

  describe('captureViaAccessibility', () => {
    it('returns text when accessibility API has selected text', () => {
      initContextBridge(
        createMockNative({ getSelectedTextViaAccessibility: vi.fn(() => 'hello world') })
      )
      expect(captureViaAccessibility(123)).toBe('hello world')
    })

    it('returns null when accessibility returns empty', () => {
      initContextBridge(createMockNative())
      expect(captureViaAccessibility(123)).toBeNull()
    })

    it('returns null when no native addon', () => {
      expect(captureViaAccessibility(123)).toBeNull()
    })
  })

  describe('captureViaClipboard', () => {
    it('captures text via simulated copy', async () => {
      const mock = createMockNative()
      initContextBridge(mock)

      vi.mocked(clipboard.readText)
        .mockReturnValueOnce('original clipboard')
        .mockReturnValueOnce('captured via copy')

      const result = await captureViaClipboard()

      expect(mock.simulateCopy).toHaveBeenCalled()
      expect(clipboard.clear).toHaveBeenCalled()
      expect(clipboard.writeText).toHaveBeenCalledWith('original clipboard')
      expect(result).toBe('captured via copy')
    })

    it('restores clipboard and returns null when nothing captured', async () => {
      initContextBridge(createMockNative())

      vi.mocked(clipboard.readText)
        .mockReturnValueOnce('saved')
        .mockReturnValueOnce('')

      const result = await captureViaClipboard()

      expect(clipboard.writeText).toHaveBeenCalledWith('saved')
      expect(result).toBeNull()
    })

    it('returns null when no native addon', async () => {
      const result = await captureViaClipboard()
      expect(result).toBeNull()
      expect(clipboard.clear).not.toHaveBeenCalled()
    })
  })

  describe('checkAccessibilityPermission', () => {
    it('returns true when native reports granted', () => {
      initContextBridge(
        createMockNative({ isAccessibilityGranted: vi.fn(() => true) })
      )
      expect(checkAccessibilityPermission()).toBe(true)
    })

    it('returns false when native reports not granted', () => {
      initContextBridge(
        createMockNative({ isAccessibilityGranted: vi.fn(() => false) })
      )
      expect(checkAccessibilityPermission()).toBe(false)
    })

    it('returns false when no native addon', () => {
      expect(checkAccessibilityPermission()).toBe(false)
    })
  })
})
