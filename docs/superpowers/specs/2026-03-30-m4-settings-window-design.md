# M4: Settings Window — Design Spec

## Overview

A separate Electron BrowserWindow for configuring all app settings. Opened from the tray menu. Sidebar tab navigation with 4 sections: General, AI Provider, Quick Actions, Appearance.

## Window

- Standard BrowserWindow (not frameless), ~700x500
- Dark theme matching prompt window (#0a0a0f background, same accent colors)
- Created on demand from tray menu, destroyed on close
- Title: "Context AI — Settings"

## Storage

All settings persisted via `electron-store` (JSON on disk). API key encrypted via Electron's `safeStorage` API before storing.

IPC channels:
- `settings:get` (renderer → main, invoke) — returns all settings
- `settings:set` (renderer → main, invoke) — updates a settings key, returns updated settings
- `settings:changed` (main → renderer) — broadcasts changes to all windows (prompt window reacts to setting changes)

Settings auto-save on every change. No "Save" button.

## Default Settings

```json
{
  "hotkey": "CmdOrCtrl+Shift+Space",
  "defaultOutputAction": "display",
  "autoDismiss": false,
  "autoDismissDelay": 2000,
  "hideOnBlur": true,
  "launchAtStartup": false,
  "apiKey": "",
  "model": "",
  "systemPrompt": "",
  "temperature": 0.7,
  "maxTokens": 2048,
  "quickActions": [
    { "id": "rewrite", "name": "Rewrite", "template": "Rewrite the following text:\n\n{{selection}}" },
    { "id": "summarize", "name": "Summarize", "template": "Summarize the following text:\n\n{{selection}}" },
    { "id": "fix-grammar", "name": "Fix Grammar", "template": "Fix the grammar in the following text:\n\n{{selection}}" },
    { "id": "translate", "name": "Translate", "template": "Translate the following text to English:\n\n{{selection}}" },
    { "id": "explain", "name": "Explain", "template": "Explain the following text:\n\n{{selection}}" }
  ],
  "accentColor": "#00d4ff",
  "promptWindowWidth": 560,
  "fontSize": 14
}
```

## Tab: General

- **Global hotkey** — record-style input. Click the field, press desired key combo, combo is captured and displayed. Default: `CmdOrCtrl+Shift+Space`. On save, main process re-registers the hotkey.
- **Default output action** — radio group: Display / Copy to clipboard / Replace selection
- **Auto-dismiss after action** — toggle + delay slider (500ms–5000ms). Only enabled when toggle is on.
- **Hide on blur** — toggle. When off, prompt window stays visible when clicking outside.
- **Launch on system startup** — toggle. Uses `app.setLoginItemSettings()`.

## Tab: AI Provider

- **API key** — password-style input with show/hide toggle. Stored encrypted via `safeStorage`.
- **Model selector** — dropdown, disabled until API key is saved. On key save: fetch models from `https://openrouter.ai/api/v1/models`, populate dropdown. If fetch fails, show inline error ("Invalid API key" or network error). Model list cached in settings store.
- **System prompt** — textarea, optional. Prepended as system message in every request.
- **Temperature** — slider 0.0–2.0, step 0.1. Default 0.7.
- **Max tokens** — number input. Default 2048.

## Tab: Quick Actions

- List of actions with drag-to-reorder (using HTML drag and drop, no extra library)
- Each action row shows: name, truncated template preview, edit/delete buttons
- **Add action** button opens an inline form: name input + template textarea with `{{selection}}` placeholder hint
- **Edit** opens the same inline form pre-filled
- **Delete** with confirmation
- Default 5 actions shipped (Rewrite, Summarize, Fix Grammar, Translate, Explain)

## Tab: Appearance

- **Accent color** — color input picker. Default `#00d4ff`. Applied as CSS custom property to prompt window.
- **Prompt window width** — number input, 400–800px range. Default 560.
- **Font size** — number input, 10–20px range. Default 14.

## Component Architecture

Settings window has its own renderer entry point (separate from the prompt window).

```
src/
├── main/
│   ├── settings-store.ts              # electron-store wrapper, safeStorage for API key
│   ├── settings-ipc.ts                # IPC handlers for settings:get, settings:set
│   └── index.ts                       # (modify) Create settings window, wire tray menu
├── preload/
│   └── settings-preload.ts            # contextBridge for settings window
├── renderer/
│   └── settings/                      # Separate renderer for settings window
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── SettingsApp.tsx         # Root with sidebar + tab router
│           ├── globals.css
│           ├── components/
│           │   ├── Sidebar.tsx
│           │   ├── GeneralTab.tsx
│           │   ├── AIProviderTab.tsx
│           │   ├── QuickActionsTab.tsx
│           │   ├── AppearanceTab.tsx
│           │   └── HotkeyRecorder.tsx  # Record-style hotkey input
│           └── hooks/
│               └── useSettings.ts     # Fetch/update settings via IPC
├── shared/
│   └── settings-types.ts             # Settings interface shared between main/renderer
```

## Integration with Prompt Window

The prompt window reads settings on each invocation:
- Quick actions list comes from settings (not hardcoded)
- Output action defaults come from settings
- Accent color, width, font size applied from settings
- Hotkey re-registered when changed in settings
- `hideOnBlur` behavior toggled from settings

Settings changes broadcast via `settings:changed` IPC so the prompt window can react without restart.

## electron-vite Configuration

The settings window is a second renderer entry in `electron.vite.config.ts`, with its own HTML entry point and preload script.
