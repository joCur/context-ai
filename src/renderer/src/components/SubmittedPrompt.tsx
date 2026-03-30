interface SubmittedPromptProps {
  quickAction: string | null
  prompt: string | null
}

export function SubmittedPrompt({ quickAction, prompt }: SubmittedPromptProps): React.JSX.Element {
  return (
    <div style={{ padding: '4px 18px 10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {quickAction ? (
        <>
          <span style={{
            background: 'rgba(0,212,255,0.12)',
            color: '#00d4ff',
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 12,
          }}>
            {quickAction}
          </span>
          <span style={{ color: '#71717a', fontSize: 12 }}>Quick action</span>
        </>
      ) : (
        <span style={{ color: '#e4e4e7', fontSize: 14 }}>{prompt}</span>
      )}
    </div>
  )
}
