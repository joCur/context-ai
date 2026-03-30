import { useState } from 'react'

interface ContextBarProps {
  text: string
}

export function ContextBar({ text }: ContextBarProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        borderLeft: '3px solid #00d4ff',
        margin: '12px 14px 8px 14px',
        padding: '6px 12px',
        background: 'rgba(0,212,255,0.04)',
        borderRadius: '0 8px 8px 0',
        cursor: 'pointer',
      }}
    >
      <div style={{
        color: '#e4e4e7',
        fontSize: 13,
        ...(expanded
          ? { whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const }
          : { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }
        ),
      }}>
        {text}
      </div>
    </div>
  )
}
