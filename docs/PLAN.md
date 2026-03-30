# Context AI — Design Spec

A system tray desktop app that provides a global hotkey-triggered prompt window for AI-assisted text operations. Select text in any app, hit a hotkey, and interact with AI using that text as context.

**Target platforms:** macOS and Windows (equal priority)
**Stack:** Electron, React, Tailwind CSS, shadcn/ui
**AI provider:** OpenRouter (BYOK)

---

## 1. Architecture

### Three-process model

- **Main process** (Electron main) — owns the tray icon, registers global hotkeys, manages windows, handles native text capture via a platform-specific native Node addon, streams OpenRouter API calls.
- **Prompt window** (renderer) — frameless, always-on-top BrowserWindow. React + Tailwind + shadcn. Shown/hidden on hotkey, never destroyed.
- **Settings window** (renderer) — standard BrowserWindow opened from tray menu. Same stack.

### Data flow on hotkey press

1. Global hotkey fires → main process calls `context-bridge.getSelectedText()`
2. Selected text sent to prompt renderer via IPC
3. User types a prompt or clicks a quick action → renderer sends `{ prompt, context, model }` to main process via IPC
4. Main process streams OpenRouter response back to renderer via IPC
5. On completion, main process handles the configured output action (display / copy / replace)

---

## 2. Native Text Capture Module (`context-bridge`)

A native Node addon (C++ with platform-specific code) built with `node-addon-api` and `cmake-js`.

### API

```
getSelectedText(): Promise<{ text: string, method: 'accessibility' | 'clipboard' }>
```

### macOS implementation (Objective-C++)

1. Get the frontmost app's PID via `NSWorkspace`
2. Create an `AXUIElementRef` for that app
3. Get the focused UI element → query `kAXSelectedTextAttribute`
4. If that returns text → done
5. **Fallback:** save clipboard → simulate Cmd+C via `CGEventCreateKeyboardEvent` → 100ms delay → read clipboard → restore clipboard

### Windows implementation (C++)

1. Get the foreground window via `GetForegroundWindow`
2. Use UI Automation (`IUIAutomation`) to get the focused element
3. Query `ITextProvider` / `ITextRangeProvider` for the selection
4. If that returns text → done
5. **Fallback:** save clipboard → simulate Ctrl+C via `SendInput` → 100ms delay → read clipboard → restore clipboard

### Build & distribution

- Platform-specific source files selected at build time via cmake-js
- Ships prebuilt binaries via `prebuild` so end users don't need a compiler

### Permissions

- **macOS:** Requires Accessibility permission. On first launch, detect if permission is missing and show an onboarding screen guiding the user to System Settings.
- **Windows:** UI Automation works without special permissions for most apps.

---

## 3. Prompt Window

### Visual style

- Dark & sleek: solid dark background (#0a0a0f range), sharp edges with rounded corners, neon accent color highlights
- Frameless, ~600px wide, dynamic height (grows with response content)
- Appears centered on the screen where the cursor is (multi-monitor aware)
- Fade-in + slight scale animation on open (~150ms)
- Subtle border with accent color glow

### Layout (top to bottom)

1. **Context bar** — compact preview of captured text (1-2 lines, truncated, expandable on click). Accent-colored left border. Hidden if no text was selected.
2. **Prompt input** — auto-focused text input. Placeholder: "Ask anything..." or "What should I do with this?" when context is present. Enter to submit, Shift+Enter for newline.
3. **Quick actions row** — horizontal scrollable chips below input. Only shown when context is present. Clicking a chip sends that action immediately with the context.
4. **Response area** — appears after submission. Markdown rendered with syntax highlighting for code blocks. Streams in token by token. Scrollable if long.
5. **Action bar** — appears after response completes. Buttons: Copy, Replace, Dismiss. Keyboard shortcut hints displayed (Cmd/Ctrl+C, Cmd/Ctrl+Shift+V, Esc).

### Behavior

- `Esc` dismisses the window and clears state
- After the configured default action executes, window auto-dismisses (configurable delay or immediate)
- Window hides on blur (clicking outside) — configurable in settings
- Previous response is cleared on each new invocation
- No conversation threading — each invocation is stateless

### Output actions

- **Display** — response stays visible in the window until the user dismisses or copies manually
- **Copy to clipboard** — copies the response text to clipboard, shows brief confirmation toast in the window
- **Replace selection** — copies response to clipboard → hides prompt window → activates the original source app → simulates Cmd+V / Ctrl+V to paste. The original app and window are tracked when the hotkey is first pressed so we can return focus reliably.

---

## 4. Settings Window

Opened from tray menu → "Settings". Tab layout with sidebar navigation.

### General tab

- Global hotkey configuration (record-style input: click field, press desired key combo). Default: `Cmd+Shift+Space` (macOS) / `Ctrl+Shift+Space` (Windows)
- Default output action: Display / Copy to clipboard / Replace selection
- Auto-dismiss after action (toggle + delay slider)
- Hide on blur (toggle)
- Launch on system startup (toggle)

### AI Provider tab

- OpenRouter API key input (stored encrypted via Electron `safeStorage`)
- Model selector (fetched live from OpenRouter `/api/v1/models`)
- System prompt (optional text area)
- Temperature slider
- Max tokens setting

### Quick Actions tab

- List of user-defined actions with drag-to-reorder
- Each action: name, icon/emoji, prompt template with `{{selection}}` placeholder
- Default actions shipped: Rewrite, Summarize, Fix Grammar, Translate to English, Explain
- Add / edit / delete actions

### Appearance tab

- Accent color picker (default: neon cyan/blue)
- Prompt window width
- Font size

---

## 5. Storage

- **All settings:** `electron-store` (JSON file on disk)
- **API key:** encrypted via Electron's `safeStorage` API, stored within electron-store
- **Quick action definitions:** JSON within the same electron-store

No database needed for v1. SQLite is a candidate for v2 if prompt history/search is added.

### First-run experience

On first launch (no API key configured):
1. Prompt window shows a welcome message with a "Set up API key" button instead of the prompt input
2. Clicking it opens the Settings window directly to the AI Provider tab
3. After saving a valid key, the prompt window becomes fully functional
4. macOS only: if Accessibility permission is not granted, show an inline banner in the prompt window explaining why it's needed and linking to System Settings

---

## 6. Tray & App Lifecycle

### System tray

- Monochrome template icon (adapts to light/dark on macOS, standard icon on Windows)
- Menu items: Open Context AI, separator, Settings, About, separator, Quit

### Lifecycle

- No dock icon on macOS (`app.dock.hide()`)
- Prompt window created once at startup and hidden (fast show on hotkey)
- Settings window created on demand, destroyed on close
- Single instance lock (`app.requestSingleInstanceLock()`)
- Optional launch at login via `app.setLoginItemSettings()`

### Auto-update

- `electron-updater` with GitHub Releases as update source
- Check on launch + every 24 hours
- Notify via tray notification, no forced installs

### Packaging

- `electron-builder` for both platforms
- macOS: `.dmg` (universal binary for Intel + Apple Silicon)
- Windows: `.exe` installer via NSIS

---

## 7. OpenRouter Integration

### API calls

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Streaming enabled (SSE) for token-by-token response display
- Request format: standard OpenAI-compatible chat completions with `Authorization: Bearer <key>` header
- Model list fetched from `https://openrouter.ai/api/v1/models` for the settings selector

### Request construction

```json
{
  "model": "<user-selected-model>",
  "messages": [
    { "role": "system", "content": "<optional system prompt from settings>" },
    { "role": "user", "content": "<prompt>\n\nContext:\n<selected text>" }
  ],
  "stream": true,
  "temperature": "<from settings>",
  "max_tokens": "<from settings>"
}
```

When a quick action is used, the prompt is the action's template with `{{selection}}` replaced by the captured text.

---

## 8. Out of Scope (v2 candidates)

- Conversation threading / follow-up messages
- Prompt history with search
- Multiple hotkeys bound to specific quick actions
- Image/screenshot context capture
- Plugin system for quick actions
- Usage statistics
- Multiple AI provider backends (beyond OpenRouter)
