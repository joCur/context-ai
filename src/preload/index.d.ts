export interface ContextAIAPI {}

declare global {
  interface Window {
    api: ContextAIAPI
  }
}
