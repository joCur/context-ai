import { useEffect, useCallback } from 'react'
import { usePromptState, DEFAULT_QUICK_ACTIONS } from '../hooks/usePromptState'
import { ContextBar } from './ContextBar'
import { PromptInput } from './PromptInput'
import { QuickActions } from './QuickActions'
import { SubmittedPrompt } from './SubmittedPrompt'
import { ResponseArea } from './ResponseArea'
import { ActionBar } from './ActionBar'
import { PermissionBanner } from './PermissionBanner'

export function PromptWindow(): React.JSX.Element {
  const { state, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection } =
    usePromptState()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss()
        return
      }
      if (state.phase === 'complete') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !window.getSelection()?.toString()) {
          e.preventDefault()
          copyResponse()
        }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
          e.preventDefault()
          replaceSelection()
        }
      }
    },
    [state.phase, dismiss, copyResponse, replaceSelection]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const showContextBar = state.phase === 'context' ||
    ((state.phase === 'streaming' || state.phase === 'complete') && state.contextText !== null)

  const showInput = state.phase === 'empty' || state.phase === 'context'
  const showQuickActions = state.phase === 'context'
  const showSubmitted = state.phase === 'streaming' || state.phase === 'complete'
  const showResponse = state.phase === 'streaming' || state.phase === 'complete'
  const showActionBar = state.phase === 'complete'

  return (
    <div style={{
      background: '#0a0a0f',
      border: '1px solid rgba(0,212,255,0.15)',
      borderRadius: 16,
      boxShadow: '0 0 30px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      animation: 'promptFadeIn 150ms ease-out',
    }}>
      <PermissionBanner />

      {showContextBar && (
        <ContextBar text={
          state.phase === 'context'
            ? state.contextText
            : (state as { contextText: string | null }).contextText ?? ''
        } />
      )}

      {showInput && (
        <PromptInput
          hasContext={state.phase === 'context'}
          onSubmit={submitPrompt}
          onDismiss={dismiss}
        />
      )}

      {showQuickActions && (
        <QuickActions
          actions={DEFAULT_QUICK_ACTIONS}
          onSelect={submitQuickAction}
        />
      )}

      {showSubmitted && (
        <SubmittedPrompt
          quickAction={(state as { quickAction: string | null }).quickAction}
          prompt={(state as { submittedPrompt: string | null }).submittedPrompt}
        />
      )}

      {showResponse && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponseArea
            content={(state as { response: string }).response}
            isStreaming={state.phase === 'streaming'}
          />
        </div>
      )}

      {showActionBar && (
        <ActionBar
          onDismiss={dismiss}
          onCopy={copyResponse}
          onReplace={replaceSelection}
        />
      )}
    </div>
  )
}
