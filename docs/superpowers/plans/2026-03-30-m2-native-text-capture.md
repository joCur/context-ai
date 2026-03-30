# M2: Native Text Capture (context-bridge) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Node addon that captures selected text from any app via OS accessibility APIs, with a clipboard-simulation fallback, and wire it into the hotkey flow.

**Architecture:** A C++/Obj-C++ native addon (`context-bridge`) exposes three functions via N-API: `getSelectedTextViaAccessibility()`, `simulateCopy()`, and `isAccessibilityGranted()`. A TypeScript orchestration layer in the main process tries accessibility first, falls back to clipboard capture. Platform-specific code is selected at cmake build time. macOS builds and tests now; Windows code is written but compiled later on a Windows device.

**Tech Stack:** cmake-js, node-addon-api (N-API), Objective-C++ (macOS), C++ (Windows), Electron clipboard API

**Note:** Issue #8 (prebuilt binaries) is deferred to M7 (Packaging & Distribution).

---

## Prerequisites

cmake must be installed on the system:

```bash
brew install cmake
```

---

## File Map

```
native/
├── CMakeLists.txt                     # cmake-js build config
└── src/
    ├── addon.cc                       # N-API entry point, exports 3 functions
    ├── platform.h                     # Cross-platform interface declarations
    ├── platform_mac.mm                # macOS: AX API + CGEvent Cmd+C
    └── platform_win.cc               # Windows: UI Automation + SendInput Ctrl+C
src/
├── main/
│   ├── context-bridge.ts             # JS orchestration: accessibility → clipboard fallback
│   ├── index.ts                      # (modify) Load addon, wire hotkey → capture → IPC
│   ├── ipc.ts                        # (modify) Add permission IPC handlers
│   └── __tests__/
│       └── context-bridge.test.ts    # Tests for orchestration logic
├── preload/
│   ├── index.ts                      # (modify) Add permission API
│   └── index.d.ts                    # (modify) Add permission types
├── renderer/
│   └── src/
│       ├── App.tsx                    # (modify) Add PermissionBanner
│       └── components/
│           └── PermissionBanner.tsx   # macOS accessibility permission banner
└── shared/
    └── ipc.ts                        # (modify) Add permission channels + types
```

---

### Task 1: Native addon build infrastructure

**Files:**
- Create: `native/CMakeLists.txt`
- Create: `native/src/platform.h`
- Create: `native/src/addon.cc`
- Create: `native/src/platform_mac.mm`
- Modify: `package.json`

- [ ] **Step 1: Install build dependencies**

```bash
npm install -D cmake-js node-addon-api
```

- [ ] **Step 2: Add cmake-js config and scripts to package.json**

Add the following to `package.json` at the top level (alongside "scripts", "dependencies", etc.):

```json
"cmake-js": {
  "runtime": "electron"
}
```

Add to the `"scripts"` section:

```json
"build:native": "cmake-js compile -d native",
"rebuild:native": "cmake-js rebuild -d native"
```

- [ ] **Step 3: Create native/CMakeLists.txt**

```cmake
cmake_minimum_required(VERSION 3.15)
project(context_bridge)

set(CMAKE_CXX_STANDARD 17)

include_directories(${CMAKE_JS_INC})

# Find node-addon-api headers
execute_process(
  COMMAND node -e "console.log(require('node-addon-api').include)"
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/..
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
include_directories(${NODE_ADDON_API_DIR})

set(SOURCES src/addon.cc)

if(APPLE)
  list(APPEND SOURCES src/platform_mac.mm)
elseif(WIN32)
  list(APPEND SOURCES src/platform_win.cc)
endif()

add_library(${PROJECT_NAME} SHARED ${SOURCES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

target_compile_definitions(${PROJECT_NAME} PRIVATE NAPI_VERSION=8 NAPI_DISABLE_CPP_EXCEPTIONS)

if(APPLE)
  target_link_libraries(${PROJECT_NAME}
    "-framework AppKit"
    "-framework ApplicationServices"
    "-framework CoreFoundation")
elseif(WIN32)
  target_link_libraries(${PROJECT_NAME} UIAutomationCore Ole32)
endif()
```

- [ ] **Step 4: Create native/src/platform.h**

```cpp
#pragma once
#include <string>

namespace context_bridge {

// Returns selected text via OS accessibility API, or empty string if unavailable.
std::string getSelectedTextViaAccessibility();

// Simulates Cmd+C (macOS) or Ctrl+C (Windows) in the frontmost app.
void simulateCopy();

// Returns true if the process has accessibility permission (always true on Windows).
bool isAccessibilityGranted();

} // namespace context_bridge
```

- [ ] **Step 5: Create native/src/addon.cc**

```cpp
#include <napi.h>
#include "platform.h"

Napi::Value GetSelectedTextViaAccessibility(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string text = context_bridge::getSelectedTextViaAccessibility();
  if (text.empty()) {
    return env.Null();
  }
  return Napi::String::New(env, text);
}

Napi::Value SimulateCopy(const Napi::CallbackInfo& info) {
  context_bridge::simulateCopy();
  return info.Env().Undefined();
}

Napi::Value IsAccessibilityGranted(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), context_bridge::isAccessibilityGranted());
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getSelectedTextViaAccessibility",
              Napi::Function::New(env, GetSelectedTextViaAccessibility));
  exports.Set("simulateCopy",
              Napi::Function::New(env, SimulateCopy));
  exports.Set("isAccessibilityGranted",
              Napi::Function::New(env, IsAccessibilityGranted));
  return exports;
}

NODE_API_MODULE(context_bridge, Init)
```

- [ ] **Step 6: Create native/src/platform_mac.mm (stubs)**

Stubs so the addon compiles. Real implementation in Task 2.

```objc
#include "platform.h"

namespace context_bridge {

std::string getSelectedTextViaAccessibility() {
  return "";
}

void simulateCopy() {
}

bool isAccessibilityGranted() {
  return false;
}

} // namespace context_bridge
```

- [ ] **Step 7: Add native/build/ to .gitignore**

Append to `.gitignore`:

```
native/build/
```

- [ ] **Step 8: Build and verify**

```bash
npm run build:native
```

Expected: Build succeeds, produces `native/build/Release/context_bridge.node`

```bash
ls native/build/Release/context_bridge.node
```

Expected: File exists

- [ ] **Step 9: Commit**

```bash
git add native/ package.json package-lock.json .gitignore
git commit -m "feat: native addon build infrastructure with cmake-js"
```

---

### Task 2: macOS text capture implementation

**Files:**
- Modify: `native/src/platform_mac.mm`

- [ ] **Step 1: Implement the full macOS native module**

Replace `native/src/platform_mac.mm` with:

```objc
#include "platform.h"
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

namespace context_bridge {

std::string getSelectedTextViaAccessibility() {
  @try {
    NSRunningApplication* frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
    if (!frontApp) return "";

    pid_t pid = [frontApp processIdentifier];
    AXUIElementRef appElement = AXUIElementCreateApplication(pid);
    if (!appElement) return "";

    AXUIElementRef focusedElement = nullptr;
    AXError error = AXUIElementCopyAttributeValue(
      appElement, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
    CFRelease(appElement);

    if (error != kAXErrorSuccess || !focusedElement) return "";

    CFTypeRef selectedText = nullptr;
    error = AXUIElementCopyAttributeValue(
      focusedElement, kAXSelectedTextAttribute, &selectedText);
    CFRelease(focusedElement);

    if (error != kAXErrorSuccess || !selectedText) return "";

    if (CFGetTypeID(selectedText) != CFStringGetTypeID()) {
      CFRelease(selectedText);
      return "";
    }

    NSString* nsText = (__bridge NSString*)selectedText;
    std::string result = [nsText UTF8String] ?: "";
    CFRelease(selectedText);

    return result;
  } @catch (NSException*) {
    return "";
  }
}

void simulateCopy() {
  CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!source) return;

  // Key code 8 = 'c'
  CGEventRef keyDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)8, true);
  CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);

  CGEventRef keyUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)8, false);
  CGEventSetFlags(keyUp, kCGEventFlagMaskCommand);

  CGEventPost(kCGHIDEventTap, keyDown);
  CGEventPost(kCGHIDEventTap, keyUp);

  CFRelease(keyDown);
  CFRelease(keyUp);
  CFRelease(source);
}

bool isAccessibilityGranted() {
  return AXIsProcessTrusted();
}

} // namespace context_bridge
```

- [ ] **Step 2: Rebuild**

```bash
npm run rebuild:native
```

Expected: Build succeeds

- [ ] **Step 3: Quick smoke test**

```bash
node -e "
const path = require('path');
const addon = require(path.join(process.cwd(), 'native/build/Release/context_bridge.node'));
console.log('Functions:', Object.keys(addon));
console.log('Accessibility granted:', addon.isAccessibilityGranted());
console.log('Selected text:', addon.getSelectedTextViaAccessibility());
"
```

Expected: Prints the three function names. `isAccessibilityGranted()` returns `true` or `false` depending on system permissions. `getSelectedTextViaAccessibility()` returns `null` (no frontmost app selection from terminal).

Note: This smoke test loads the addon with system Node.js, not Electron's Node.js. The ABI may differ. A full test requires running via Electron (`npm run dev`). This step just validates the addon loads and functions are exported.

- [ ] **Step 4: Commit**

```bash
git add native/src/platform_mac.mm
git commit -m "feat: macOS text capture via accessibility API + clipboard fallback"
```

---

### Task 3: Windows text capture stub

**Files:**
- Create: `native/src/platform_win.cc`

Windows headers (`UIAutomation.h`, `windows.h`) aren't available on macOS. Write a stub that compiles everywhere. The real implementation will be done on a Windows device later (issues #6, #7).

- [ ] **Step 1: Create native/src/platform_win.cc**

```cpp
#include "platform.h"

#ifdef _WIN32

// TODO: Real implementation with UI Automation + SendInput (issues #6, #7)
// Requires: <windows.h>, <UIAutomation.h>
// Build and test on a Windows device.

namespace context_bridge {

std::string getSelectedTextViaAccessibility() {
  return "";
}

void simulateCopy() {
}

bool isAccessibilityGranted() {
  return true;
}

} // namespace context_bridge

#endif
```

- [ ] **Step 2: Commit**

```bash
git add native/src/platform_win.cc
git commit -m "feat: Windows text capture stub (real implementation pending Windows device)"
```

---

### Task 4: JS orchestration layer (TDD)

**Files:**
- Create: `src/main/__tests__/context-bridge.test.ts`
- Create: `src/main/context-bridge.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/main/__tests__/context-bridge.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/main/__tests__/context-bridge.test.ts
```

Expected: FAIL — cannot find module `../context-bridge`

- [ ] **Step 3: Write the implementation**

Create `src/main/context-bridge.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/main/__tests__/context-bridge.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all 21 tests PASS (8 IPC + 5 hotkey + 8 context-bridge)

- [ ] **Step 6: Commit**

```bash
git add src/main/context-bridge.ts src/main/__tests__/context-bridge.test.ts
git commit -m "feat: JS orchestration for text capture with accessibility + clipboard fallback"
```

---

### Task 5: Wire context-bridge into hotkey flow

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Update main process**

Replace `src/main/index.ts` with:

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIPC, sendSelectedText } from './ipc'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { initContextBridge, getSelectedText } from './context-bridge'
import type { NativeContextBridge } from './context-bridge'

let promptWindow: BrowserWindow | null = null

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

async function onHotkeyPressed(): Promise<void> {
  if (!promptWindow) return

  const result = await getSelectedText()

  promptWindow.show()
  promptWindow.focus()

  if (result) {
    sendSelectedText(promptWindow, result.text, result.method)
  }
}

app.whenReady().then(() => {
  initContextBridge(loadNativeAddon())

  promptWindow = createPromptWindow()
  setupIPC(promptWindow)

  const success = registerHotkey('CmdOrCtrl+Shift+Space', () => {
    onHotkeyPressed()
  })
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

Key changes from the M1 version:
- Loads the native addon on startup via `loadNativeAddon()`
- Initializes context-bridge with the addon
- Hotkey handler now calls `getSelectedText()` before showing window
- Sends captured text to renderer via `sendSelectedText()`
- No longer a simple toggle — always shows window (capture happens first)

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all 21 tests PASS

- [ ] **Step 3: Rebuild native + test manually**

```bash
npm run rebuild:native && npm run dev
```

Expected: App launches. Press hotkey → window appears. If accessibility permission is granted and text is selected in another app, the context will be captured and sent to the renderer (visible in DevTools console for now).

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire text capture into hotkey flow"
```

---

### Task 6: Permission detection and onboarding

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/__tests__/ipc.test.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Create: `src/renderer/src/components/PermissionBanner.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add permission IPC channels and types to shared/ipc.ts**

Add two new channel entries to the `IPC` object:

```ts
export const IPC = {
  SELECTED_TEXT: 'context:selected-text',
  PROMPT_SUBMIT: 'prompt:submit',
  STREAM_TOKEN: 'stream:token',
  STREAM_DONE: 'stream:done',
  STREAM_ERROR: 'stream:error',
  OUTPUT_ACTION: 'output:execute',
  PERMISSION_STATUS: 'permission:status',
  PERMISSION_REQUEST: 'permission:request',
} as const
```

Add a new interface after `OutputAction`:

```ts
export interface PermissionStatus {
  accessibility: boolean
}
```

- [ ] **Step 2: Update IPC tests**

Add these tests to `src/shared/__tests__/ipc.test.ts`:

Inside the `'defines all required channel names'` test, add:

```ts
    expect(IPC.PERMISSION_STATUS).toBe('permission:status')
    expect(IPC.PERMISSION_REQUEST).toBe('permission:request')
```

Add a new test:

```ts
  it('PermissionStatus has required shape', () => {
    const status: PermissionStatus = { accessibility: true }
    expect(status.accessibility).toBe(true)
  })
```

Update the import to include `PermissionStatus`:

```ts
import {
  IPC,
  type SelectedText,
  type PromptSubmission,
  type StreamToken,
  type StreamError,
  type OutputAction,
  type PermissionStatus
} from '../ipc'
```

- [ ] **Step 3: Run IPC tests**

```bash
npm test -- src/shared/__tests__/ipc.test.ts
```

Expected: all tests PASS (including the 2 new ones)

- [ ] **Step 4: Add permission handlers to src/main/ipc.ts**

Add imports at the top:

```ts
import { ipcMain, systemPreferences, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'
```

Add to the `setupIPC` function:

```ts
  ipcMain.on(IPC.PERMISSION_REQUEST, () => {
    if (process.platform === 'darwin') {
      systemPreferences.isTrustedAccessibilityClient(true)
    }
  })
```

Add a new exported function:

```ts
export function sendPermissionStatus(window: BrowserWindow, accessibility: boolean): void {
  window.webContents.send(IPC.PERMISSION_STATUS, { accessibility })
}
```

- [ ] **Step 5: Add permission check to main/index.ts**

Add import:

```ts
import { setupIPC, sendSelectedText, sendPermissionStatus } from './ipc'
import { initContextBridge, getSelectedText, checkAccessibilityPermission } from './context-bridge'
```

Add a function after `onHotkeyPressed`:

```ts
function sendCurrentPermissionStatus(): void {
  if (!promptWindow) return
  if (process.platform !== 'darwin') {
    sendPermissionStatus(promptWindow, true)
    return
  }
  sendPermissionStatus(promptWindow, checkAccessibilityPermission())
}
```

In the `app.whenReady()` callback, after `setupIPC(promptWindow)`, add:

```ts
  promptWindow.webContents.on('did-finish-load', () => {
    sendCurrentPermissionStatus()
  })
```

Also update `onHotkeyPressed` to re-check permission before capture:

```ts
async function onHotkeyPressed(): Promise<void> {
  if (!promptWindow) return

  sendCurrentPermissionStatus()
  const result = await getSelectedText()

  promptWindow.show()
  promptWindow.focus()

  if (result) {
    sendSelectedText(promptWindow, result.text, result.method)
  }
}
```

- [ ] **Step 6: Update preload with permission API**

In `src/preload/index.ts`, add to the imports:

```ts
import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction,
  PermissionStatus
} from '../shared/ipc'
```

Add to the `api` object:

```ts
  onPermissionStatus(callback: (status: PermissionStatus) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, status: PermissionStatus): void =>
      callback(status)
    ipcRenderer.on(IPC.PERMISSION_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.PERMISSION_STATUS, handler)
  },

  requestAccessibilityPermission(): void {
    ipcRenderer.send(IPC.PERMISSION_REQUEST)
  },
```

- [ ] **Step 7: Update preload type declaration**

In `src/preload/index.d.ts`, add `PermissionStatus` to the import:

```ts
import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction,
  PermissionStatus
} from '../shared/ipc'
```

Add to `ContextAIAPI`:

```ts
  onPermissionStatus(callback: (status: PermissionStatus) => void): () => void
  requestAccessibilityPermission(): void
```

- [ ] **Step 8: Create PermissionBanner component**

Create `src/renderer/src/components/PermissionBanner.tsx`:

```tsx
import { useEffect, useState } from 'react'

export function PermissionBanner(): React.JSX.Element | null {
  const [needsPermission, setNeedsPermission] = useState(false)

  useEffect(() => {
    return window.api.onPermissionStatus((status) => {
      setNeedsPermission(!status.accessibility)
    })
  }, [])

  if (!needsPermission) return null

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-md p-3 mx-4 mt-4">
      <p className="text-sm text-muted-foreground mb-2">
        Accessibility permission is required to capture selected text.
      </p>
      <button
        className="text-sm font-medium text-accent hover:text-accent/80"
        onClick={() => window.api.requestAccessibilityPermission()}
      >
        Grant Access in System Settings
      </button>
    </div>
  )
}
```

- [ ] **Step 9: Update App.tsx**

Replace `src/renderer/src/App.tsx`:

```tsx
import { PermissionBanner } from './components/PermissionBanner'

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <PermissionBanner />
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Context AI</h1>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 10: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 11: Build and verify**

```bash
npm run build
```

Expected: Build succeeds (main, preload, renderer all compile)

- [ ] **Step 12: Commit**

```bash
git add src/shared/ src/main/ipc.ts src/main/index.ts src/preload/ src/renderer/
git commit -m "feat: accessibility permission detection with onboarding banner"
```

---

## Summary

After completing all 6 tasks, M2 delivers:

- Native Node addon with cmake-js build for macOS (compiles) and Windows (code ready)
- macOS: selected text capture via Accessibility API (AXUIElement)
- macOS: clipboard fallback via simulated Cmd+C (CGEvent)
- Windows: stubbed (real implementation pending Windows device, issues #6 + #7)
- JS orchestration: tries accessibility → falls back to clipboard → restores clipboard
- Hotkey now captures text before showing prompt window, sends to renderer via IPC
- macOS accessibility permission detection with onboarding banner
- 21+ passing tests (IPC, hotkey, context-bridge orchestration)
