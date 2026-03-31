# Context AI

A system tray desktop app that provides a global hotkey-triggered prompt window for AI-assisted text operations. Select text in any app, hit a hotkey, and interact with AI using that text as context.

## Features

- **Global hotkey** — press `Cmd+Shift+Space` (configurable) from any app
- **Text capture** — automatically grabs selected text via macOS Accessibility API with clipboard fallback
- **Quick actions** — one-click Rewrite, Summarize, Fix Grammar, Translate, Explain (customizable)
- **Streaming responses** — real-time token-by-token AI output with markdown rendering and syntax highlighting
- **Output actions** — Copy response to clipboard or Replace the original selection
- **OpenRouter** — bring your own key, choose from hundreds of AI models
- **Settings** — hotkey, model, system prompt, temperature, quick actions, appearance

## Screenshots

_Coming soon_

## Installation

### Download

Download the latest release from [GitHub Releases](https://github.com/joCur/context-ai/releases).

- **macOS**: `Context-AI-x.x.x-mac.dmg` (universal — Intel + Apple Silicon)
- **Windows**: `Context-AI-x.x.x-win-setup.exe`

### macOS Accessibility Permission

Context AI needs Accessibility permission to read selected text from other apps. On first launch, you'll be prompted to grant access in System Settings → Privacy & Security → Accessibility.

## Development

### Prerequisites

- Node.js 22+
- Python 3.x (for native addon build)
- Xcode Command Line Tools (macOS)

### Setup

```bash
git clone https://github.com/joCur/context-ai.git
cd context-ai
npm install
npm run dev
```

This builds the native addon and starts the Electron dev server with hot reload.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Build native addon + start dev server |
| `npm test` | Run tests |
| `npm run build` | Build for production |
| `npm run package:mac` | Package macOS DMG |
| `npm run package:win` | Package Windows installer |

### Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App lifecycle, windows, tray
│   ├── ipc.ts             # IPC handlers
│   ├── openrouter.ts      # OpenRouter streaming client
│   ├── settings-store.ts  # Persistent settings (electron-store)
│   ├── settings-ipc.ts    # Settings IPC handlers
│   ├── context-bridge.ts  # Text capture orchestration
│   ├── hotkey.ts          # Global hotkey registration
│   └── auto-updater.ts    # Auto-update via electron-updater
├── preload/               # Preload scripts (contextBridge)
├── renderer/              # Prompt window (React)
│   └── settings/          # Settings window (React)
├── shared/                # Shared types and IPC channels
└── native/                # C++/Obj-C++ native addon
    └── src/
        ├── platform_mac.mm  # macOS: AX API + CGEvent
        └── platform_win.cc  # Windows: UI Automation (stub)
```

### Tech Stack

- **Electron** — desktop app framework
- **React 19** — UI
- **Tailwind CSS v4** — styling
- **electron-vite** — build tooling
- **node-gyp + node-addon-api** — native text capture addon
- **electron-store** — settings persistence
- **electron-updater** — auto-updates
- **OpenRouter** — AI provider (OpenAI-compatible API)
- **Vitest** — testing

## Releasing

This project uses [Release Please](https://github.com/googleapis/release-please) for automated versioning. Push commits with [conventional commit](https://www.conventionalcommits.org/) messages:

- `feat: ...` — new feature (minor version bump)
- `fix: ...` — bug fix (patch version bump)

Release Please opens a PR with the changelog. Merge it to trigger a build and publish to GitHub Releases.

## License

UNLICENSED — Private project.
