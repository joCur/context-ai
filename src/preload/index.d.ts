import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction,
  PermissionStatus
} from '../shared/ipc'

export interface ContextAIAPI {
  onSelectedText(callback: (data: SelectedText) => void): () => void
  submitPrompt(submission: PromptSubmission): void
  onStreamToken(callback: (data: StreamToken) => void): () => void
  onStreamDone(callback: () => void): () => void
  onStreamError(callback: (error: StreamError) => void): () => void
  executeOutputAction(action: OutputAction, responseText?: string): void
  onPermissionStatus(callback: (status: PermissionStatus) => void): () => void
  requestAccessibilityPermission(): void
  dismiss(): void
}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
