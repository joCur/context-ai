import type { AppSettings, OutputAction } from '../../../../../shared/settings-types'
import { HotkeyRecorder } from './HotkeyRecorder'

interface GeneralTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#a1a1aa',
  marginBottom: 6,
  display: 'block',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 24,
  marginTop: 0,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

const toggleContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0',
  borderBottom: '1px solid rgba(39,39,42,0.4)',
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (val: boolean) => void
}): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: checked ? '#00d4ff' : '#27272a',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 150ms',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? '#0a0a0f' : '#71717a',
          transition: 'left 150ms, background 150ms',
        }}
      />
    </button>
  )
}

const outputOptions: { value: OutputAction; label: string; description: string }[] = [
  { value: 'display', label: 'Display', description: 'Show response in the prompt window' },
  { value: 'copy', label: 'Copy to clipboard', description: 'Copy response and dismiss' },
  { value: 'replace', label: 'Replace selection', description: 'Replace selected text with response' },
]

export function GeneralTab({ settings, onUpdate }: GeneralTabProps): React.JSX.Element {
  return (
    <div>
      <h2 style={headingStyle}>General</h2>

      {/* Global Hotkey */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Global Hotkey</label>
        <HotkeyRecorder
          value={settings.hotkey}
          onChange={(hotkey) => onUpdate('hotkey', hotkey)}
        />
        <p style={descriptionStyle}>
          Click the field and press your desired key combination.
        </p>
      </div>

      {/* Default Output Action */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Default Output Action</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {outputOptions.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 8,
                background:
                  settings.defaultOutputAction === opt.value
                    ? 'rgba(0,212,255,0.06)'
                    : 'transparent',
                border: `1px solid ${
                  settings.defaultOutputAction === opt.value
                    ? 'rgba(0,212,255,0.2)'
                    : 'transparent'
                }`,
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              <input
                type="radio"
                name="outputAction"
                value={opt.value}
                checked={settings.defaultOutputAction === opt.value}
                onChange={() => onUpdate('defaultOutputAction', opt.value)}
                style={{ accentColor: '#00d4ff' }}
              />
              <div>
                <div style={{ fontSize: 13, color: '#fafafa' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Auto-dismiss */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Auto-dismiss after action</div>
          <div style={descriptionStyle}>
            Automatically hide the prompt window after an output action
          </div>
        </div>
        <Toggle
          checked={settings.autoDismiss}
          onChange={(val) => onUpdate('autoDismiss', val)}
        />
      </div>

      {/* Auto-dismiss delay slider */}
      {settings.autoDismiss && (
        <div style={{ padding: '12px 0', marginBottom: 4 }}>
          <label style={labelStyle}>
            Dismiss delay: {settings.autoDismissDelay}ms
          </label>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={settings.autoDismissDelay}
            onChange={(e) => onUpdate('autoDismissDelay', Number(e.target.value))}
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
            <span>500ms</span>
            <span>5000ms</span>
          </div>
        </div>
      )}

      {/* Hide on blur */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Hide on blur</div>
          <div style={descriptionStyle}>
            Hide the prompt window when clicking outside
          </div>
        </div>
        <Toggle
          checked={settings.hideOnBlur}
          onChange={(val) => onUpdate('hideOnBlur', val)}
        />
      </div>

      {/* Launch at startup */}
      <div style={toggleContainerStyle}>
        <div>
          <div style={{ fontSize: 13, color: '#fafafa' }}>Launch at startup</div>
          <div style={descriptionStyle}>
            Automatically start Context AI when you log in
          </div>
        </div>
        <Toggle
          checked={settings.launchAtStartup}
          onChange={(val) => onUpdate('launchAtStartup', val)}
        />
      </div>
    </div>
  )
}
