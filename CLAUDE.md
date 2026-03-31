# Context AI

System tray desktop app for AI-assisted text operations via global hotkey. Select text in any app, press a hotkey, get AI responses. BYOK via OpenRouter.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Build native addon + start dev server with hot reload |
| `npm run dev:automation` | Dev server with CDP remote debugging on port 9222 |
| `npm run build` | Build native addon + compile everything |
| `npm test` | Run Vitest (45 tests) |
| `npm run test:watch` | Vitest watch mode |
| `npm run build:native` | Rebuild C++/Obj-C native addon only |
| `npm run package:mac` | Build + create macOS DMG |
| `npm run package:win` | Build + create Windows NSIS installer |
| `npx tsc --noEmit` | Type check (no emit) |

## Architecture

Three-process Electron app:

1. **Main process** (`src/main/`) — tray icon, window lifecycle, hotkey registration, native addon orchestration, OpenRouter streaming, settings persistence
2. **Prompt window renderer** (`src/renderer/src/`) — frameless always-on-top React window, shown/hidden on hotkey, never destroyed
3. **Settings window renderer** (`src/renderer/settings/src/`) — standard window with four tabs (General, AI Provider, Quick Actions, Appearance)

Shared types and IPC channel constants live in `src/shared/`.

### Data Flow

Hotkey press → native addon captures selected text → IPC to renderer → user submits prompt → main streams OpenRouter SSE response → tokens sent to renderer via IPC → user copies/replaces/dismisses.

### Native Addon (`native/`)

C++/Obj-C++ addon built with node-gyp + node-addon-api. Captures selected text via platform accessibility APIs (macOS: AXUIElement, Windows: UI Automation) with clipboard fallback. Compiled output: `native/build/Release/context_bridge.node`.

## Tech Stack

- **Electron 41** with electron-vite (hot reload, optimized builds)
- **React 19** (functional components, hooks only, no class components)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **TypeScript** (strict mode, ESNext modules, composite project)
- **Vitest** for testing
- **electron-store** for settings persistence (API key encrypted via safeStorage)
- **electron-updater** for auto-updates from GitHub Releases
- **electron-builder** for packaging (macOS DMG universal, Windows NSIS)

## Project Structure

```
src/
  main/           # Electron main process (index.ts, ipc.ts, openrouter.ts, etc.)
  preload/        # Preload scripts (index.ts for prompt, settings-preload.ts for settings)
  renderer/
    src/          # Prompt window React app
      components/ # PromptWindow, ContextBar, PromptInput, QuickActions, ResponseArea, etc.
      hooks/      # usePromptState (reducer-based state machine)
      lib/        # cn() utility (clsx + tailwind-merge)
    settings/
      src/        # Settings window React app
        components/ # Sidebar, GeneralTab, AIProviderTab, QuickActionsTab, AppearanceTab
        hooks/      # useSettings
  shared/         # Cross-process types and IPC channel constants
native/           # C++/Obj-C++ native addon (context_bridge)
resources/        # App icons, tray icons
build/            # macOS entitlements
docs/             # PLAN.md design spec
```

## Conventions

### TypeScript

- Strict mode everywhere
- Two tsconfig files: `tsconfig.node.json` (main + preload + shared) and `tsconfig.web.json` (renderer)
- Path alias: `@` maps to `src/renderer/src`

### React

- Functional components with hooks only
- `useReducer` for complex state (prompt window phases: empty → context → streaming → complete)
- Custom hooks for domain logic (`usePromptState`, `useSettings`)
- Props typed with interfaces

### IPC

- All channel names centralized in `src/shared/ipc.ts` as `IPC` const object
- Preload scripts bridge renderer ↔ main via `contextBridge.exposeInMainWorld`
- Type definitions for preload APIs in `src/preload/index.d.ts` and `settings-preload.d.ts`

### Styling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- Dynamic theming via inline styles for accent color, font size, window width

### Testing

- Tests colocated in `__tests__/` folders alongside source
- Vitest with globals enabled
- `vi.mock()` for mocking electron modules

## Git & CI

- **Conventional commits** required: `feat:`, `fix:`, `ci:`, `docs:`, etc.
- **CI** (GitHub Actions): runs on macOS + Windows — type check, tests, full build
- **Releases**: release-please automation on main → opens changelog PR → merge triggers build + publish to GitHub Releases
- Current version: `0.1.0`

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Start the app with CDP enabled: `npm run dev:automation` (port 9222). Then connect:

```bash
agent-browser connect 9222           # Attach to the app
agent-browser snapshot -i            # Get interactive elements with refs (@e1, @e2)
agent-browser click @e1              # Click an element
agent-browser fill @e2 "text"        # Fill an input
```

Re-snapshot after any page change. On Windows, launch manually with:

```bash
REMOTE_DEBUGGING_PORT=9222 npx electron-vite dev -- --no-sandbox
```

## Git Worktrees

Worktrees go in `.worktrees/` (already gitignored). Symlink `.env*` files from repo root into new worktrees.

## Adding a New Setting

1. Add to `AppSettings` interface and `DEFAULT_SETTINGS` in `src/shared/settings-types.ts`
2. Add UI in appropriate settings tab component
3. Wire up IPC in `src/main/settings-ipc.ts` if needed
4. Access via `window.api.getSettings()` or `useSettings()` hook in renderer

## Adding a New IPC Channel

1. Add channel constant to `IPC` object in `src/shared/ipc.ts`
2. Add type interface for the payload in the same file
3. Expose in preload script (`src/preload/index.ts` or `settings-preload.ts`)
4. Add handler in `src/main/ipc.ts` or `src/main/settings-ipc.ts`
5. Subscribe in renderer via `useEffect` with cleanup
