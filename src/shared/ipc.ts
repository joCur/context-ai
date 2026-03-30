export const IPC = {
  SELECTED_TEXT: 'context:selected-text',
  PROMPT_SUBMIT: 'prompt:submit',
  STREAM_TOKEN: 'stream:token',
  STREAM_DONE: 'stream:done',
  STREAM_ERROR: 'stream:error',
  OUTPUT_ACTION: 'output:execute',
} as const

export interface SelectedText {
  text: string
  method: 'accessibility' | 'clipboard'
}

export interface PromptSubmission {
  prompt: string
  context: string | null
  model: string
}

export interface StreamToken {
  content: string
}

export interface StreamError {
  message: string
}

export type OutputAction = 'display' | 'copy' | 'replace'
