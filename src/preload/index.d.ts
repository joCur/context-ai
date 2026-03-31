import type {
  SelectedText,
  PromptSubmission,
  StreamToken,
  StreamError,
  OutputAction,
  PermissionStatus
} from '../shared/ipc'
import type { AppSettings } from '../shared/settings-types'

export interface ContextAIAPI {
  onSelectedText(callback: (data: SelectedText) => void): () => void
  submitPrompt(submission: PromptSubmission): void
  onStreamToken(callback: (data: StreamToken) => void): () => void
  onStreamDone(callback: () => void): () => void
  onStreamError(callback: (error: StreamError) => void): () => void
  executeOutputAction(action: OutputAction, responseText?: string): void
  onPermissionStatus(callback: (status: PermissionStatus) => void): () => void
  requestAccessibilityPermission(): void
  onWindowReset(callback: () => void): () => void
  resizeWindow(height: number): void
  dismiss(): void
  getSettings(): Promise<AppSettings>
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
