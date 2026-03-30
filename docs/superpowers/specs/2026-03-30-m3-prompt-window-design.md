# M3: Prompt Window — Design Spec

## Overview

The prompt window is a frameless, always-on-top overlay triggered by a global hotkey. It captures text from any app, lets the user interact with AI via free-form prompts or quick actions, streams the response, and offers output actions (copy, replace, dismiss).

## Visual Style

- Background: `#0a0a0f`
- Border: `1px solid rgba(0,212,255,0.15)`, `border-radius: 16px`
- Shadow: `0 0 30px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.5)`
- Width: 560px fixed
- Height: dynamic — starts compact (~60px input only), grows with content, caps at 80vh then scrolls internally
- Font: `system-ui, -apple-system, sans-serif`
- Appear animation: fade-in + slight scale (~150ms)

## State Machine

The window has 4 states:

### State 1: Empty (no context captured)

Spotlight-style input bar only:
- Search icon (magnifying glass SVG, `stroke: #00d4ff`, `opacity: 0.6`) on the left
- Placeholder text: `"Ask anything..."` in `#71717a`
- Esc badge on the right: `color: #3f3f46`, `border: 1px solid #27272a`, `border-radius: 4px`, `padding: 2px 6px`, `font-size: 11px`
- No context bar, no quick actions
- Padding: `14px 18px`, items centered vertically with `gap: 12px`

### State 2: Context captured (text selected before hotkey)

Three sections visible:

**Context bar:**
- `border-left: 3px solid #00d4ff`
- `margin: 12px 14px 8px 14px`, `padding: 6px 12px`
- `background: rgba(0,212,255,0.04)`, `border-radius: 0 8px 8px 0`
- Text: `color: #e4e4e7`, `font-size: 13px`, single line truncated with ellipsis
- Expandable on click (shows full text)

**Input:**
- Same Spotlight-style as State 1
- Placeholder changes to: `"What should I do with this?"`

**Quick actions row** (below a `1px solid rgba(39,39,42,0.6)` divider):
- `padding: 10px 14px`, horizontal flex with `gap: 6px`
- Each chip: `background: rgba(0,212,255,0.08)`, `border: 1px solid rgba(0,212,255,0.2)`, `color: #00d4ff`, `font-size: 12px`, `padding: 5px 14px`, `border-radius: 20px`
- Default actions: Rewrite, Summarize, Fix Grammar, Translate, Explain
- Horizontally scrollable if overflow

### State 3: Streaming response

After user submits a prompt or clicks a quick action:

**Submission indicator** (replaces the input area):
- If quick action: show the action name as a badge — `background: rgba(0,212,255,0.12)`, `color: #00d4ff`, `font-size: 12px`, `padding: 3px 10px`, `border-radius: 12px` — followed by `"Quick action"` label in `#71717a`
- If free-form prompt: show the user's prompt text in `#e4e4e7`
- `padding: 4px 18px 10px 18px`

**Response area** (below divider):
- `padding: 14px 18px`
- Text: `color: #e4e4e7`, `font-size: 14px`, `line-height: 1.7`
- Markdown rendered via `react-markdown`
- Code blocks: `background: #111118`, `border: 1px solid #27272a`, `border-radius: 6px`, `padding: 10px 12px`, `font-family: monospace`, `font-size: 12px` — syntax highlighted via `react-syntax-highlighter`
- Streaming cursor: inline `2px × 16px` block in `#00d4ff` at the end of text
- Scrollable if content exceeds max height

### State 4: Response complete

Same as State 3 but:
- Streaming cursor removed
- Action bar appears below a divider

**Action bar:**
- `padding: 10px 14px`, flex with `gap: 8px`, `justify-content: flex-end`
- Dismiss button: `background: transparent`, `border: 1px solid #27272a`, `color: #71717a`, `border-radius: 8px`, `padding: 7px 16px`, hint `Esc` in `#3f3f46`
- Copy button: same border style, `color: #e4e4e7`, hint `⌘C` in `#3f3f46`
- Replace button (primary): `background: rgba(0,212,255,0.1)`, `border: 1px solid rgba(0,212,255,0.25)`, `color: #00d4ff`, hint `⌘⇧V` in `rgba(0,212,255,0.4)`
- All buttons: `font-size: 12px`, `border-radius: 8px`, `cursor: pointer`

## Keyboard Shortcuts

- `Enter` — submit prompt (or Shift+Enter for newline)
- `Esc` — dismiss window, clear all state
- `⌘C` / `Ctrl+C` — copy response to clipboard (when response complete)
- `⌘⇧V` / `Ctrl+Shift+V` — replace selection (copy response → switch to source app → paste)

## Behavior

- Window appears centered on the screen where the cursor is (multi-monitor aware)
- `Esc` dismisses and clears all state
- Window hides on blur (clicking outside)
- Each invocation is stateless — previous response cleared on new hotkey press
- After output action executes, window auto-dismisses

## Output Actions

- **Display** — response stays visible until user dismisses
- **Copy to clipboard** — copies response text, shows brief confirmation toast
- **Replace selection** — copies response → hides window → activates source app → simulates paste (⌘V / Ctrl+V). Source app tracked when hotkey first pressed.

## Component Architecture

```
src/renderer/src/
├── App.tsx                          # Root — mounts PromptWindow
├── components/
│   ├── PermissionBanner.tsx         # (existing)
│   ├── PromptWindow.tsx             # State machine, orchestrates all child components
│   ├── ContextBar.tsx               # Truncated selected text preview, expandable
│   ├── PromptInput.tsx              # Spotlight-style input with search icon
│   ├── QuickActions.tsx             # Horizontal scrollable action chips
│   ├── SubmittedPrompt.tsx          # Shows what was submitted (badge or text)
│   ├── ResponseArea.tsx             # Markdown + syntax highlighting, streaming
│   └── ActionBar.tsx                # Copy / Replace / Dismiss buttons
├── hooks/
│   └── usePromptState.ts           # State machine hook managing the 4 states
```

## Dependencies

- `react-markdown` — markdown rendering
- `react-syntax-highlighter` — code block syntax highlighting
