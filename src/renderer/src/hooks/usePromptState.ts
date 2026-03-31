import { useReducer, useEffect, useCallback, useState } from 'react'
import type { QuickAction, AppSettings } from '../../../shared/settings-types'
import { DEFAULT_SETTINGS } from '../../../shared/settings-types'

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
