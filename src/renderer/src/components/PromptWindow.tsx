import { useEffect, useCallback, useRef } from 'react'
import { usePromptState } from '../hooks/usePromptState'
import { ContextBar } from './ContextBar'
import { PromptInput } from './PromptInput'
import { QuickActions } from './QuickActions'
import { SubmittedPrompt } from './SubmittedPrompt'
import { ResponseArea } from './ResponseArea'
import { ActionBar } from './ActionBar'
import { PermissionBanner } from './PermissionBanner'
import { WelcomeScreen } from './WelcomeScreen'

export function PromptWindow(): React.JSX.Element {
  const { state, quickActions, settings, submitPrompt, submitQuickAction, dismiss, copyResponse, replaceSelection } =
    usePromptState()

  const accent = settings.accentColor || '#00d4ff'

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

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.borderBoxSize[0].blockSize)
        window.api.resizeWindow(height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const shellStyle = {
    width: settings.promptWindowWidth || 560,
    background: '#0a0a0f',
    border: `1px solid ${accent}26`,
    borderRadius: 16,
    boxShadow: `0 0 30px ${accent}0f, 0 8px 32px rgba(0,0,0,0.5)`,
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: settings.fontSize || 14,
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'promptFadeIn 150ms ease-out',
  }

  if (!settings.apiKey) {
    return (
      <div ref={containerRef} style={shellStyle}>
        <PermissionBanner />
        <WelcomeScreen onSetupApiKey={() => window.api.openSettings()} />
      </div>
    )
  }

  const showContextBar = state.phase === 'context' ||
    ((state.phase === 'streaming' || state.phase === 'complete') && state.contextText !== null)

  const showInput = state.phase === 'empty' || state.phase === 'context'
  const showQuickActions = state.phase === 'context'
  const showSubmitted = state.phase === 'streaming' || state.phase === 'complete'
  const showResponse = state.phase === 'streaming' || state.phase === 'complete'
  const showActionBar = state.phase === 'complete'

  return (
    <div ref={containerRef} style={shellStyle}>
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
          actions={quickActions}
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
