# M3: Prompt Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the prompt window UI — a Spotlight-style overlay with context bar, input, quick actions, streaming markdown response, and output action buttons.

**Architecture:** A React state machine (`usePromptState`) drives a `PromptWindow` component through 4 phases: empty → context → streaming → complete. The state machine is a pure reducer (testable without React). Child components are presentational, receiving props from the state. IPC events feed the reducer; user actions dispatch to both the reducer and IPC.

**Tech Stack:** React 19, react-markdown, react-syntax-highlighter, Tailwind CSS v4 (inline styles from mockup for exact values)

---

## File Map

```
src/
├── main/
│   ├── index.ts                            # (modify) Update BrowserWindow config
│   └── ipc.ts                              # (modify) Handle dismiss + output actions
├── preload/
│   ├── index.ts                            # (modify) Add dismiss()
│   └── index.d.ts                          # (modify) Add dismiss() type
├── shared/
│   ├── ipc.ts                              # (modify) Add WINDOW_DISMISS channel
│   └── __tests__/ipc.test.ts               # (modify) Test new channel
├── renderer/src/
│   ├── App.tsx                             # (modify) Mount PromptWindow
│   ├── globals.css                         # (modify) Add animation keyframes
│   ├── components/
│   │   ├── PromptWindow.tsx                # Shell, orchestrates children
│   │   ├── PromptInput.tsx                 # Spotlight-style search input
│   │   ├── ContextBar.tsx                  # Truncated selected text
│   │   ├── QuickActions.tsx                # Horizontal action chips
│   │   ├── SubmittedPrompt.tsx             # Shows what was sent
│   │   ├── ResponseArea.tsx                # Markdown + streaming cursor
│   │   ├── ActionBar.tsx                   # Copy / Replace / Dismiss
│   │   └── PermissionBanner.tsx            # (existing, no change)
│   └── hooks/
│       ├── usePromptState.ts               # Reducer + hook
│       └── __tests__/
│           └── promptReducer.test.ts       # Pure reducer tests
```

---

### Task 1: Install dependencies and add IPC channels

**Files:**
- Modify: `package.json`
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/__tests__/ipc.test.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install react-markdown react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
```

- [ ] **Step 2: Add WINDOW_DISMISS to shared/ipc.ts**

Add to the `IPC` object after `PERMISSION_REQUEST`:

```ts
  WINDOW_DISMISS: 'window:dismiss',
```

- [ ] **Step 3: Update IPC tests**

In `src/shared/__tests__/ipc.test.ts`, add inside the `'defines all required channel names'` test:

```ts
    expect(IPC.WINDOW_DISMISS).toBe('window:dismiss')
```

- [ ] **Step 4: Run IPC tests**

```bash
npm test -- src/shared/__tests__/ipc.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Add dismiss() and update executeOutputAction in preload**

In `src/preload/index.ts`, add a `dismiss` method to the `api` object:

```ts
  dismiss(): void {
    ipcRenderer.send(IPC.WINDOW_DISMISS)
  },
```

Update `executeOutputAction` to accept optional response text:

```ts
  executeOutputAction(action: OutputAction, responseText?: string): void {
    ipcRenderer.send(IPC.OUTPUT_ACTION, action, responseText)
  },
```

- [ ] **Step 6: Update preload type declaration**

In `src/preload/index.d.ts`, add to `ContextAIAPI`:

```ts
  dismiss(): void
```

Update `executeOutputAction` signature:

```ts
  executeOutputAction(action: OutputAction, responseText?: string): void
```

- [ ] **Step 7: Handle dismiss and output actions in main process**

In `src/main/ipc.ts`, add `clipboard` to the electron import:

```ts
import { ipcMain, systemPreferences, clipboard, type BrowserWindow } from 'electron'
```

Replace the `OUTPUT_ACTION` handler in `setupIPC`:

```ts
  ipcMain.on(IPC.OUTPUT_ACTION, (_event, action: OutputAction, responseText?: string) => {
    if (action === 'copy' && responseText) {
      clipboard.writeText(responseText)
      promptWindow.hide()
    } else if (action === 'replace' && responseText) {
      clipboard.writeText(responseText)
      promptWindow.hide()
    }
  })

  ipcMain.on(IPC.WINDOW_DISMISS, () => {
    promptWindow.hide()
  })
```

- [ ] **Step 8: Update BrowserWindow config in main/index.ts**

In `createPromptWindow`, update the BrowserWindow options:

```ts
  const window = new BrowserWindow({
    width: 560,
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
```

Key changes: `width: 560`, `height: 600` (tall enough for content, transparent hides the extra), `transparent: true`, `hasShadow: false` (CSS shadow instead), removed `backgroundColor` and `icon`.

- [ ] **Step 9: Run all tests and build**

```bash
npm test && npm run build
```

Expected: all tests PASS, build succeeds

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/shared/ src/preload/ src/main/
git commit -m "feat: add dependencies and IPC for prompt window dismiss + output actions"
```

---

### Task 2: Prompt state reducer (TDD)

**Files:**
- Create: `src/renderer/src/hooks/__tests__/promptReducer.test.ts`
- Create: `src/renderer/src/hooks/usePromptState.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/renderer/src/hooks/__tests__/promptReducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { promptReducer, type PromptState, type PromptAction } from '../usePromptState'

describe('promptReducer', () => {
  const emptyState: PromptState = { phase: 'empty' }

  describe('CONTEXT_RECEIVED', () => {
    it('transitions from empty to context', () => {
      const state = promptReducer(emptyState, { type: 'CONTEXT_RECEIVED', text: 'hello' })
      expect(state).toEqual({ phase: 'context', contextText: 'hello' })
    })

    it('updates context text if already in context phase', () => {
      const prev: PromptState = { phase: 'context', contextText: 'old' }
      const state = promptReducer(prev, { type: 'CONTEXT_RECEIVED', text: 'new' })
      expect(state).toEqual({ phase: 'context', contextText: 'new' })
    })
  })

  describe('PROMPT_SUBMITTED', () => {
    it('transitions from empty to streaming with no context', () => {
      const state = promptReducer(emptyState, { type: 'PROMPT_SUBMITTED', prompt: 'hi' })
      expect(state).toEqual({
        phase: 'streaming',
        contextText: null,
        submittedPrompt: 'hi',
        quickAction: null,
        response: ''
      })
    })

    it('transitions from context to streaming, carrying context', () => {
      const prev: PromptState = { phase: 'context', contextText: 'selected text' }
      const state = promptReducer(prev, { type: 'PROMPT_SUBMITTED', prompt: 'summarize' })
      expect(state).toEqual({
        phase: 'streaming',
        contextText: 'selected text',
        submittedPrompt: 'summarize',
        quickAction: null,
        response: ''
      })
    })
  })

  describe('QUICK_ACTION_SUBMITTED', () => {
    it('transitions from context to streaming with quick action name', () => {
      const prev: PromptState = { phase: 'context', contextText: 'text' }
      const state = promptReducer(prev, { type: 'QUICK_ACTION_SUBMITTED', action: 'Rewrite' })
      expect(state).toEqual({
        phase: 'streaming',
        contextText: 'text',
        submittedPrompt: null,
        quickAction: 'Rewrite',
        response: ''
      })
    })
  })

  describe('STREAM_TOKEN', () => {
    it('appends content to response in streaming phase', () => {
      const prev: PromptState = {
        phase: 'streaming', contextText: null,
        submittedPrompt: 'hi', quickAction: null, response: 'Hello'
      }
      const state = promptReducer(prev, { type: 'STREAM_TOKEN', content: ' world' })
      expect(state).toEqual({ ...prev, response: 'Hello world' })
    })

    it('ignores tokens when not in streaming phase', () => {
      const state = promptReducer(emptyState, { type: 'STREAM_TOKEN', content: 'x' })
      expect(state).toEqual(emptyState)
    })
  })

  describe('STREAM_DONE', () => {
    it('transitions from streaming to complete', () => {
      const prev: PromptState = {
        phase: 'streaming', contextText: null,
        submittedPrompt: 'hi', quickAction: null, response: 'done'
      }
      const state = promptReducer(prev, { type: 'STREAM_DONE' })
      expect(state).toEqual({ ...prev, phase: 'complete' })
    })
  })

  describe('STREAM_ERROR', () => {
    it('transitions to complete with error appended', () => {
      const prev: PromptState = {
        phase: 'streaming', contextText: null,
        submittedPrompt: 'hi', quickAction: null, response: 'partial'
      }
      const state = promptReducer(prev, { type: 'STREAM_ERROR', message: 'Rate limited' })
      expect(state).toEqual({
        ...prev,
        phase: 'complete',
        response: 'partial\n\nError: Rate limited'
      })
    })
  })

  describe('DISMISS', () => {
    it('resets to empty from any phase', () => {
      const phases: PromptState[] = [
        { phase: 'context', contextText: 'x' },
        { phase: 'streaming', contextText: null, submittedPrompt: 'x', quickAction: null, response: 'x' },
        { phase: 'complete', contextText: null, submittedPrompt: 'x', quickAction: null, response: 'x' },
      ]
      for (const prev of phases) {
        expect(promptReducer(prev, { type: 'DISMISS' })).toEqual({ phase: 'empty' })
      }
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/renderer/src/hooks/__tests__/promptReducer.test.ts
```

Expected: FAIL — cannot find module `../usePromptState`

- [ ] **Step 3: Write the reducer and hook**

Create `src/renderer/src/hooks/usePromptState.ts`:

```ts
import { useReducer, useEffect, useCallback } from 'react'

// --- State types ---

interface PromptStateEmpty {
  phase: 'empty'
}

interface PromptStateContext {
  phase: 'context'
  contextText: string
}

interface PromptStateStreaming {
  phase: 'streaming'
  contextText: string | null
  submittedPrompt: string | null
  quickAction: string | null
  response: string
}

interface PromptStateComplete {
  phase: 'complete'
  contextText: string | null
  submittedPrompt: string | null
  quickAction: string | null
  response: string
}

export type PromptState =
  | PromptStateEmpty
  | PromptStateContext
  | PromptStateStreaming
  | PromptStateComplete

// --- Actions ---

export type PromptAction =
  | { type: 'CONTEXT_RECEIVED'; text: string }
  | { type: 'PROMPT_SUBMITTED'; prompt: string }
  | { type: 'QUICK_ACTION_SUBMITTED'; action: string }
  | { type: 'STREAM_TOKEN'; content: string }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_ERROR'; message: string }
  | { type: 'DISMISS' }

// --- Reducer (exported for testing) ---

export function promptReducer(state: PromptState, action: PromptAction): PromptState {
  switch (action.type) {
    case 'CONTEXT_RECEIVED':
      return { phase: 'context', contextText: action.text }

    case 'PROMPT_SUBMITTED':
      return {
        phase: 'streaming',
        contextText: state.phase === 'context' ? state.contextText : null,
        submittedPrompt: action.prompt,
        quickAction: null,
        response: ''
      }

    case 'QUICK_ACTION_SUBMITTED':
      return {
        phase: 'streaming',
        contextText: state.phase === 'context' ? state.contextText : null,
        submittedPrompt: null,
        quickAction: action.action,
        response: ''
      }

    case 'STREAM_TOKEN':
      if (state.phase !== 'streaming') return state
      return { ...state, response: state.response + action.content }

    case 'STREAM_DONE':
      if (state.phase !== 'streaming') return state
      return { ...state, phase: 'complete' }

    case 'STREAM_ERROR':
      if (state.phase !== 'streaming') return state
      return {
        ...state,
        phase: 'complete',
        response: state.response + '\n\nError: ' + action.message
      }

    case 'DISMISS':
      return { phase: 'empty' }

    default:
      return state
  }
}

// --- Quick action definitions ---

export const DEFAULT_QUICK_ACTIONS = [
  { name: 'Rewrite', template: 'Rewrite the following text:\n\n{{selection}}' },
  { name: 'Summarize', template: 'Summarize the following text:\n\n{{selection}}' },
  { name: 'Fix Grammar', template: 'Fix the grammar in the following text:\n\n{{selection}}' },
  { name: 'Translate', template: 'Translate the following text to English:\n\n{{selection}}' },
  { name: 'Explain', template: 'Explain the following text:\n\n{{selection}}' },
]

// --- Hook ---

export function usePromptState() {
  const [state, dispatch] = useReducer(promptReducer, { phase: 'empty' } as PromptState)

  useEffect(() => {
    const unsubs = [
      window.api.onSelectedText((data) => dispatch({ type: 'CONTEXT_RECEIVED', text: data.text })),
      window.api.onStreamToken((data) => dispatch({ type: 'STREAM_TOKEN', content: data.content })),
      window.api.onStreamDone(() => dispatch({ type: 'STREAM_DONE' })),
      window.api.onStreamError((error) => dispatch({ type: 'STREAM_ERROR', message: error.message })),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const submitPrompt = useCallback((prompt: string) => {
    const context = state.phase === 'context' ? state.contextText : null
    window.api.submitPrompt({ prompt, context, model: '' })
    dispatch({ type: 'PROMPT_SUBMITTED', prompt })
  }, [state])

  const submitQuickAction = useCallback((name: string, template: string) => {
    const context = state.phase === 'context' ? state.contextText : null
    const prompt = context ? template.replace('{{selection}}', context) : template
    window.api.submitPrompt({ prompt, context, model: '' })
    dispatch({ type: 'QUICK_ACTION_SUBMITTED', action: name })
  }, [state])

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

  return { state, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/renderer/src/hooks/__tests__/promptReducer.test.ts
```

Expected: all 9 tests PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/hooks/
git commit -m "feat: prompt state reducer and hook with IPC wiring"
```

---

### Task 3: PromptInput and ContextBar components

**Files:**
- Create: `src/renderer/src/components/PromptInput.tsx`
- Create: `src/renderer/src/components/ContextBar.tsx`

- [ ] **Step 1: Create PromptInput**

Create `src/renderer/src/components/PromptInput.tsx`:

```tsx
import { useRef, useEffect } from 'react'

interface PromptInputProps {
  hasContext: boolean
  onSubmit: (prompt: string) => void
  onDismiss: () => void
}

export function PromptInput({ hasContext, onSubmit, onDismiss }: PromptInputProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      onDismiss()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const value = inputRef.current?.value.trim()
      if (value) {
        onSubmit(value)
      }
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.6 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <textarea
        ref={inputRef}
        placeholder={hasContext ? 'What should I do with this?' : 'Ask anything...'}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fafafa',
          fontSize: 15,
          fontFamily: 'inherit',
          resize: 'none',
          lineHeight: '1.4',
        }}
      />
      <div style={{
        color: '#3f3f46',
        fontSize: 11,
        border: '1px solid #27272a',
        borderRadius: 4,
        padding: '2px 6px',
        flexShrink: 0,
      }}>
        Esc
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ContextBar**

Create `src/renderer/src/components/ContextBar.tsx`:

```tsx
import { useState } from 'react'

interface ContextBarProps {
  text: string
}

export function ContextBar({ text }: ContextBarProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        borderLeft: '3px solid #00d4ff',
        margin: '12px 14px 8px 14px',
        padding: '6px 12px',
        background: 'rgba(0,212,255,0.04)',
        borderRadius: '0 8px 8px 0',
        cursor: 'pointer',
      }}
    >
      <div style={{
        color: '#e4e4e7',
        fontSize: 13,
        ...(expanded
          ? { whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const }
          : { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }
        ),
      }}>
        {text}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/PromptInput.tsx src/renderer/src/components/ContextBar.tsx
git commit -m "feat: PromptInput and ContextBar components"
```

---

### Task 4: QuickActions and SubmittedPrompt components

**Files:**
- Create: `src/renderer/src/components/QuickActions.tsx`
- Create: `src/renderer/src/components/SubmittedPrompt.tsx`

- [ ] **Step 1: Create QuickActions**

Create `src/renderer/src/components/QuickActions.tsx`:

```tsx
interface QuickAction {
  name: string
  template: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  onSelect: (name: string, template: string) => void
}

export function QuickActions({ actions, onSelect }: QuickActionsProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
      }}>
        {actions.map((action) => (
          <button
            key={action.name}
            onClick={() => onSelect(action.name, action.template)}
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: '#00d4ff',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {action.name}
          </button>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create SubmittedPrompt**

Create `src/renderer/src/components/SubmittedPrompt.tsx`:

```tsx
interface SubmittedPromptProps {
  quickAction: string | null
  prompt: string | null
}

export function SubmittedPrompt({ quickAction, prompt }: SubmittedPromptProps): React.JSX.Element {
  return (
    <div style={{ padding: '4px 18px 10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {quickAction ? (
        <>
          <span style={{
            background: 'rgba(0,212,255,0.12)',
            color: '#00d4ff',
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 12,
          }}>
            {quickAction}
          </span>
          <span style={{ color: '#71717a', fontSize: 12 }}>Quick action</span>
        </>
      ) : (
        <span style={{ color: '#e4e4e7', fontSize: 14 }}>{prompt}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/QuickActions.tsx src/renderer/src/components/SubmittedPrompt.tsx
git commit -m "feat: QuickActions and SubmittedPrompt components"
```

---

### Task 5: ResponseArea component

**Files:**
- Create: `src/renderer/src/components/ResponseArea.tsx`

- [ ] **Step 1: Create ResponseArea**

Create `src/renderer/src/components/ResponseArea.tsx`:

```tsx
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ResponseAreaProps {
  content: string
  isStreaming: boolean
}

const codeBlockStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #27272a',
  borderRadius: 6,
  padding: '10px 12px',
  fontFamily: 'monospace',
  fontSize: 12,
  margin: '8px 0',
  overflowX: 'auto',
}

const customOneDark = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#111118',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#111118',
  },
}

export function ResponseArea({ content, isStreaming }: ResponseAreaProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '14px 18px',
        color: '#e4e4e7',
        fontSize: 14,
        lineHeight: 1.7,
        overflowY: 'auto',
      }}>
        <Markdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const codeString = String(children).replace(/\n$/, '')

              if (match) {
                return (
                  <div style={codeBlockStyle}>
                    <SyntaxHighlighter
                      style={customOneDark}
                      language={match[1]}
                      PreTag="div"
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                )
              }

              return (
                <code
                  style={{
                    background: '#111118',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              )
            },
            p({ children }) {
              return <p style={{ margin: '0 0 10px 0' }}>{children}</p>
            },
          }}
        >
          {content}
        </Markdown>
        {isStreaming && (
          <span style={{
            display: 'inline-block',
            width: 2,
            height: 16,
            background: '#00d4ff',
            marginLeft: 2,
            verticalAlign: 'middle',
            borderRadius: 1,
            animation: 'cursorBlink 1s step-end infinite',
          }} />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add cursor blink keyframes to globals.css**

Append to `src/renderer/src/globals.css`:

```css

@keyframes cursorBlink {
  50% { opacity: 0; }
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/ResponseArea.tsx src/renderer/src/globals.css
git commit -m "feat: ResponseArea with markdown rendering and streaming cursor"
```

---

### Task 6: ActionBar component

**Files:**
- Create: `src/renderer/src/components/ActionBar.tsx`

- [ ] **Step 1: Create ActionBar**

Create `src/renderer/src/components/ActionBar.tsx`:

```tsx
interface ActionBarProps {
  onDismiss: () => void
  onCopy: () => void
  onReplace: () => void
}

const buttonBase: React.CSSProperties = {
  fontSize: 12,
  padding: '7px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

export function ActionBar({ onDismiss, onCopy, onReplace }: ActionBarProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onDismiss}
          style={{
            ...buttonBase,
            background: 'transparent',
            border: '1px solid #27272a',
            color: '#71717a',
          }}
        >
          Dismiss <span style={{ color: '#3f3f46' }}>Esc</span>
        </button>
        <button
          onClick={onCopy}
          style={{
            ...buttonBase,
            background: 'transparent',
            border: '1px solid #27272a',
            color: '#e4e4e7',
          }}
        >
          Copy <span style={{ color: '#3f3f46' }}>⌘C</span>
        </button>
        <button
          onClick={onReplace}
          style={{
            ...buttonBase,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#00d4ff',
          }}
        >
          Replace <span style={{ color: 'rgba(0,212,255,0.4)' }}>⌘⇧V</span>
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/ActionBar.tsx
git commit -m "feat: ActionBar with copy, replace, dismiss buttons"
```

---

### Task 7: PromptWindow shell component

**Files:**
- Create: `src/renderer/src/components/PromptWindow.tsx`

- [ ] **Step 1: Create PromptWindow**

Create `src/renderer/src/components/PromptWindow.tsx`:

```tsx
import { useEffect, useCallback } from 'react'
import { usePromptState, DEFAULT_QUICK_ACTIONS } from '../hooks/usePromptState'
import { ContextBar } from './ContextBar'
import { PromptInput } from './PromptInput'
import { QuickActions } from './QuickActions'
import { SubmittedPrompt } from './SubmittedPrompt'
import { ResponseArea } from './ResponseArea'
import { ActionBar } from './ActionBar'
import { PermissionBanner } from './PermissionBanner'

export function PromptWindow(): React.JSX.Element {
  const { state, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection } =
    usePromptState()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss()
        return
      }
      if (state.phase === 'complete') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !window.getSelection()?.toString()) {
          e.preventDefault()
          copyResponse()
        }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
          e.preventDefault()
          replaceSelection()
        }
      }
    },
    [state.phase, dismiss, copyResponse, replaceSelection]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const showContextBar = state.phase === 'context' ||
    ((state.phase === 'streaming' || state.phase === 'complete') && state.contextText !== null)

  const showInput = state.phase === 'empty' || state.phase === 'context'
  const showQuickActions = state.phase === 'context'
  const showSubmitted = state.phase === 'streaming' || state.phase === 'complete'
  const showResponse = state.phase === 'streaming' || state.phase === 'complete'
  const showActionBar = state.phase === 'complete'

  return (
    <div style={{
      background: '#0a0a0f',
      border: '1px solid rgba(0,212,255,0.15)',
      borderRadius: 16,
      boxShadow: '0 0 30px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      animation: 'promptFadeIn 150ms ease-out',
    }}>
      <PermissionBanner />

      {showContextBar && (
        <ContextBar text={
          state.phase === 'context'
            ? state.contextText
            : (state as { contextText: string | null }).contextText ?? ''
        } />
      )}

      {showInput && (
        <PromptInput
          hasContext={state.phase === 'context'}
          onSubmit={submitPrompt}
          onDismiss={dismiss}
        />
      )}

      {showQuickActions && (
        <QuickActions
          actions={DEFAULT_QUICK_ACTIONS}
          onSelect={submitQuickAction}
        />
      )}

      {showSubmitted && (
        <SubmittedPrompt
          quickAction={(state as { quickAction: string | null }).quickAction}
          prompt={(state as { submittedPrompt: string | null }).submittedPrompt}
        />
      )}

      {showResponse && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponseArea
            content={(state as { response: string }).response}
            isStreaming={state.phase === 'streaming'}
          />
        </div>
      )}

      {showActionBar && (
        <ActionBar
          onDismiss={dismiss}
          onCopy={copyResponse}
          onReplace={replaceSelection}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add animation keyframes to globals.css**

Append to `src/renderer/src/globals.css` (after the cursorBlink keyframes):

```css

@keyframes promptFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/PromptWindow.tsx src/renderer/src/globals.css
git commit -m "feat: PromptWindow shell orchestrating all child components"
```

---

### Task 8: App.tsx integration and final wiring

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/globals.css`

- [ ] **Step 1: Update globals.css for transparent body**

Replace the `body` styles in `src/renderer/src/globals.css`:

```css
html, body {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
}
```

- [ ] **Step 2: Replace App.tsx**

Replace `src/renderer/src/App.tsx`:

```tsx
import { PromptWindow } from './components/PromptWindow'

function App(): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 80,
      minHeight: '100vh',
    }}>
      <div style={{ width: 560 }}>
        <PromptWindow />
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Manual verification**

```bash
npm run build:native && npm run dev
```

Expected:
- Press `Cmd+Shift+Space` → prompt window appears with Spotlight-style input
- With no text selected → State 1: "Ask anything..." placeholder, Esc badge
- With text selected → State 2: context bar + "What should I do with this?" + quick action chips
- Type a prompt and press Enter → State 3: submitted prompt shown, response area appears (empty until M5 provides responses)
- Click a quick action → State 3: quick action badge shown
- Esc dismisses and clears state

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/globals.css
git commit -m "feat: integrate PromptWindow into App with transparent background"
```

---

## Summary

After completing all 8 tasks, M3 delivers:

- Prompt state machine (pure reducer) with 9 unit tests covering all transitions
- 7 React components matching the approved mockup styling exactly
- Spotlight-style input (empty state) with search icon and Esc badge
- Context bar with truncated text, expandable on click
- Quick action chips (Rewrite, Summarize, Fix Grammar, Translate, Explain)
- Streaming response area with react-markdown + syntax highlighting + blinking cursor
- Action bar with Copy, Replace, Dismiss buttons and keyboard shortcut hints
- Keyboard shortcuts: Esc (dismiss), ⌘C (copy response), ⌘⇧V (replace)
- IPC: dismiss window, copy-to-clipboard, output action handling in main process
- Transparent BrowserWindow with CSS-based styling (border, shadow, rounded corners)
- Fade-in + scale animation on appear (150ms)
