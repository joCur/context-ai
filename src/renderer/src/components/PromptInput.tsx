import { useRef, useEffect } from 'react'

interface PromptInputProps {
  hasContext: boolean
  onSubmit: (prompt: string) => void
  onDismiss: () => void
}

export function PromptInput({ hasContext, onSubmit, onDismiss }: PromptInputProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      onDismiss()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const value = inputRef.current?.value.trim()
      if (value) {
        onSubmit(value)
      }
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.6 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <textarea
        ref={inputRef}
        placeholder={hasContext ? 'What should I do with this?' : 'Ask anything...'}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fafafa',
          fontSize: 15,
          fontFamily: 'inherit',
          resize: 'none',
          lineHeight: '1.4',
        }}
      />
      <div style={{
        color: '#3f3f46',
        fontSize: 11,
        border: '1px solid #27272a',
        borderRadius: 4,
        padding: '2px 6px',
        flexShrink: 0,
      }}>
        Esc
      </div>
    </div>
  )
}
