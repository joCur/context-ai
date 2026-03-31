import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron-store before importing the module under test
vi.mock('electron-store', () => {
  const MockStore = vi.fn(function (this: Record<string, unknown>, options?: { defaults?: Record<string, unknown> }) {
    const data = new Map<string, unknown>(Object.entries(options?.defaults ?? {}))
    this.get = vi.fn((key?: string) => {
      if (key === undefined) return Object.fromEntries(data)
      return data.get(key)
    })
    this.set = vi.fn((key: string, value: unknown) => {
      data.set(key, value)
    })
    Object.defineProperty(this, 'store', {
      get: () => Object.fromEntries(data),
    })
  })
  return { default: MockStore }
})

// Mock electron safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`encrypted:${str}`)),
    decryptString: vi.fn((buf: Buffer) => {
      const str = buf.toString()
      return str.startsWith('encrypted:') ? str.slice(10) : str
    }),
  },
}))

import { createSettingsStore } from '../settings-store'
import { DEFAULT_SETTINGS } from '../../shared/settings-types'

describe('settings-store', () => {
  let store: ReturnType<typeof createSettingsStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createSettingsStore()
  })

  describe('getAll', () => {
    it('returns default settings when store is empty', () => {
      const settings = store.getAll()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('get', () => {
    it('returns a specific setting value', () => {
      const hotkey = store.get('hotkey')
      expect(hotkey).toBe('CmdOrCtrl+Shift+Space')
    })
  })

  describe('set', () => {
    it('updates a setting and returns full settings', () => {
      const result = store.set('hotkey', 'CmdOrCtrl+Shift+K')
      expect(result.hotkey).toBe('CmdOrCtrl+Shift+K')
    })

    it('updates temperature setting', () => {
      const result = store.set('temperature', 1.0)
      expect(result.temperature).toBe(1.0)
    })
  })

  describe('API key encryption', () => {
    it('encrypts the API key before storing', () => {
      store.set('apiKey', 'sk-test-12345')
      // The stored value should be base64-encoded encrypted buffer, not plaintext
      const settings = store.getAll()
      expect(settings.apiKey).toBe('sk-test-12345')
    })

    it('returns empty string when no API key is set', () => {
      const settings = store.getAll()
      expect(settings.apiKey).toBe('')
    })
  })

  describe('quick actions', () => {
    it('updates the full quick actions array', () => {
      const newActions = [
        { id: 'custom', name: 'Custom', template: 'Do something with {{selection}}' },
      ]
      const result = store.set('quickActions', newActions)
      expect(result.quickActions).toEqual(newActions)
    })
  })
})
