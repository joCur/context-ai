# M5: OpenRouter Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock streaming response with real OpenRouter API calls, using settings for API key, model, system prompt, temperature, and max tokens.

**Architecture:** A new `openrouter.ts` module in the main process handles streaming SSE requests to the OpenRouter chat completions endpoint. The `PROMPT_SUBMIT` IPC handler reads settings, constructs the request, and streams tokens back to the renderer. Error handling covers missing API key, missing model, network errors, and API errors.

**Tech Stack:** OpenRouter API (OpenAI-compatible), Server-Sent Events (SSE), Electron `net.fetch`

---

## File Map

```
src/main/
├── openrouter.ts              # (create) Streaming OpenRouter client
├── ipc.ts                     # (modify) Replace mock with real OpenRouter calls
└── __tests__/
    └── openrouter.test.ts     # (create) Tests for request construction
```

---

### Task 1: OpenRouter streaming client (TDD)

**Files:**
- Create: `src/main/openrouter.ts`
- Create: `src/main/__tests__/openrouter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/main/__tests__/openrouter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildChatRequest } from '../openrouter'

describe('buildChatRequest', () => {
  it('constructs request with prompt only (no context)', () => {
    const req = buildChatRequest({
      prompt: 'Hello',
      context: null,
      model: 'openai/gpt-4o',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 2048,
    })

    expect(req.model).toBe('openai/gpt-4o')
    expect(req.stream).toBe(true)
    expect(req.temperature).toBe(0.7)
    expect(req.max_tokens).toBe(2048)
    expect(req.messages).toHaveLength(1)
    expect(req.messages[0]).toEqual({ role: 'user', content: 'Hello' })
  })

  it('constructs request with context appended to user message', () => {
    const req = buildChatRequest({
      prompt: 'Summarize this',
      context: 'Some selected text',
      model: 'openai/gpt-4o',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 2048,
    })

    expect(req.messages).toHaveLength(1)
    expect(req.messages[0].content).toBe('Summarize this\n\nContext:\nSome selected text')
  })

  it('includes system prompt when provided', () => {
    const req = buildChatRequest({
      prompt: 'Hello',
      context: null,
      model: 'openai/gpt-4o',
      systemPrompt: 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 2048,
    })

    expect(req.messages).toHaveLength(2)
    expect(req.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' })
    expect(req.messages[1]).toEqual({ role: 'user', content: 'Hello' })
  })

  it('includes system prompt and context together', () => {
    const req = buildChatRequest({
      prompt: 'Fix grammar',
      context: 'teh quick brown fox',
      model: 'anthropic/claude-sonnet-4-20250514',
      systemPrompt: 'Be concise.',
      temperature: 0.3,
      maxTokens: 1024,
    })

    expect(req.model).toBe('anthropic/claude-sonnet-4-20250514')
    expect(req.temperature).toBe(0.3)
    expect(req.max_tokens).toBe(1024)
    expect(req.messages).toHaveLength(2)
    expect(req.messages[0]).toEqual({ role: 'system', content: 'Be concise.' })
    expect(req.messages[1].content).toBe('Fix grammar\n\nContext:\nteh quick brown fox')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/main/__tests__/openrouter.test.ts
```

Expected: FAIL — cannot find module `../openrouter`

- [ ] **Step 3: Implement the OpenRouter module**

Create `src/main/openrouter.ts`:

```ts
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  model: string
  messages: ChatMessage[]
  stream: true
  temperature: number
  max_tokens: number
}

interface BuildRequestParams {
  prompt: string
  context: string | null
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export function buildChatRequest(params: BuildRequestParams): ChatRequest {
  const messages: ChatMessage[] = []

  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt })
  }

  let userContent = params.prompt
  if (params.context) {
    userContent += '\n\nContext:\n' + params.context
  }
  messages.push({ role: 'user', content: userContent })

  return {
    model: params.model,
    messages,
    stream: true,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  }
}

export interface StreamCallbacks {
  onToken: (content: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export async function streamChatCompletion(
  apiKey: string,
  request: ChatRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/joCur/context-ai',
        'X-Title': 'Context AI',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const body = await response.text()
      let message = `API error: ${response.status}`
      try {
        const parsed = JSON.parse(body)
        if (parsed.error?.message) message = parsed.error.message
      } catch {}
      callbacks.onError(message)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone()
          return
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            callbacks.onToken(content)
          }
        } catch {}
      }
    }

    callbacks.onDone()
  } catch (err) {
    callbacks.onError((err as Error).message)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/main/__tests__/openrouter.test.ts
```

Expected: all 4 tests PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/openrouter.ts src/main/__tests__/openrouter.test.ts
git commit -m "feat: OpenRouter streaming client with request construction"
```

---

### Task 2: Replace mock with real OpenRouter streaming

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/main/index.ts` (pass settings store to setupIPC)

- [ ] **Step 1: Update setupIPC to accept settings store**

In `src/main/ipc.ts`, update the imports:

```ts
import { ipcMain, clipboard, type BrowserWindow } from 'electron'
import { IPC, type PromptSubmission, type OutputAction } from '../shared/ipc'
import { checkAccessibilityPermission } from './context-bridge'
import { buildChatRequest, streamChatCompletion } from './openrouter'
import type { SettingsStore } from './settings-store'
```

Update the function signature:

```ts
export function setupIPC(promptWindow: BrowserWindow, settingsStore: SettingsStore): void {
```

Replace the mock `PROMPT_SUBMIT` handler with:

```ts
  ipcMain.on(IPC.PROMPT_SUBMIT, (_event, submission: PromptSubmission) => {
    const settings = settingsStore.getAll()

    if (!settings.apiKey) {
      sendStreamError(promptWindow, 'No API key configured. Open Settings → AI Provider to add your OpenRouter API key.')
      return
    }

    if (!settings.model) {
      sendStreamError(promptWindow, 'No model selected. Open Settings → AI Provider to choose a model.')
      return
    }

    const request = buildChatRequest({
      prompt: submission.prompt,
      context: submission.context,
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    })

    streamChatCompletion(settings.apiKey, request, {
      onToken: (content) => sendStreamToken(promptWindow, content),
      onDone: () => sendStreamDone(promptWindow),
      onError: (message) => sendStreamError(promptWindow, message),
    })
  })
```

- [ ] **Step 2: Update main/index.ts to pass settings store to setupIPC**

In `src/main/index.ts`, find the `setupIPC(promptWindow)` call and change it to:

```ts
  setupIPC(promptWindow, settingsStore)
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS (existing IPC tests mock electron so the new import doesn't break them)

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts src/main/index.ts
git commit -m "feat: replace mock streaming with real OpenRouter API calls"
```

---

### Task 3: Handle streaming errors in the prompt window UI

The prompt window already handles `STREAM_ERROR` via the reducer (appends "Error: ..." to response and transitions to complete). But the error from "no API key" arrives when the state is still in the `context` or `empty` phase, not `streaming`.

**Files:**
- Modify: `src/renderer/src/hooks/usePromptState.ts`

- [ ] **Step 1: Update reducer to handle errors from any non-empty phase**

In `src/renderer/src/hooks/usePromptState.ts`, update the `STREAM_ERROR` case in the reducer:

Replace:

```ts
    case 'STREAM_ERROR':
      if (state.phase !== 'streaming') return state
      return {
        ...state,
        phase: 'complete',
        response: state.response + '\n\nError: ' + action.message
      }
```

With:

```ts
    case 'STREAM_ERROR':
      if (state.phase === 'empty') return state
      if (state.phase === 'streaming') {
        return {
          ...state,
          phase: 'complete',
          response: state.response + '\n\nError: ' + action.message,
        }
      }
      // Error received before streaming started (e.g., no API key)
      return {
        phase: 'complete',
        contextText: state.phase === 'context' ? state.contextText : null,
        submittedPrompt: null,
        quickAction: null,
        response: 'Error: ' + action.message,
      }
```

- [ ] **Step 2: Update the reducer tests**

In `src/renderer/src/hooks/__tests__/promptReducer.test.ts`, add a test:

```ts
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

    it('handles error before streaming started (e.g., no API key)', () => {
      const prev: PromptState = { phase: 'context', contextText: 'text' }
      const state = promptReducer(prev, { type: 'STREAM_ERROR', message: 'No API key configured.' })
      expect(state).toEqual({
        phase: 'complete',
        contextText: 'text',
        submittedPrompt: null,
        quickAction: null,
        response: 'Error: No API key configured.',
      })
    })
  })
```

Note: the existing STREAM_ERROR test stays, just add the new one.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/hooks/usePromptState.ts src/renderer/src/hooks/__tests__/promptReducer.test.ts
git commit -m "feat: handle config errors (no API key/model) in prompt window"
```

---

## Summary

After completing all 3 tasks, M5 delivers:

- Real OpenRouter streaming via SSE (replaces mock)
- Request construction with system prompt, context, temperature, max tokens from settings
- Inline error messages when API key or model not configured
- Error handling for network failures and API errors
- 4 new tests for request construction + 1 new error handling test
- Model list fetching already done in M4 (issue #23 can be closed)
