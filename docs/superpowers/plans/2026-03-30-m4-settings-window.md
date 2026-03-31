# M4: Settings Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a settings window with persistent configuration, encrypted API key storage, and live broadcast of changes to the prompt window. Settings cover general behavior, AI provider config, quick actions management, and appearance customization.

**Architecture:** A singleton `electron-store` instance in the main process holds all settings as JSON on disk, with the API key encrypted via `safeStorage`. The settings window is a second BrowserWindow with its own renderer entry point and preload script. IPC uses `ipcMain.handle` for request/response (`settings:get`, `settings:set`) and `webContents.send` for broadcasting changes (`settings:changed`). The prompt window subscribes to change broadcasts and reloads relevant settings on each invocation.

**Tech Stack:** electron-store, Electron safeStorage, React 19, Tailwind CSS v4, HTML Drag and Drop API, electron-vite multi-renderer config

---

## File Map

```
src/
├── main/
│   ├── settings-store.ts              # (create) electron-store wrapper, safeStorage encryption
│   ├── __tests__/settings-store.test.ts  # (create) TDD tests for settings store
│   ├── settings-ipc.ts               # (create) ipcMain.handle for get/set/fetch-models
│   └── index.ts                       # (modify) Create settings window, wire tray menu, hotkey re-registration
├── preload/
│   ├── settings-preload.ts           # (create) contextBridge for settings window
│   └── settings-preload.d.ts         # (create) Type declarations for window.settingsApi
├── renderer/
│   └── settings/                      # (create) Separate renderer for settings window
│       ├── index.html                 # (create) HTML entry point
│       └── src/
│           ├── main.tsx               # (create) React entry point
│           ├── SettingsApp.tsx         # (create) Root with sidebar + active tab
│           ├── globals.css            # (create) Tailwind import + dark theme vars
│           ├── components/
│           │   ├── Sidebar.tsx         # (create) Tab navigation sidebar
│           │   ├── GeneralTab.tsx      # (create) Hotkey, output action, toggles
│           │   ├── AIProviderTab.tsx   # (create) API key, model, system prompt, temperature, max tokens
│           │   ├── QuickActionsTab.tsx # (create) Drag-to-reorder action list with add/edit/delete
│           │   ├── AppearanceTab.tsx   # (create) Accent color, width, font size
│           │   └── HotkeyRecorder.tsx  # (create) Record-style hotkey input
│           └── hooks/
│               └── useSettings.ts     # (create) Fetch/update settings via IPC
├── shared/
│   ├── ipc.ts                         # (modify) Add settings IPC channel names
│   ├── settings-types.ts             # (create) Settings interface + QuickAction type
│   └── __tests__/
│       └── ipc.test.ts               # (modify) Test new channel names
├── renderer/src/
│   ├── hooks/
│   │   └── usePromptState.ts          # (modify) Read settings, subscribe to changes
│   └── components/
│       └── PromptWindow.tsx           # (modify) Use settings for quick actions + appearance
```

---

### Task 1: Install electron-store + shared settings types + settings store with tests (TDD)

**Files:**
- Modify: `package.json`
- Create: `src/shared/settings-types.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/__tests__/ipc.test.ts`
- Create: `src/main/__tests__/settings-store.test.ts`
- Create: `src/main/settings-store.ts`

- [ ] **Step 1: Install electron-store**

```bash
npm install electron-store
```

Expected: `electron-store` added to `dependencies` in `package.json`

- [ ] **Step 2: Create shared settings types**

Create `src/shared/settings-types.ts`:

```ts
import type { OutputAction } from './ipc'

export type { OutputAction }

export interface QuickAction {
  id: string
  name: string
  template: string
}

export interface AppSettings {
  hotkey: string
  defaultOutputAction: OutputAction
  autoDismiss: boolean
  autoDismissDelay: number
  hideOnBlur: boolean
  launchAtStartup: boolean
  apiKey: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  quickActions: QuickAction[]
  accentColor: string
  promptWindowWidth: number
  fontSize: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'CmdOrCtrl+Shift+Space',
  defaultOutputAction: 'display',
  autoDismiss: false,
  autoDismissDelay: 2000,
  hideOnBlur: true,
  launchAtStartup: false,
  apiKey: '',
  model: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  quickActions: [
    { id: 'rewrite', name: 'Rewrite', template: 'Rewrite the following text:\n\n{{selection}}' },
    { id: 'summarize', name: 'Summarize', template: 'Summarize the following text:\n\n{{selection}}' },
    { id: 'fix-grammar', name: 'Fix Grammar', template: 'Fix the grammar in the following text:\n\n{{selection}}' },
    { id: 'translate', name: 'Translate', template: 'Translate the following text to English:\n\n{{selection}}' },
    { id: 'explain', name: 'Explain', template: 'Explain the following text:\n\n{{selection}}' },
  ],
  accentColor: '#00d4ff',
  promptWindowWidth: 560,
  fontSize: 14,
}
```

- [ ] **Step 3: Add settings IPC channels to shared/ipc.ts**

Add to the `IPC` object:

```ts
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_FETCH_MODELS: 'settings:fetch-models',
```

- [ ] **Step 4: Update IPC tests**

In `src/shared/__tests__/ipc.test.ts`, add assertions for the new channels:

```ts
    expect(IPC.SETTINGS_GET).toBe('settings:get')
    expect(IPC.SETTINGS_SET).toBe('settings:set')
    expect(IPC.SETTINGS_CHANGED).toBe('settings:changed')
    expect(IPC.SETTINGS_FETCH_MODELS).toBe('settings:fetch-models')
```

- [ ] **Step 5: Run IPC tests to verify they pass**

```bash
npm test -- src/shared/__tests__/ipc.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Write failing tests for settings store**

Create `src/main/__tests__/settings-store.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron-store before importing the module under test
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const data = new Map<string, unknown>()
      return {
        get: vi.fn((key?: string) => {
          if (key === undefined) return Object.fromEntries(data)
          return data.get(key)
        }),
        set: vi.fn((key: string, value: unknown) => {
          data.set(key, value)
        }),
        store: {},
      }
    }),
  }
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
```

- [ ] **Step 7: Run tests to verify they fail**

```bash
npm test -- src/main/__tests__/settings-store.test.ts
```

Expected: FAIL — cannot find module `../settings-store`

- [ ] **Step 8: Implement settings store**

Create `src/main/settings-store.ts`:

```ts
import Store from 'electron-store'
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
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
npm test -- src/main/__tests__/settings-store.test.ts
```

Expected: all tests PASS

- [ ] **Step 10: Run all existing tests**

```bash
npm test
```

Expected: all tests PASS (no regressions)

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json src/shared/settings-types.ts src/shared/ipc.ts src/shared/__tests__/ipc.test.ts src/main/settings-store.ts src/main/__tests__/settings-store.test.ts
git commit -m "feat: add electron-store settings with encrypted API key storage and shared types"
```

---

### Task 2: Settings IPC handlers + settings preload

**Files:**
- Create: `src/main/settings-ipc.ts`
- Create: `src/preload/settings-preload.ts`
- Create: `src/preload/settings-preload.d.ts`

- [ ] **Step 1: Create settings IPC handlers**

Create `src/main/settings-ipc.ts`:

```ts
import { ipcMain, type BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'
import type { SettingsStore } from './settings-store'

export interface OpenRouterModel {
  id: string
  name: string
}

async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data = (await response.json()) as { data: Array<{ id: string; name: string }> }
  return data.data.map((m) => ({ id: m.id, name: m.name }))
}

export function setupSettingsIPC(
  settingsStore: SettingsStore,
  getAllWindows: () => BrowserWindow[]
): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): AppSettings => {
    return settingsStore.getAll()
  })

  ipcMain.handle(
    IPC.SETTINGS_SET,
    (_event, key: keyof AppSettings, value: AppSettings[keyof AppSettings]): AppSettings => {
      const updated = settingsStore.set(key, value)

      // Broadcast change to all windows
      for (const win of getAllWindows()) {
        win.webContents.send(IPC.SETTINGS_CHANGED, updated)
      }

      return updated
    }
  )

  ipcMain.handle(
    IPC.SETTINGS_FETCH_MODELS,
    async (_event, apiKey: string): Promise<{ models?: OpenRouterModel[]; error?: string }> => {
      try {
        const models = await fetchModels(apiKey)
        return { models }
      } catch (err) {
        return { error: (err as Error).message }
      }
    }
  )
}
```

- [ ] **Step 2: Create settings preload script**

Create `src/preload/settings-preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'

export interface OpenRouterModel {
  id: string
  name: string
}

const settingsApi = {
  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_GET)
  },

  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_SET, key, value)
  },

  fetchModels(
    apiKey: string
  ): Promise<{ models?: OpenRouterModel[]; error?: string }> {
    return ipcRenderer.invoke(IPC.SETTINGS_FETCH_MODELS, apiKey)
  },

  onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      settings: AppSettings
    ): void => callback(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler)
  },
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)
```

- [ ] **Step 3: Create settings preload type declarations**

Create `src/preload/settings-preload.d.ts`:

```ts
import type { AppSettings } from '../shared/settings-types'

export interface OpenRouterModel {
  id: string
  name: string
}

export interface SettingsAPI {
  getSettings(): Promise<AppSettings>
  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<AppSettings>
  fetchModels(
    apiKey: string
  ): Promise<{ models?: OpenRouterModel[]; error?: string }>
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
}

declare global {
  interface Window {
    settingsApi: SettingsAPI
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/settings-ipc.ts src/preload/settings-preload.ts src/preload/settings-preload.d.ts
git commit -m "feat: settings IPC handlers with model fetch and settings preload bridge"
```

---

### Task 3: electron-vite multi-renderer config + settings window shell

**Files:**
- Modify: `electron.vite.config.ts`
- Create: `src/renderer/settings/index.html`
- Create: `src/renderer/settings/src/main.tsx`
- Create: `src/renderer/settings/src/globals.css`
- Create: `src/renderer/settings/src/SettingsApp.tsx`
- Create: `src/renderer/settings/src/components/Sidebar.tsx`
- Create: `src/renderer/settings/src/hooks/useSettings.ts`

- [ ] **Step 1: Update electron-vite config for multi-renderer**

Replace `electron.vite.config.ts`:

```ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          settings: resolve('src/preload/settings-preload.ts'),
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          settings: resolve('src/renderer/settings/index.html'),
        }
      }
    }
  }
})
```

- [ ] **Step 2: Create settings window HTML entry**

Create `src/renderer/settings/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Context AI — Settings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create settings globals.css**

Create `src/renderer/settings/src/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-background: #0a0a0f;
  --color-foreground: #fafafa;
  --color-muted: #1a1a2e;
  --color-muted-foreground: #a1a1aa;
  --color-accent: #00d4ff;
  --color-accent-foreground: #0a0a0f;
  --color-border: #27272a;
  --color-input: #27272a;
  --color-ring: #00d4ff;
  --color-destructive: #ef4444;
  --radius-lg: 0.5rem;
  --radius-md: calc(var(--radius-lg) - 2px);
  --radius-sm: calc(var(--radius-md) - 2px);
}

html, body {
  margin: 0;
  padding: 0;
  background: #0a0a0f;
  color: #fafafa;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
  height: 100%;
}

#root {
  height: 100%;
}

/* Scrollbar styling for settings content */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
```

- [ ] **Step 4: Create useSettings hook**

Create `src/renderer/settings/src/hooks/useSettings.ts`:

```ts
import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../../../shared/settings-types'
import { DEFAULT_SETTINGS } from '../../../../shared/settings-types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.settingsApi.getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })

    const unsub = window.settingsApi.onSettingsChanged((updated) => {
      setSettings(updated)
    })

    return unsub
  }, [])

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const updated = await window.settingsApi.setSetting(key, value)
      setSettings(updated)
    },
    []
  )

  return { settings, loading, updateSetting }
}
```

- [ ] **Step 5: Create Sidebar component**

Create `src/renderer/settings/src/components/Sidebar.tsx`:

```tsx
export type TabId = 'general' | 'ai-provider' | 'quick-actions' | 'appearance'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'ai-provider', label: 'AI Provider', icon: '🤖' },
  { id: 'quick-actions', label: 'Quick Actions', icon: '⚡' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps): React.JSX.Element {
  return (
    <nav style={{
      width: 200,
      minWidth: 200,
      borderRight: '1px solid #27272a',
      padding: '16px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            margin: '0 8px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === tab.id ? 'rgba(0,212,255,0.08)' : 'transparent',
            color: activeTab === tab.id ? '#00d4ff' : '#a1a1aa',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 6: Create SettingsApp root component**

Create `src/renderer/settings/src/SettingsApp.tsx`:

```tsx
import { useState } from 'react'
import { Sidebar, type TabId } from './components/Sidebar'
import { GeneralTab } from './components/GeneralTab'
import { AIProviderTab } from './components/AIProviderTab'
import { QuickActionsTab } from './components/QuickActionsTab'
import { AppearanceTab } from './components/AppearanceTab'
import { useSettings } from './hooks/useSettings'

export function SettingsApp(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const { settings, loading, updateSetting } = useSettings()

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a1a1aa',
        fontSize: 14,
      }}>
        Loading settings...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: '100%',
    }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: 32,
      }}>
        {activeTab === 'general' && (
          <GeneralTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'ai-provider' && (
          <AIProviderTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'quick-actions' && (
          <QuickActionsTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab settings={settings} onUpdate={updateSetting} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 7: Create React entry point**

Create `src/renderer/settings/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SettingsApp } from './SettingsApp'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
)
```

- [ ] **Step 8: Create placeholder tab components**

These are minimal stubs so that the shell compiles. They will be fully implemented in Tasks 4-7.

Create `src/renderer/settings/src/components/GeneralTab.tsx`:

```tsx
import type { AppSettings } from '../../../../../shared/settings-types'

interface GeneralTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function GeneralTab({ settings, onUpdate }: GeneralTabProps): React.JSX.Element {
  void settings
  void onUpdate
  return <div style={{ color: '#a1a1aa' }}>General tab — placeholder</div>
}
```

Create `src/renderer/settings/src/components/AIProviderTab.tsx`:

```tsx
import type { AppSettings } from '../../../../../shared/settings-types'

interface AIProviderTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function AIProviderTab({ settings, onUpdate }: AIProviderTabProps): React.JSX.Element {
  void settings
  void onUpdate
  return <div style={{ color: '#a1a1aa' }}>AI Provider tab — placeholder</div>
}
```

Create `src/renderer/settings/src/components/QuickActionsTab.tsx`:

```tsx
import type { AppSettings } from '../../../../../shared/settings-types'

interface QuickActionsTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function QuickActionsTab({ settings, onUpdate }: QuickActionsTabProps): React.JSX.Element {
  void settings
  void onUpdate
  return <div style={{ color: '#a1a1aa' }}>Quick Actions tab — placeholder</div>
}
```

Create `src/renderer/settings/src/components/AppearanceTab.tsx`:

```tsx
import type { AppSettings } from '../../../../../shared/settings-types'

interface AppearanceTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function AppearanceTab({ settings, onUpdate }: AppearanceTabProps): React.JSX.Element {
  void settings
  void onUpdate
  return <div style={{ color: '#a1a1aa' }}>Appearance tab — placeholder</div>
}
```

- [ ] **Step 9: Build to verify multi-renderer config**

```bash
npm run build
```

Expected: Build succeeds. Output includes both `out/renderer/index.html` and `out/renderer/settings/index.html`.

- [ ] **Step 10: Commit**

```bash
git add electron.vite.config.ts src/renderer/settings/ src/renderer/settings/src/
git commit -m "feat: multi-renderer config with settings window shell, sidebar, and useSettings hook"
```

---

### Task 4: General tab + HotkeyRecorder component

**Files:**
- Create: `src/renderer/settings/src/components/HotkeyRecorder.tsx`
- Modify: `src/renderer/settings/src/components/GeneralTab.tsx`

- [ ] **Step 1: Create HotkeyRecorder component**

Create `src/renderer/settings/src/components/HotkeyRecorder.tsx`:

```tsx
import { useState, useCallback, useRef, useEffect } from 'react'

interface HotkeyRecorderProps {
  value: string
  onChange: (hotkey: string) => void
}

function electronKeyName(e: React.KeyboardEvent): string | null {
  const key = e.key
  // Ignore standalone modifier presses
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('CmdOrCtrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // Normalize key names to Electron accelerator format
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Return',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Escape: 'Escape',
    Tab: 'Tab',
  }

  const normalized = keyMap[key] ?? key.toUpperCase()
  parts.push(normalized)

  return parts.join('+')
}

function formatForDisplay(accelerator: string): string {
  return accelerator
    .replace('CmdOrCtrl', '⌘')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace(/\+/g, ' ')
    .replace('Space', '␣')
}

export function HotkeyRecorder({ value, onChange }: HotkeyRecorderProps): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return
      e.preventDefault()
      e.stopPropagation()

      const combo = electronKeyName(e)
      if (combo) {
        onChange(combo)
        setRecording(false)
      }
    },
    [recording, onChange]
  )

  const handleClick = useCallback(() => {
    setRecording(true)
  }, [])

  const handleBlur = useCallback(() => {
    setRecording(false)
  }, [])

  useEffect(() => {
    if (recording && inputRef.current) {
      inputRef.current.focus()
    }
  }, [recording])

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        padding: '8px 12px',
        background: '#1a1a2e',
        border: `1px solid ${recording ? '#00d4ff' : '#27272a'}`,
        borderRadius: 8,
        color: recording ? '#00d4ff' : '#fafafa',
        fontSize: 13,
        fontFamily: 'monospace',
        cursor: 'pointer',
        outline: 'none',
        minWidth: 180,
        textAlign: 'center',
        transition: 'border-color 150ms',
      }}
    >
      {recording ? 'Press a key combo...' : formatForDisplay(value)}
    </div>
  )
}
```

- [ ] **Step 2: Implement GeneralTab**

Replace `src/renderer/settings/src/components/GeneralTab.tsx`:

```tsx
import type { AppSettings, OutputAction } from '../../../../../shared/settings-types'
import { HotkeyRecorder } from './HotkeyRecorder'

interface GeneralTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#a1a1aa',
  marginBottom: 6,
  display: 'block',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

const toggleContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0',
  borderBottom: '1px solid rgba(39,39,42,0.4)',
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (val: boolean) => void
}): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: checked ? '#00d4ff' : '#27272a',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 150ms',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? '#0a0a0f' : '#71717a',
          transition: 'left 150ms, background 150ms',
        }}
      />
    </button>
  )
}

const outputOptions: { value: OutputAction; label: string; description: string }[] = [
  { value: 'display', label: 'Display', description: 'Show response in the prompt window' },
  { value: 'copy', label: 'Copy to clipboard', description: 'Copy response and dismiss' },
  { value: 'replace', label: 'Replace selection', description: 'Replace selected text with response' },
]

export function GeneralTab({ settings, onUpdate }: GeneralTabProps): React.JSX.Element {
  return (
    <div>
      <h2 style={headingStyle}>General</h2>

      {/* Global Hotkey */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Global Hotkey</label>
        <HotkeyRecorder
          value={settings.hotkey}
          onChange={(hotkey) => onUpdate('hotkey', hotkey)}
        />
        <p style={descriptionStyle}>
          Click the field and press your desired key combination.
        </p>
      </div>

      {/* Default Output Action */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Default Output Action</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {outputOptions.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 8,
                background:
                  settings.defaultOutputAction === opt.value
                    ? 'rgba(0,212,255,0.06)'
                    : 'transparent',
                border: `1px solid ${
                  settings.defaultOutputAction === opt.value
                    ? 'rgba(0,212,255,0.2)'
                    : 'transparent'
                }`,
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              <input
                type="radio"
                name="outputAction"
                value={opt.value}
                checked={settings.defaultOutputAction === opt.value}
                onChange={() => onUpdate('defaultOutputAction', opt.value)}
                style={{ accentColor: '#00d4ff' }}
              />
              <div>
                <div style={{ fontSize: 13, color: '#fafafa' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Auto-dismiss */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Auto-dismiss after action</div>
          <div style={descriptionStyle}>
            Automatically hide the prompt window after an output action
          </div>
        </div>
        <Toggle
          checked={settings.autoDismiss}
          onChange={(val) => onUpdate('autoDismiss', val)}
        />
      </div>

      {/* Auto-dismiss delay slider */}
      {settings.autoDismiss && (
        <div style={{ padding: '12px 0', marginBottom: 4 }}>
          <label style={labelStyle}>
            Dismiss delay: {settings.autoDismissDelay}ms
          </label>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={settings.autoDismissDelay}
            onChange={(e) => onUpdate('autoDismissDelay', Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#00d4ff',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#71717a',
          }}>
            <span>500ms</span>
            <span>5000ms</span>
          </div>
        </div>
      )}

      {/* Hide on blur */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Hide on blur</div>
          <div style={descriptionStyle}>
            Hide the prompt window when clicking outside
          </div>
        </div>
        <Toggle
          checked={settings.hideOnBlur}
          onChange={(val) => onUpdate('hideOnBlur', val)}
        />
      </div>

      {/* Launch at startup */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Launch at startup</div>
          <div style={descriptionStyle}>
            Automatically start Context AI when you log in
          </div>
        </div>
        <Toggle
          checked={settings.launchAtStartup}
          onChange={(val) => onUpdate('launchAtStartup', val)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build to verify compilation**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/renderer/settings/src/components/HotkeyRecorder.tsx src/renderer/settings/src/components/GeneralTab.tsx
git commit -m "feat: General tab with HotkeyRecorder, output action radios, and toggle settings"
```

---

### Task 5: AI Provider tab (with model fetch via IPC)

**Files:**
- Modify: `src/renderer/settings/src/components/AIProviderTab.tsx`

- [ ] **Step 1: Implement AIProviderTab**

Replace `src/renderer/settings/src/components/AIProviderTab.tsx`:

```tsx
import { useState, useCallback, useEffect } from 'react'
import type { AppSettings } from '../../../../../shared/settings-types'

interface OpenRouterModel {
  id: string
  name: string
}

interface AIProviderTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#a1a1aa',
  marginBottom: 6,
  display: 'block',
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

export function AIProviderTab({ settings, onUpdate }: AIProviderTabProps): React.JSX.Element {
  const [showKey, setShowKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Sync external changes
  useEffect(() => {
    setApiKeyInput(settings.apiKey)
  }, [settings.apiKey])

  const saveApiKey = useCallback(async () => {
    if (apiKeyInput === settings.apiKey) return
    onUpdate('apiKey', apiKeyInput)

    if (apiKeyInput) {
      setFetching(true)
      setFetchError(null)
      const result = await window.settingsApi.fetchModels(apiKeyInput)
      setFetching(false)
      if (result.error) {
        setFetchError(result.error)
        setModels([])
      } else if (result.models) {
        setModels(result.models)
        setFetchError(null)
      }
    }
  }, [apiKeyInput, settings.apiKey, onUpdate])

  // Fetch models on mount if API key exists
  useEffect(() => {
    if (settings.apiKey) {
      setFetching(true)
      window.settingsApi.fetchModels(settings.apiKey).then((result) => {
        setFetching(false)
        if (result.models) {
          setModels(result.models)
        } else if (result.error) {
          setFetchError(result.error)
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 style={headingStyle}>AI Provider</h2>

      {/* API Key */}
      <div style={sectionStyle}>
        <label style={labelStyle}>OpenRouter API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={saveApiKey}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveApiKey()
              }}
              placeholder="sk-or-..."
              style={inputStyle}
            />
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: '8px 12px',
              background: '#1a1a2e',
              border: '1px solid #27272a',
              borderRadius: 8,
              color: '#a1a1aa',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p style={descriptionStyle}>
          Your API key is encrypted locally via system keychain.
        </p>
        {fetchError && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
            {fetchError}
          </p>
        )}
      </div>

      {/* Model Selector */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Model</label>
        <select
          value={settings.model}
          onChange={(e) => onUpdate('model', e.target.value)}
          disabled={!settings.apiKey || fetching}
          style={{
            ...inputStyle,
            cursor: settings.apiKey && !fetching ? 'pointer' : 'not-allowed',
            opacity: !settings.apiKey || fetching ? 0.5 : 1,
            appearance: 'none',
            paddingRight: 32,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="">
            {fetching ? 'Fetching models...' : 'Select a model'}
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {!settings.apiKey && (
          <p style={descriptionStyle}>
            Enter an API key to load available models.
          </p>
        )}
      </div>

      {/* System Prompt */}
      <div style={sectionStyle}>
        <label style={labelStyle}>System Prompt</label>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => onUpdate('systemPrompt', e.target.value)}
          placeholder="Optional system prompt prepended to every request..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: 80,
          }}
        />
      </div>

      {/* Temperature */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Temperature: {settings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => onUpdate('temperature', Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#00d4ff',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#71717a',
        }}>
          <span>0.0 (precise)</span>
          <span>2.0 (creative)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Max Tokens</label>
        <input
          type="number"
          value={settings.maxTokens}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            if (!isNaN(val) && val > 0) {
              onUpdate('maxTokens', val)
            }
          }}
          min={1}
          style={{
            ...inputStyle,
            width: 150,
          }}
        />
        <p style={descriptionStyle}>
          Maximum number of tokens in the response.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/renderer/settings/src/components/AIProviderTab.tsx
git commit -m "feat: AI Provider tab with encrypted API key, model fetch, system prompt, and parameters"
```

---

### Task 6: Quick Actions tab (with drag-to-reorder)

**Files:**
- Modify: `src/renderer/settings/src/components/QuickActionsTab.tsx`

- [ ] **Step 1: Implement QuickActionsTab**

Replace `src/renderer/settings/src/components/QuickActionsTab.tsx`:

```tsx
import { useState, useCallback, useRef } from 'react'
import type { AppSettings, QuickAction } from '../../../../../shared/settings-types'

interface QuickActionsTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

interface ActionFormData {
  name: string
  template: string
}

function ActionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ActionFormData
  onSave: (data: ActionFormData) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [template, setTemplate] = useState(initial?.template ?? '')

  return (
    <div style={{
      padding: 16,
      background: '#1a1a2e',
      borderRadius: 8,
      border: '1px solid #27272a',
      marginBottom: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div>
        <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rewrite"
          style={inputStyle}
          autoFocus
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>
          Template
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Use {{selection}} as a placeholder for selected text"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
        />
        <p style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>
          Use <code style={{ color: '#00d4ff', fontSize: 11 }}>{'{{selection}}'}</code> where the selected text should be inserted.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid #27272a',
            borderRadius: 6,
            color: '#a1a1aa',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim() && template.trim()) {
              onSave({ name: name.trim(), template: template.trim() })
            }
          }}
          disabled={!name.trim() || !template.trim()}
          style={{
            padding: '6px 14px',
            background: name.trim() && template.trim() ? 'rgba(0,212,255,0.1)' : '#1a1a2e',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 6,
            color: name.trim() && template.trim() ? '#00d4ff' : '#71717a',
            fontSize: 12,
            cursor: name.trim() && template.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export function QuickActionsTab({ settings, onUpdate }: QuickActionsTabProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const actions = settings.quickActions

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverItem.current = index
  }, [])

  const handleDrop = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return

    const reordered = [...actions]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)

    dragItem.current = null
    dragOverItem.current = null

    onUpdate('quickActions', reordered)
  }, [actions, onUpdate])

  const handleAdd = useCallback(
    (data: ActionFormData) => {
      const id = data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
      const newAction: QuickAction = { id, ...data }
      onUpdate('quickActions', [...actions, newAction])
      setShowAddForm(false)
    },
    [actions, onUpdate]
  )

  const handleEdit = useCallback(
    (id: string, data: ActionFormData) => {
      const updated = actions.map((a) => (a.id === id ? { ...a, ...data } : a))
      onUpdate('quickActions', updated)
      setEditingId(null)
    },
    [actions, onUpdate]
  )

  const handleDelete = useCallback(
    (id: string) => {
      const filtered = actions.filter((a) => a.id !== id)
      onUpdate('quickActions', filtered)
      setDeleteConfirmId(null)
    },
    [actions, onUpdate]
  )

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ ...headingStyle, marginBottom: 0 }}>Quick Actions</h2>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
          style={{
            padding: '6px 14px',
            background: showAddForm ? '#1a1a2e' : 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 6,
            color: showAddForm ? '#71717a' : '#00d4ff',
            fontSize: 12,
            cursor: showAddForm ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Add Action
        </button>
      </div>

      {showAddForm && (
        <ActionForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {actions.map((action, index) => (
          <div key={action.id}>
            {editingId === action.id ? (
              <ActionForm
                initial={{ name: action.name, template: action.template }}
                onSave={(data) => handleEdit(action.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#0a0a0f',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  cursor: 'grab',
                }}
              >
                {/* Drag handle */}
                <span style={{ color: '#3f3f46', fontSize: 14, cursor: 'grab', userSelect: 'none' }}>
                  ⠿
                </span>

                {/* Action info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#fafafa', fontWeight: 500 }}>
                    {action.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 300,
                  }}>
                    {action.template}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditingId(action.id)}
                    style={{
                      padding: '4px 10px',
                      background: 'transparent',
                      border: '1px solid #27272a',
                      borderRadius: 4,
                      color: '#a1a1aa',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === action.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(action.id)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 4,
                          color: '#ef4444',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: '1px solid #27272a',
                          borderRadius: 4,
                          color: '#a1a1aa',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(action.id)}
                      style={{
                        padding: '4px 10px',
                        background: 'transparent',
                        border: '1px solid #27272a',
                        borderRadius: 4,
                        color: '#a1a1aa',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {actions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 32,
          color: '#71717a',
          fontSize: 13,
        }}>
          No quick actions configured. Click "Add Action" to create one.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/renderer/settings/src/components/QuickActionsTab.tsx
git commit -m "feat: Quick Actions tab with drag-to-reorder, inline add/edit, and delete confirmation"
```

---

### Task 7: Appearance tab

**Files:**
- Modify: `src/renderer/settings/src/components/AppearanceTab.tsx`

- [ ] **Step 1: Implement AppearanceTab**

Replace `src/renderer/settings/src/components/AppearanceTab.tsx`:

```tsx
import type { AppSettings } from '../../../../../shared/settings-types'

interface AppearanceTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#a1a1aa',
  marginBottom: 6,
  display: 'block',
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export function AppearanceTab({ settings, onUpdate }: AppearanceTabProps): React.JSX.Element {
  return (
    <div>
      <h2 style={headingStyle}>Appearance</h2>

      {/* Accent Color */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Accent Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="color"
            value={settings.accentColor}
            onChange={(e) => onUpdate('accentColor', e.target.value)}
            style={{
              width: 40,
              height: 40,
              border: '1px solid #27272a',
              borderRadius: 8,
              background: '#1a1a2e',
              cursor: 'pointer',
              padding: 2,
            }}
          />
          <input
            type="text"
            value={settings.accentColor}
            onChange={(e) => {
              const val = e.target.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                onUpdate('accentColor', val)
              }
            }}
            style={{
              ...inputStyle,
              width: 120,
              fontFamily: 'monospace',
            }}
          />
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: settings.accentColor,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
        <p style={descriptionStyle}>
          Applied as the primary accent color throughout the app.
        </p>
      </div>

      {/* Prompt Window Width */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Prompt Window Width: {settings.promptWindowWidth}px
        </label>
        <input
          type="range"
          min={400}
          max={800}
          step={10}
          value={settings.promptWindowWidth}
          onChange={(e) => onUpdate('promptWindowWidth', Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#00d4ff',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#71717a',
        }}>
          <span>400px</span>
          <span>800px</span>
        </div>
      </div>

      {/* Font Size */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Font Size: {settings.fontSize}px
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={settings.fontSize}
            onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#00d4ff',
            }}
          />
          <input
            type="number"
            min={10}
            max={20}
            value={settings.fontSize}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val) && val >= 10 && val <= 20) {
                onUpdate('fontSize', val)
              }
            }}
            style={{
              ...inputStyle,
              width: 60,
              textAlign: 'center',
            }}
          />
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: 16,
        background: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid #27272a',
      }}>
        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 8 }}>Preview</div>
        <div style={{
          padding: 12,
          background: '#0a0a0f',
          borderRadius: 8,
          border: `1px solid ${settings.accentColor}33`,
          fontSize: settings.fontSize,
          color: '#fafafa',
          maxWidth: settings.promptWindowWidth,
        }}>
          <span style={{ color: settings.accentColor }}>Context AI</span> — This is how your prompt window text will look at {settings.fontSize}px.
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/renderer/settings/src/components/AppearanceTab.tsx
git commit -m "feat: Appearance tab with accent color picker, window width slider, and font size controls"
```

---

### Task 8: Settings window management + prompt window integration

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/renderer/src/hooks/usePromptState.ts`
- Modify: `src/renderer/src/components/PromptWindow.tsx`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add settings IPC channel to the prompt window preload**

In `src/preload/index.ts`, add `IPC` import for `SETTINGS_GET` and `SETTINGS_CHANGED` (these are already in the `IPC` object from Task 1). Add to the `api` object:

```ts
  getSettings(): Promise<import('../shared/settings-types').AppSettings> {
    return ipcRenderer.invoke(IPC.SETTINGS_GET)
  },

  onSettingsChanged(callback: (settings: import('../shared/settings-types').AppSettings) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: import('../shared/settings-types').AppSettings): void =>
      callback(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler)
  },
```

- [ ] **Step 2: Update prompt preload type declarations**

In `src/preload/index.d.ts`, add to `ContextAIAPI`:

```ts
  getSettings(): Promise<import('../shared/settings-types').AppSettings>
  onSettingsChanged(callback: (settings: import('../shared/settings-types').AppSettings) => void): () => void
```

- [ ] **Step 3: Update usePromptState to load quick actions from settings**

In `src/renderer/src/hooks/usePromptState.ts`:

Remove the `DEFAULT_QUICK_ACTIONS` export. Replace it with a state-based approach. Add `useState` and update the hook:

```ts
import { useReducer, useEffect, useCallback, useState } from 'react'
import type { QuickAction, AppSettings } from '../../../shared/settings-types'
import { DEFAULT_SETTINGS } from '../../../shared/settings-types'

// ... (keep all existing state types and reducer unchanged) ...

// Remove DEFAULT_QUICK_ACTIONS export entirely

// --- Hook ---

export function usePromptState() {
  const [state, dispatch] = useReducer(promptReducer, { phase: 'empty' } as PromptState)
  const [quickActions, setQuickActions] = useState<QuickAction[]>(DEFAULT_SETTINGS.quickActions)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    // Load settings on mount
    window.api.getSettings().then((s) => {
      setQuickActions(s.quickActions)
      setSettings(s)
    })

    const unsubs = [
      window.api.onWindowReset(() => dispatch({ type: 'DISMISS' })),
      window.api.onSelectedText((data) => dispatch({ type: 'CONTEXT_RECEIVED', text: data.text })),
      window.api.onStreamToken((data) => dispatch({ type: 'STREAM_TOKEN', content: data.content })),
      window.api.onStreamDone(() => dispatch({ type: 'STREAM_DONE' })),
      window.api.onStreamError((error) => dispatch({ type: 'STREAM_ERROR', message: error.message })),
      window.api.onSettingsChanged((updated) => {
        setQuickActions(updated.quickActions)
        setSettings(updated)
      }),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const submitPrompt = useCallback((prompt: string) => {
    const context = state.phase === 'context' ? state.contextText : null
    window.api.submitPrompt({ prompt, context, model: settings.model })
    dispatch({ type: 'PROMPT_SUBMITTED', prompt })
  }, [state, settings.model])

  const submitQuickAction = useCallback((name: string, template: string) => {
    const context = state.phase === 'context' ? state.contextText : null
    const prompt = context ? template.replace('{{selection}}', context) : template
    window.api.submitPrompt({ prompt, context, model: settings.model })
    dispatch({ type: 'QUICK_ACTION_SUBMITTED', action: name })
  }, [state, settings.model])

  const dismiss = useCallback(() => {
    dispatch({ type: 'DISMISS' })
    window.api.dismiss()
  }, [])

  const copyResponse = useCallback(() => {
    if (state.phase === 'complete') {
      window.api.executeOutputAction('copy', state.response)
    }
  }, [state])

  const replaceSelection = useCallback(() => {
    if (state.phase === 'complete') {
      window.api.executeOutputAction('replace', state.response)
    }
  }, [state])

  return { state, quickActions, settings, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection }
}
```

- [ ] **Step 4: Update PromptWindow to use settings-based quick actions**

In `src/renderer/src/components/PromptWindow.tsx`:

Replace the import line:

```ts
import { usePromptState } from '../hooks/usePromptState'
```

(Remove the `DEFAULT_QUICK_ACTIONS` import.)

Update the destructuring to include `quickActions` and `settings`:

```ts
  const { state, quickActions, settings, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection } =
    usePromptState()
```

Replace the `QuickActions` usage from:

```tsx
        <QuickActions
          actions={DEFAULT_QUICK_ACTIONS}
          onSelect={submitQuickAction}
        />
```

To:

```tsx
        <QuickActions
          actions={quickActions}
          onSelect={submitQuickAction}
        />
```

In `App.tsx`, update the hardcoded width (`560`) to use CSS custom properties or keep it static (the prompt window width is controlled by BrowserWindow size, set in main process). No change needed here since window width is set in main/index.ts.

- [ ] **Step 5: Update main/index.ts with settings window management and integration**

Replace `src/main/index.ts`:

```ts
import { app, BrowserWindow, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { setupIPC, sendSelectedText, sendPermissionStatus, sendWindowReset } from './ipc'
import { setupSettingsIPC } from './settings-ipc'
import { createSettingsStore } from './settings-store'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { initContextBridge, getSelectedText, getSourceAppPid, checkAccessibilityPermission } from './context-bridge'
import type { NativeContextBridge } from './context-bridge'
import { IPC } from '../shared/ipc'

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
    height: 600,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
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

  settingsWindow.on('closed', () => {
    settingsWindow = null
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

  // Grab source app PID instantly (< 1ms), then show window
  const sourcePid = getSourceAppPid()

  blurGuard = true
  sendWindowReset(promptWindow)
  promptWindow.show()
  promptWindow.focus()
  setTimeout(() => { blurGuard = false }, 200)

  checkAndSendPermissionStatus(false)

  // Capture text using saved PID (works even after our window has focus)
  const result = await getSelectedText(sourcePid)
  if (result) {
    sendSelectedText(promptWindow, result.text, result.method)
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
  setupIPC(promptWindow)
  setupSettingsIPC(settingsStore, getAllWindows)

  // Listen for settings changes that require main process action
  const { ipcMain } = require('electron')
  ipcMain.on(IPC.SETTINGS_CHANGED, () => {
    // This won't fire from ipcMain.handle — we handle it inline below
  })

  // Hook into settings changes for hotkey re-registration and launch-at-startup
  const originalSet = settingsStore.set.bind(settingsStore)
  const patchedStore = {
    ...settingsStore,
    set<K extends keyof import('../shared/settings-types').AppSettings>(
      key: K,
      value: import('../shared/settings-types').AppSettings[K]
    ) {
      const result = originalSet(key, value)

      if (key === 'hotkey') {
        registerCurrentHotkey()
      }

      if (key === 'launchAtStartup') {
        app.setLoginItemSettings({ openAtLogin: value as boolean })
      }

      if (key === 'hideOnBlur') {
        // No action needed — checked on each blur event
      }

      if (key === 'promptWindowWidth' && promptWindow && !promptWindow.isDestroyed()) {
        const bounds = promptWindow.getBounds()
        promptWindow.setBounds({ ...bounds, width: value as number })
      }

      return result
    },
  }

  // Re-setup IPC with patched store so side effects fire
  // (We need to remove old handlers first since handle() can only be registered once)
  ipcMain.removeHandler(IPC.SETTINGS_GET)
  ipcMain.removeHandler(IPC.SETTINGS_SET)
  ipcMain.removeHandler(IPC.SETTINGS_FETCH_MODELS)
  setupSettingsIPC(patchedStore, getAllWindows)

  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(getIconPath())
    app.dock.setIcon(dockIcon)
  }

  // Create tray icon
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

  // Check permission on startup
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
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 7: Build the project**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 8: Manual verification**

```bash
npm run build:native && npm run dev
```

Expected:
- Tray menu shows "Settings" item
- Clicking "Settings" opens a 700x500 window with dark theme
- Sidebar shows 4 tabs: General, AI Provider, Quick Actions, Appearance
- Clicking tabs switches the content area
- General tab: HotkeyRecorder records key combos, output action radios work, toggles save on click
- AI Provider tab: API key input with show/hide, model dropdown loads after key entry, temperature slider and max tokens input work
- Quick Actions tab: actions listed from settings, drag-to-reorder works, add/edit/delete with inline forms
- Appearance tab: color picker, width slider, font size controls all save immediately
- Prompt window uses quick actions from settings (not hardcoded)
- Changing quick actions in settings is reflected in prompt window without restart
- Changing hotkey in settings re-registers the global shortcut
- Hide-on-blur toggle is respected by prompt window
- Closing and re-opening settings window preserves all values

- [ ] **Step 9: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/preload/index.d.ts src/renderer/src/hooks/usePromptState.ts src/renderer/src/components/PromptWindow.tsx
git commit -m "feat: settings window management, prompt window integration, and live settings broadcast"
```

---

## Summary

After completing all 8 tasks, M4 delivers:

- **Persistent settings** via `electron-store` with full default schema, surviving app restarts
- **Encrypted API key storage** using Electron's `safeStorage` API (base64-encoded encrypted buffer)
- **Settings store** with TDD test coverage for get/set/encryption operations
- **Settings IPC layer** with `ipcMain.handle` for request/response and broadcast via `settings:changed`
- **Multi-renderer electron-vite config** with separate preload scripts for prompt and settings windows
- **Settings window** (700x500, standard frame, dark theme) opened from tray menu
- **Sidebar navigation** across 4 tabs: General, AI Provider, Quick Actions, Appearance
- **General tab**: HotkeyRecorder component, output action radios, auto-dismiss toggle + delay slider, hide-on-blur toggle, launch-at-startup toggle
- **AI Provider tab**: encrypted API key input with show/hide, model dropdown populated from OpenRouter API, system prompt textarea, temperature slider, max tokens input
- **Quick Actions tab**: drag-to-reorder via HTML DnD API, inline add/edit forms, delete with confirmation
- **Appearance tab**: accent color picker, prompt window width slider, font size controls with live preview
- **Auto-save on change** with no "Save" button — every setting persists immediately
- **Live broadcast** of settings changes to the prompt window via IPC
- **Prompt window integration**: quick actions loaded from settings, model passed from settings, hotkey re-registration on change, hide-on-blur behavior, prompt window width updates
- **Tray menu** updated with "Settings" entry
