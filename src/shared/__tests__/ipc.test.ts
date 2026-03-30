import { describe, it, expect } from 'vitest'
import {
  IPC,
  type SelectedText,
  type PromptSubmission,
  type StreamToken,
  type StreamError,
  type OutputAction
} from '../ipc'

describe('IPC channels', () => {
  it('defines all required channel names', () => {
    expect(IPC.SELECTED_TEXT).toBe('context:selected-text')
    expect(IPC.PROMPT_SUBMIT).toBe('prompt:submit')
    expect(IPC.STREAM_TOKEN).toBe('stream:token')
    expect(IPC.STREAM_DONE).toBe('stream:done')
    expect(IPC.STREAM_ERROR).toBe('stream:error')
    expect(IPC.OUTPUT_ACTION).toBe('output:execute')
  })

  it('SelectedText has required shape', () => {
    const data: SelectedText = { text: 'hello', method: 'accessibility' }
    expect(data.text).toBe('hello')
    expect(data.method).toBe('accessibility')
  })

  it('SelectedText accepts clipboard method', () => {
    const data: SelectedText = { text: 'world', method: 'clipboard' }
    expect(data.method).toBe('clipboard')
  })

  it('PromptSubmission has required shape', () => {
    const submission: PromptSubmission = {
      prompt: 'Summarize this',
      context: 'Some selected text',
      model: 'openai/gpt-4o'
    }
    expect(submission.prompt).toBe('Summarize this')
    expect(submission.context).toBe('Some selected text')
    expect(submission.model).toBe('openai/gpt-4o')
  })

  it('PromptSubmission context can be null', () => {
    const submission: PromptSubmission = {
      prompt: 'Hello',
      context: null,
      model: 'openai/gpt-4o'
    }
    expect(submission.context).toBeNull()
  })

  it('StreamToken has content string', () => {
    const token: StreamToken = { content: 'Hello' }
    expect(token.content).toBe('Hello')
  })

  it('StreamError has message string', () => {
    const error: StreamError = { message: 'Rate limited' }
    expect(error.message).toBe('Rate limited')
  })

  it('OutputAction is a valid union value', () => {
    const actions: OutputAction[] = ['display', 'copy', 'replace']
    expect(actions).toHaveLength(3)
    expect(actions).toContain('display')
    expect(actions).toContain('copy')
    expect(actions).toContain('replace')
  })
})
