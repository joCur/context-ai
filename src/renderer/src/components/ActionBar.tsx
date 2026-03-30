interface ActionBarProps {
  onDismiss: () => void
  onCopy: () => void
  onReplace: () => void
}

const buttonBase: React.CSSProperties = {
  fontSize: 12,
  padding: '7px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

export function ActionBar({ onDismiss, onCopy, onReplace }: ActionBarProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onDismiss}
          style={{
            ...buttonBase,
            background: 'transparent',
            border: '1px solid #27272a',
            color: '#71717a',
          }}
        >
          Dismiss <span style={{ color: '#3f3f46' }}>Esc</span>
        </button>
        <button
          onClick={onCopy}
          style={{
            ...buttonBase,
            background: 'transparent',
            border: '1px solid #27272a',
            color: '#e4e4e7',
          }}
        >
          Copy <span style={{ color: '#3f3f46' }}>⌘C</span>
        </button>
        <button
          onClick={onReplace}
          style={{
            ...buttonBase,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#00d4ff',
          }}
        >
          Replace <span style={{ color: 'rgba(0,212,255,0.4)' }}>⌘⇧V</span>
        </button>
      </div>
    </>
  )
}
