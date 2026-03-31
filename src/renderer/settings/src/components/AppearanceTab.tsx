import type { AppSettings } from '../../../../../shared/settings-types'

const APPEARANCE_DEFAULTS = {
  accentColor: '#00d4ff',
  promptWindowWidth: 560,
  fontSize: 14,
}

interface AppearanceTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#a1a1aa',
  marginBottom: 6,
  display: 'block',
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

const resetButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid #27272a',
  borderRadius: 6,
  color: '#71717a',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export function AppearanceTab({ settings, onUpdate }: AppearanceTabProps): React.JSX.Element {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ ...headingStyle, marginBottom: 0 }}>Appearance</h2>
        <button
          onClick={() => {
            onUpdate('accentColor', APPEARANCE_DEFAULTS.accentColor)
            onUpdate('promptWindowWidth', APPEARANCE_DEFAULTS.promptWindowWidth)
            onUpdate('fontSize', APPEARANCE_DEFAULTS.fontSize)
          }}
          style={{
            ...resetButtonStyle,
            color: '#a1a1aa',
          }}
        >
          Reset All to Defaults
        </button>
      </div>

      {/* Accent Color */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Accent Color</label>
          {settings.accentColor !== APPEARANCE_DEFAULTS.accentColor && (
            <button onClick={() => onUpdate('accentColor', APPEARANCE_DEFAULTS.accentColor)} style={resetButtonStyle}>
              Reset
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="color"
            value={settings.accentColor}
            onChange={(e) => onUpdate('accentColor', e.target.value)}
            style={{
              width: 40,
              height: 40,
              border: '1px solid #27272a',
              borderRadius: 8,
              background: '#1a1a2e',
              cursor: 'pointer',
              padding: 2,
            }}
          />
          <input
            type="text"
            value={settings.accentColor}
            onChange={(e) => {
              const val = e.target.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                onUpdate('accentColor', val)
              }
            }}
            style={{
              ...inputStyle,
              width: 120,
              fontFamily: 'monospace',
            }}
          />
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: settings.accentColor,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
        <p style={descriptionStyle}>
          Applied as the primary accent color throughout the app.
        </p>
      </div>

      {/* Prompt Window Width */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Prompt Window Width: {settings.promptWindowWidth}px
          </label>
          {settings.promptWindowWidth !== APPEARANCE_DEFAULTS.promptWindowWidth && (
            <button onClick={() => onUpdate('promptWindowWidth', APPEARANCE_DEFAULTS.promptWindowWidth)} style={resetButtonStyle}>
              Reset
            </button>
          )}
        </div>
        <input
          type="range"
          min={400}
          max={800}
          step={10}
          value={settings.promptWindowWidth}
          onChange={(e) => onUpdate('promptWindowWidth', Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#00d4ff',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#71717a',
        }}>
          <span>400px</span>
          <span>800px</span>
        </div>
      </div>

      {/* Font Size */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Font Size: {settings.fontSize}px
          </label>
          {settings.fontSize !== APPEARANCE_DEFAULTS.fontSize && (
            <button onClick={() => onUpdate('fontSize', APPEARANCE_DEFAULTS.fontSize)} style={resetButtonStyle}>
              Reset
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={settings.fontSize}
            onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#00d4ff',
            }}
          />
          <input
            type="number"
            min={10}
            max={20}
            value={settings.fontSize}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val) && val >= 10 && val <= 20) {
                onUpdate('fontSize', val)
              }
            }}
            style={{
              ...inputStyle,
              width: 60,
              textAlign: 'center',
            }}
          />
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: 16,
        background: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid #27272a',
      }}>
        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 8 }}>Preview</div>
        <div style={{
          padding: 12,
          background: '#0a0a0f',
          borderRadius: 8,
          border: `1px solid ${settings.accentColor}33`,
          fontSize: settings.fontSize,
          color: '#fafafa',
          maxWidth: settings.promptWindowWidth,
        }}>
          <span style={{ color: settings.accentColor }}>Context AI</span> — This is how your prompt window text will look at {settings.fontSize}px.
        </div>
      </div>
    </div>
  )
}
