# M1: Project Setup & Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an Electron + React + TypeScript app with Vite, Tailwind CSS v4, shadcn/ui, a type-safe IPC layer, and global hotkey registration.

**Architecture:** Three-process Electron app — main (Node.js), preload (bridge), renderer (React). `electron-vite` builds all three with Vite. The renderer uses React + Tailwind v4 + shadcn/ui. IPC is type-safe via shared channel/type definitions exposed through `contextBridge`.

**Tech Stack:** Electron, electron-vite, React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Vitest

---

## File Map

```
context-ai/
├── .gitignore
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── vitest.config.ts
├── components.json                    # shadcn/ui config
├── docs/
│   └── PLAN.md                        # (existing)
├── src/
│   ├── main/
│   │   ├── index.ts                   # App lifecycle, window creation
│   │   ├── ipc.ts                     # IPC handler registration
│   │   ├── hotkey.ts                  # Global hotkey registration
│   │   └── __tests__/
│   │       └── hotkey.test.ts
│   ├── preload/
│   │   ├── index.ts                   # contextBridge API
│   │   └── index.d.ts                # Global Window.api types
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── globals.css            # Tailwind v4 + theme tokens
│   │       └── lib/
│   │           └── utils.ts           # shadcn cn() utility
│   └── shared/
│       ├── ipc.ts                     # IPC channel names + types
│       └── __tests__/
│           └── ipc.test.ts
```

---

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/jonas/git/context-ai
npm init -y
```

Then replace the contents of `package.json` with:

```json
{
  "name": "context-ai",
  "version": "0.1.0",
  "description": "System tray desktop app for AI-assisted text operations via global hotkey",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "UNLICENSED",
  "private": true
}
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install react react-dom clsx tailwind-merge
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D electron electron-vite @vitejs/plugin-react typescript vite tailwindcss @tailwindcss/vite @types/react @types/react-dom vitest
```

- [ ] **Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
out/
dist/
.DS_Store
*.env
*.env.*
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: initialize project with dependencies"
```

---

### Task 2: Configure TypeScript and build tooling

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create root tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 2: Create tsconfig.node.json (main + preload + shared)**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext"],
    "outDir": "./out",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["electron-vite/node"]
  },
  "include": [
    "src/main/**/*",
    "src/preload/**/*",
    "src/shared/**/*",
    "electron.vite.config.ts"
  ]
}
```

- [ ] **Step 3: Create tsconfig.web.json (renderer)**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "./out",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/renderer/src/*"]
    }
  },
  "include": [
    "src/renderer/**/*",
    "src/preload/index.d.ts"
  ]
}
```

- [ ] **Step 4: Create electron.vite.config.ts**

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
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json tsconfig.node.json tsconfig.web.json electron.vite.config.ts vitest.config.ts
git commit -m "chore: configure TypeScript, electron-vite, and vitest"
```

---

### Task 3: Create Electron shell (main + preload + renderer)

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/preload/index.d.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/globals.css`
- Create: `src/renderer/src/lib/utils.ts`
- Create: `components.json`

- [ ] **Step 1: Create main process entry**

Create `src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

let promptWindow: BrowserWindow | null = null

function createPromptWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#0a0a0f',
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

  return window
}

app.whenReady().then(() => {
  promptWindow = createPromptWindow()
  promptWindow.show()
})

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
})
```

Note: `promptWindow.show()` is temporary so we can visually verify the window renders. It will be removed in Task 8 when the hotkey triggers it.

- [ ] **Step 2: Create preload script (minimal)**

Create `src/preload/index.ts`:

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {})
```

Create `src/preload/index.d.ts`:

```ts
export interface ContextAIAPI {}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
```

- [ ] **Step 3: Create renderer HTML entry**

Create `src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Context AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create React entry point**

Create `src/renderer/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create App component**

Create `src/renderer/src/App.tsx`:

```tsx
function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold text-foreground">Context AI</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 6: Create Tailwind v4 globals.css**

Create `src/renderer/src/globals.css`:

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

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 7: Create shadcn cn() utility**

Create `src/renderer/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Create shadcn components.json**

Create `components.json` at project root:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/renderer/src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/ components.json
git commit -m "feat: create Electron shell with React, Tailwind v4, and shadcn/ui"
```

---

### Task 4: Verify dev workflow

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

**Expected:** An Electron window opens showing "Context AI" text centered on a dark background (#0a0a0f). The window is frameless and always-on-top.

- [ ] **Step 2: Verify Tailwind is working**

Temporarily change `App.tsx` — add `text-accent` class to the heading. The text should turn cyan (#00d4ff). Revert after confirming.

- [ ] **Step 3: Stop the dev server (Ctrl+C) and continue**

---

### Task 5: Shared IPC types and channels (TDD)

**Files:**
- Create: `src/shared/ipc.ts`
- Create: `src/shared/__tests__/ipc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/shared/__tests__/ipc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  IPC,
  type SelectedText,
  type PromptSubmission,
  type StreamToken,
  type StreamError,
  type OutputAction
} from '../ipc'

describe('IPC channels', () => {
  it('defines all required channel names', () => {
    expect(IPC.SELECTED_TEXT).toBe('context:selected-text')
    expect(IPC.PROMPT_SUBMIT).toBe('prompt:submit')
    expect(IPC.STREAM_TOKEN).toBe('stream:token')
    expect(IPC.STREAM_DONE).toBe('stream:done')
    expect(IPC.STREAM_ERROR).toBe('stream:error')
    expect(IPC.OUTPUT_ACTION).toBe('output:execute')
  })

  it('SelectedText has required shape', () => {
    const data: SelectedText = { text: 'hello', method: 'accessibility' }
    expect(data.text).toBe('hello')
    expect(data.method).toBe('accessibility')
  })

  it('SelectedText accepts clipboard method', () => {
    const data: SelectedText = { text: 'world', method: 'clipboard' }
    expect(data.method).toBe('clipboard')
  })

  it('PromptSubmission has required shape', () => {
    const submission: PromptSubmission = {
      prompt: 'Summarize this',
      context: 'Some selected text',
      model: 'openai/gpt-4o'
    }
    expect(submission.prompt).toBe('Summarize this')
    expect(submission.context).toBe('Some selected text')
    expect(submission.model).toBe('openai/gpt-4o')
  })

  it('PromptSubmission context can be null', () => {
    const submission: PromptSubmission = {
      prompt: 'Hello',
      context: null,
      model: 'openai/gpt-4o'
    }
    expect(submission.context).toBeNull()
  })

  it('StreamToken has content string', () => {
    const token: StreamToken = { content: 'Hello' }
    expect(token.content).toBe('Hello')
  })

  it('StreamError has message string', () => {
    const error: StreamError = { message: 'Rate limited' }
    expect(error.message).toBe('Rate limited')
  })

  it('OutputAction is a valid union value', () => {
    const actions: OutputAction[] = ['display', 'copy', 'replace']
    expect(actions).toHaveLength(3)
    expect(actions).toContain('display')
    expect(actions).toContain('copy')
    expect(actions).toContain('replace')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/shared/__tests__/ipc.test.ts
```

Expected: FAIL — cannot find module `../ipc`

- [ ] **Step 3: Write the implementation**

Create `src/shared/ipc.ts`:

```ts
export const IPC = {
  SELECTED_TEXT: 'context:selected-text',
  PROMPT_SUBMIT: 'prompt:submit',
  STREAM_TOKEN: 'stream:token',
  STREAM_DONE: 'stream:done',
  STREAM_ERROR: 'stream:error',
  OUTPUT_ACTION: 'output:execute',
} as const

export interface SelectedText {
  text: string
  method: 'accessibility' | 'clipboard'
}

export interface PromptSubmission {
  prompt: string
  context: string | null
  model: string
}

export interface StreamToken {
  content: string
}

export interface StreamError {
  message: string
}

export type OutputAction = 'display' | 'copy' | 'replace'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/shared/__tests__/ipc.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/
git commit -m "feat: define shared IPC channel names and types"
```

---

### Task 6: IPC handlers and preload bridge

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Create IPC handler module**

Create `src/main/ipc.ts`:

```ts
import { ipcMain, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'

export function setupIPC(promptWindow: BrowserWindow): void {
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    // Handled in M5 (OpenRouter integration)
    console.log('[ipc] prompt submitted:', submission.prompt)
  })

  ipcMain.on(IPC.OUTPUT_ACTION, (_event, action: OutputAction) => {
    // Handled in M3 (Prompt Window output actions)
    console.log('[ipc] output action:', action)
  })
}

export function sendSelectedText(
  window: BrowserWindow,
  text: string,
  method: 'accessibility' | 'clipboard'
): void {
  window.webContents.send(IPC.SELECTED_TEXT, { text, method })
}

export function sendStreamToken(window: BrowserWindow, content: string): void {
  window.webContents.send(IPC.STREAM_TOKEN, { content })
}

export function sendStreamDone(window: BrowserWindow): void {
  window.webContents.send(IPC.STREAM_DONE)
}

export function sendStreamError(window: BrowserWindow, message: string): void {
  window.webContents.send(IPC.STREAM_ERROR, { message })
}
```

- [ ] **Step 2: Update preload with full contextBridge API**

Replace `src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction
} from '../shared/ipc'

const api = {
  onSelectedText(callback: (data: SelectedText) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: SelectedText): void =>
      callback(data)
    ipcRenderer.on(IPC.SELECTED_TEXT, handler)
    return () => ipcRenderer.removeListener(IPC.SELECTED_TEXT, handler)
  },

  submitPrompt(submission: PromptSubmission): void {
    ipcRenderer.send(IPC.PROMPT_SUBMIT, submission)
  },

  onStreamToken(callback: (data: StreamToken) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: StreamToken): void =>
      callback(data)
    ipcRenderer.on(IPC.STREAM_TOKEN, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_TOKEN, handler)
  },

  onStreamDone(callback: () => void): () => void {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.STREAM_DONE, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_DONE, handler)
  },

  onStreamError(callback: (error: StreamError) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, error: StreamError): void =>
      callback(error)
    ipcRenderer.on(IPC.STREAM_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.STREAM_ERROR, handler)
  },

  executeOutputAction(action: OutputAction): void {
    ipcRenderer.send(IPC.OUTPUT_ACTION, action)
  }
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 3: Update preload type declaration**

Replace `src/preload/index.d.ts`:

```ts
import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction
} from '../shared/ipc'

export interface ContextAIAPI {
  onSelectedText(callback: (data: SelectedText) => void): () => void
  submitPrompt(submission: PromptSubmission): void
  onStreamToken(callback: (data: StreamToken) => void): () => void
  onStreamDone(callback: () => void): () => void
  onStreamError(callback: (error: StreamError) => void): () => void
  executeOutputAction(action: OutputAction): void
}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
```

- [ ] **Step 4: Wire IPC into main process**

Update `src/main/index.ts` — add the `setupIPC` import and call after window creation:

Add import at top:
```ts
import { setupIPC } from './ipc'
```

In the `app.whenReady()` callback, after `promptWindow = createPromptWindow()`:
```ts
  setupIPC(promptWindow)
```

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts src/main/index.ts src/preload/
git commit -m "feat: implement type-safe IPC layer with preload bridge"
```

---

### Task 7: Global hotkey module (TDD)

**Files:**
- Create: `src/main/__tests__/hotkey.test.ts`
- Create: `src/main/hotkey.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/main/__tests__/hotkey.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn(() => true),
    unregister: vi.fn()
  }
}))

import { globalShortcut } from 'electron'
import { registerHotkey, unregisterHotkey, getCurrentAccelerator } from '../hotkey'

describe('hotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    unregisterHotkey()
  })

  it('registers a global hotkey and tracks the accelerator', () => {
    const callback = vi.fn()
    const success = registerHotkey('CmdOrCtrl+Shift+Space', callback)

    expect(success).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space',
      callback
    )
    expect(getCurrentAccelerator()).toBe('CmdOrCtrl+Shift+Space')
  })

  it('unregisters previous hotkey before registering a new one', () => {
    registerHotkey('CmdOrCtrl+Shift+Space', vi.fn())
    registerHotkey('CmdOrCtrl+Shift+A', vi.fn())

    expect(globalShortcut.unregister).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space'
    )
    expect(getCurrentAccelerator()).toBe('CmdOrCtrl+Shift+A')
  })

  it('returns false and clears accelerator when registration fails', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)

    const success = registerHotkey('Invalid+Key', vi.fn())

    expect(success).toBe(false)
    expect(getCurrentAccelerator()).toBeNull()
  })

  it('unregisters the current hotkey', () => {
    registerHotkey('CmdOrCtrl+Shift+Space', vi.fn())
    unregisterHotkey()

    expect(globalShortcut.unregister).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space'
    )
    expect(getCurrentAccelerator()).toBeNull()
  })

  it('does nothing when unregistering with no active hotkey', () => {
    unregisterHotkey()
    expect(globalShortcut.unregister).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/main/__tests__/hotkey.test.ts
```

Expected: FAIL — cannot find module `../hotkey`

- [ ] **Step 3: Write the implementation**

Create `src/main/hotkey.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/main/__tests__/hotkey.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all 13 tests PASS (8 IPC + 5 hotkey)

- [ ] **Step 6: Commit**

```bash
git add src/main/hotkey.ts src/main/__tests__/hotkey.test.ts
git commit -m "feat: implement global hotkey registration with re-bind support"
```

---

### Task 8: Wire hotkey to show/hide prompt window

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Update main process with hotkey integration**

Replace `src/main/index.ts` entirely:

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIPC } from './ipc'
import { registerHotkey, unregisterHotkey } from './hotkey'

let promptWindow: BrowserWindow | null = null

function createPromptWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#0a0a0f',
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
    window.hide()
  })

  return window
}

function togglePromptWindow(): void {
  if (!promptWindow) return

  if (promptWindow.isVisible()) {
    promptWindow.hide()
  } else {
    promptWindow.show()
    promptWindow.focus()
  }
}

app.whenReady().then(() => {
  promptWindow = createPromptWindow()
  setupIPC(promptWindow)

  const success = registerHotkey('CmdOrCtrl+Shift+Space', togglePromptWindow)
  if (!success) {
    console.error('Failed to register global hotkey CmdOrCtrl+Shift+Space')
  }
})

app.on('will-quit', () => {
  unregisterHotkey()
})

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
})
```

- [ ] **Step 2: Verify hotkey works**

```bash
npm run dev
```

**Expected:**
- App launches with no visible window
- Press `Cmd+Shift+Space` (macOS) or `Ctrl+Shift+Space` (Windows) → prompt window appears with "Context AI" centered
- Press the hotkey again → window hides
- Click outside the window → window hides

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: all 13 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire global hotkey to toggle prompt window"
```

---

## Summary

After completing all 8 tasks, M1 delivers:

- Electron + React + TypeScript project built with electron-vite and Vite
- Tailwind CSS v4 with dark theme tokens matching the design spec
- shadcn/ui configured and ready for component installation
- Type-safe IPC layer with shared channel definitions and preload bridge
- Global hotkey (`CmdOrCtrl+Shift+Space`) that toggles a frameless, always-on-top prompt window
- 13 passing tests covering IPC contracts and hotkey logic
- Clean git history with atomic commits per feature
