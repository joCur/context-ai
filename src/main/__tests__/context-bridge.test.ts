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
  getSelectedText,
  checkAccessibilityPermission,
  type NativeContextBridge
} from '../context-bridge'

function createMockNative(
  overrides: Partial<NativeContextBridge> = {}
): NativeContextBridge {
  return {
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

  describe('getSelectedText', () => {
    it('returns text via accessibility when available', async () => {
      const mock = createMockNative({
        getSelectedTextViaAccessibility: vi.fn(() => 'hello world')
      })
      initContextBridge(mock)

      const result = await getSelectedText()

      expect(result).toEqual({ text: 'hello world', method: 'accessibility' })
      expect(mock.simulateCopy).not.toHaveBeenCalled()
      expect(clipboard.clear).not.toHaveBeenCalled()
    })

    it('falls back to clipboard when accessibility returns null', async () => {
      const mock = createMockNative()
      initContextBridge(mock)

      vi.mocked(clipboard.readText)
        .mockReturnValueOnce('original clipboard')
        .mockReturnValueOnce('captured via copy')

      const result = await getSelectedText()

      expect(mock.simulateCopy).toHaveBeenCalled()
      expect(clipboard.clear).toHaveBeenCalled()
      expect(clipboard.writeText).toHaveBeenCalledWith('original clipboard')
      expect(result).toEqual({ text: 'captured via copy', method: 'clipboard' })
    })

    it('restores clipboard and returns null when fallback captures nothing', async () => {
      const mock = createMockNative()
      initContextBridge(mock)

      vi.mocked(clipboard.readText)
        .mockReturnValueOnce('saved')
        .mockReturnValueOnce('')

      const result = await getSelectedText()

      expect(clipboard.writeText).toHaveBeenCalledWith('saved')
      expect(result).toBeNull()
    })

    it('returns null when no native addon is loaded', async () => {
      initContextBridge(null)

      const result = await getSelectedText()

      expect(result).toBeNull()
      expect(clipboard.clear).not.toHaveBeenCalled()
    })

    it('skips empty accessibility text and tries clipboard', async () => {
      const mock = createMockNative({
        getSelectedTextViaAccessibility: vi.fn(() => '')
      })
      initContextBridge(mock)

      vi.mocked(clipboard.readText)
        .mockReturnValueOnce('')
        .mockReturnValueOnce('from clipboard')

      const result = await getSelectedText()

      expect(mock.simulateCopy).toHaveBeenCalled()
      expect(result).toEqual({ text: 'from clipboard', method: 'clipboard' })
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

    it('returns false when no native addon is loaded', () => {
      initContextBridge(null)
      expect(checkAccessibilityPermission()).toBe(false)
    })
  })
})
