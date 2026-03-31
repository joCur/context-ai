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
