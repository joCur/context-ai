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
