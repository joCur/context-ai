import { describe, it, expect } from 'vitest'
import { buildChatRequest } from '../openrouter'

const BASE_PROMPT = 'Respond with only the requested result. Do not include explanations, commentary, or additional text unless explicitly asked. Your output should be directly usable — ready to copy or insert as-is.'

describe('buildChatRequest', () => {
  it('always includes base system prompt', () => {
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
    expect(req.messages).toHaveLength(2)
    expect(req.messages[0]).toEqual({ role: 'system', content: BASE_PROMPT })
    expect(req.messages[1]).toEqual({ role: 'user', content: 'Hello' })
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

    expect(req.messages).toHaveLength(2)
    expect(req.messages[1].content).toBe('Summarize this\n\nContext:\nSome selected text')
  })

  it('appends user system prompt to base prompt', () => {
    const req = buildChatRequest({
      prompt: 'Hello',
      context: null,
      model: 'openai/gpt-4o',
      systemPrompt: 'Always respond in German.',
      temperature: 0.7,
      maxTokens: 2048,
    })

    expect(req.messages).toHaveLength(2)
    expect(req.messages[0].content).toBe(BASE_PROMPT + '\n\nAlways respond in German.')
    expect(req.messages[1]).toEqual({ role: 'user', content: 'Hello' })
  })

  it('includes user system prompt and context together', () => {
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
    expect(req.messages[0].content).toBe(BASE_PROMPT + '\n\nBe concise.')
    expect(req.messages[1].content).toBe('Fix grammar\n\nContext:\nteh quick brown fox')
  })
})
