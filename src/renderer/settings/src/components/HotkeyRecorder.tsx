import { useState, useCallback, useRef, useEffect } from 'react'

interface HotkeyRecorderProps {
  value: string
  onChange: (hotkey: string) => void
}

function electronKeyName(e: React.KeyboardEvent): string | null {
  const key = e.key
  // Ignore standalone modifier presses
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('CmdOrCtrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // Normalize key names to Electron accelerator format
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Return',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Escape: 'Escape',
    Tab: 'Tab',
  }

  const normalized = keyMap[key] ?? key.toUpperCase()
  parts.push(normalized)

  return parts.join('+')
}

function formatForDisplay(accelerator: string): string {
  return accelerator
    .replace('CmdOrCtrl', '⌘')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace(/\+/g, ' ')
    .replace('Space', '␣')
}

export function HotkeyRecorder({ value, onChange }: HotkeyRecorderProps): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return
      e.preventDefault()
      e.stopPropagation()

      const combo = electronKeyName(e)
      if (combo) {
        onChange(combo)
        setRecording(false)
      }
    },
    [recording, onChange]
  )

  const handleClick = useCallback(() => {
    setRecording(true)
  }, [])

  const handleBlur = useCallback(() => {
    setRecording(false)
  }, [])

  useEffect(() => {
    if (recording && inputRef.current) {
      inputRef.current.focus()
    }
  }, [recording])

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        padding: '8px 12px',
        background: '#1a1a2e',
        border: `1px solid ${recording ? '#00d4ff' : '#27272a'}`,
        borderRadius: 8,
        color: recording ? '#00d4ff' : '#fafafa',
        fontSize: 13,
        fontFamily: 'monospace',
        cursor: 'pointer',
        outline: 'none',
        minWidth: 180,
        textAlign: 'center',
        transition: 'border-color 150ms',
      }}
    >
      {recording ? 'Press a key combo...' : formatForDisplay(value)}
    </div>
  )
}
