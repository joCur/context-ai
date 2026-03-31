interface WelcomeScreenProps {
  onSetupApiKey: () => void
}

export function WelcomeScreen({ onSetupApiKey }: WelcomeScreenProps): React.JSX.Element {
  return (
    <div style={{
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, marginBottom: 4, color: '#fafafa' }}>Welcome to Context AI</div>
      <p style={{
        color: '#a1a1aa',
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 360,
        margin: 0,
      }}>
        Select text in any app, press the hotkey, and let AI help you rewrite, summarize, translate, and more.
      </p>
      <p style={{
        color: '#71717a',
        fontSize: 13,
        margin: 0,
      }}>
        To get started, configure your OpenRouter API key.
      </p>
      <button
        onClick={onSetupApiKey}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: 'rgba(0,212,255,0.1)',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 8,
          color: '#00d4ff',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Set up API Key
      </button>
    </div>
  )
}
