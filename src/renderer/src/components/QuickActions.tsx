interface QuickAction {
  name: string
  template: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  onSelect: (name: string, template: string) => void
}

export function QuickActions({ actions, onSelect }: QuickActionsProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
      }}>
        {actions.map((action) => (
          <button
            key={action.name}
            onClick={() => onSelect(action.name, action.template)}
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: '#00d4ff',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {action.name}
          </button>
        ))}
      </div>
    </>
  )
}
