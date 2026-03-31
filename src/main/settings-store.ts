import ElectronStore from 'electron-store'
const Store = (ElectronStore as any).default || ElectronStore
import { safeStorage } from 'electron'
import { DEFAULT_SETTINGS, type AppSettings } from '../shared/settings-types'

export interface SettingsStore {
  getAll(): AppSettings
  get<K extends keyof AppSettings>(key: K): AppSettings[K]
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings
}

export function createSettingsStore(): SettingsStore {
  const store = new Store<Omit<AppSettings, 'apiKey'> & { encryptedApiKey: string }>({
    defaults: {
      ...(() => {
        const { apiKey: _, ...rest } = DEFAULT_SETTINGS
        return rest
      })(),
      encryptedApiKey: '',
    },
  })

  function encryptApiKey(plaintext: string): string {
    if (!plaintext) return ''
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plaintext)
      return encrypted.toString('base64')
    }
    // Fallback: store as-is if encryption not available (dev mode)
    return plaintext
  }

  function decryptApiKey(stored: string): string {
    if (!stored) return ''
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(stored, 'base64')
        return safeStorage.decryptString(buffer)
      } catch {
        return ''
      }
    }
    return stored
  }

  function getAll(): AppSettings {
    const { encryptedApiKey, ...rest } = store.store
    return {
      ...DEFAULT_SETTINGS,
      ...rest,
      apiKey: decryptApiKey(encryptedApiKey ?? ''),
    }
  }

  function get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    if (key === 'apiKey') {
      return decryptApiKey(store.get('encryptedApiKey') ?? '') as AppSettings[K]
    }
    const value = store.get(key as keyof typeof store.store)
    if (value === undefined) {
      return DEFAULT_SETTINGS[key]
    }
    return value as AppSettings[K]
  }

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
    if (key === 'apiKey') {
      store.set('encryptedApiKey', encryptApiKey(value as string))
    } else {
      store.set(key as keyof typeof store.store, value as never)
    }
    return getAll()
  }

  return { getAll, get, set }
}
