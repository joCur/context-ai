import { useState, useCallback, useEffect } from 'react'
import type { AppSettings } from '../../../../../shared/settings-types'

interface OpenRouterModel {
  id: string
  name: string
}

interface AIProviderTabProps {
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

const inputStyle: React.CSSProperties = {
  width: '100%',
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

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#71717a',
  marginTop: 4,
}

export function AIProviderTab({ settings, onUpdate }: AIProviderTabProps): React.JSX.Element {
  const [showKey, setShowKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Sync external changes
  useEffect(() => {
    setApiKeyInput(settings.apiKey)
  }, [settings.apiKey])

  const saveApiKey = useCallback(async () => {
    if (apiKeyInput === settings.apiKey) return
    onUpdate('apiKey', apiKeyInput)

    if (apiKeyInput) {
      setFetching(true)
      setFetchError(null)
      const result = await window.settingsApi.fetchModels(apiKeyInput)
      setFetching(false)
      if (result.error) {
        setFetchError(result.error)
        setModels([])
      } else if (result.models) {
        setModels(result.models)
        setFetchError(null)
      }
    }
  }, [apiKeyInput, settings.apiKey, onUpdate])

  // Fetch models on mount if API key exists
  useEffect(() => {
    if (settings.apiKey) {
      setFetching(true)
      window.settingsApi.fetchModels(settings.apiKey).then((result) => {
        setFetching(false)
        if (result.models) {
          setModels(result.models)
        } else if (result.error) {
          setFetchError(result.error)
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 style={headingStyle}>AI Provider</h2>

      {/* API Key */}
      <div style={sectionStyle}>
        <label style={labelStyle}>OpenRouter API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={saveApiKey}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveApiKey()
              }}
              placeholder="sk-or-..."
              style={inputStyle}
            />
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: '8px 12px',
              background: '#1a1a2e',
              border: '1px solid #27272a',
              borderRadius: 8,
              color: '#a1a1aa',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p style={descriptionStyle}>
          Your API key is encrypted locally via system keychain.
        </p>
        {fetchError && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
            {fetchError}
          </p>
        )}
      </div>

      {/* Model Selector */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Model</label>
        <select
          value={settings.model}
          onChange={(e) => onUpdate('model', e.target.value)}
          disabled={!settings.apiKey || fetching}
          style={{
            ...inputStyle,
            cursor: settings.apiKey && !fetching ? 'pointer' : 'not-allowed',
            opacity: !settings.apiKey || fetching ? 0.5 : 1,
            appearance: 'none',
            paddingRight: 32,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="">
            {fetching ? 'Fetching models...' : 'Select a model'}
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {!settings.apiKey && (
          <p style={descriptionStyle}>
            Enter an API key to load available models.
          </p>
        )}
      </div>

      {/* System Prompt */}
      <div style={sectionStyle}>
        <label style={labelStyle}>System Prompt</label>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => onUpdate('systemPrompt', e.target.value)}
          placeholder="Optional system prompt prepended to every request..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: 80,
          }}
        />
      </div>

      {/* Temperature */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Temperature: {settings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => onUpdate('temperature', Number(e.target.value))}
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
          <span>0.0 (precise)</span>
          <span>2.0 (creative)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Max Tokens</label>
        <input
          type="number"
          value={settings.maxTokens}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            if (!isNaN(val) && val > 0) {
              onUpdate('maxTokens', val)
            }
          }}
          min={1}
          style={{
            ...inputStyle,
            width: 150,
          }}
        />
        <p style={descriptionStyle}>
          Maximum number of tokens in the response.
        </p>
      </div>
    </div>
  )
}
