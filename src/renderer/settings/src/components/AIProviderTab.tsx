import { useState, useCallback, useEffect, useRef } from 'react'
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

function ModelCombobox({
  value,
  models,
  disabled,
  fetching,
  onChange,
}: {
  value: string
  models: OpenRouterModel[]
  disabled: boolean
  fetching: boolean
  onChange: (id: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = search
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : models

  const selectedName = models.find((m) => m.id === value)?.name || value || ''

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (disabled) {
    return (
      <div style={{
        ...inputStyle,
        opacity: 0.5,
        cursor: 'not-allowed',
      }}>
        {fetching ? 'Fetching models...' : 'Select a model'}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedName || 'Select a model'}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginLeft: 8 }}>
          <path fill="#a1a1aa" d="M3 5l3 3 3-3" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: '#1a1a2e',
          border: '1px solid #27272a',
          borderRadius: 8,
          zIndex: 50,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: 8 }}>
            <input
              autoFocus
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                }
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#0a0a0f',
                border: '1px solid #27272a',
                borderRadius: 6,
                color: '#fafafa',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 16px', color: '#71717a', fontSize: 13 }}>
                No models found
              </div>
            ) : (
              filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onChange(m.id)
                    setOpen(false)
                    setSearch('')
                  }}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: m.id === value ? '#00d4ff' : '#fafafa',
                    background: m.id === value ? 'rgba(0,212,255,0.06)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      m.id === value ? 'rgba(0,212,255,0.06)' : 'transparent'
                  }}
                >
                  <div>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>{m.id}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
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
        <ModelCombobox
          value={settings.model}
          models={models}
          disabled={!settings.apiKey || fetching}
          fetching={fetching}
          onChange={(id) => onUpdate('model', id)}
        />
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
          placeholder="Additional instructions appended to the base system prompt..."
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
