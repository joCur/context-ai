import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction
} from '../shared/ipc'

export interface ContextAIAPI {
  onSelectedText(callback: (data: SelectedText) => void): () => void
  submitPrompt(submission: PromptSubmission): void
  onStreamToken(callback: (data: StreamToken) => void): () => void
  onStreamDone(callback: () => void): () => void
  onStreamError(callback: (error: StreamError) => void): () => void
  executeOutputAction(action: OutputAction): void
}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
