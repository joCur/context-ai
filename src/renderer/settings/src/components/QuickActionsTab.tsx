import { useState, useCallback, useRef } from 'react'
import type { AppSettings, QuickAction } from '../../../../../shared/settings-types'

interface QuickActionsTabProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
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

interface ActionFormData {
  name: string
  template: string
}

function ActionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ActionFormData
  onSave: (data: ActionFormData) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [template, setTemplate] = useState(initial?.template ?? '')

  return (
    <div style={{
      padding: 16,
      background: '#1a1a2e',
      borderRadius: 8,
      border: '1px solid #27272a',
      marginBottom: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div>
        <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rewrite"
          style={inputStyle}
          autoFocus
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4, display: 'block' }}>
          Template
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Use {{selection}} as a placeholder for selected text"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
        />
        <p style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>
          Use <code style={{ color: '#00d4ff', fontSize: 11 }}>{'{{selection}}'}</code> where the selected text should be inserted.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid #27272a',
            borderRadius: 6,
            color: '#a1a1aa',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim() && template.trim()) {
              onSave({ name: name.trim(), template: template.trim() })
            }
          }}
          disabled={!name.trim() || !template.trim()}
          style={{
            padding: '6px 14px',
            background: name.trim() && template.trim() ? 'rgba(0,212,255,0.1)' : '#1a1a2e',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 6,
            color: name.trim() && template.trim() ? '#00d4ff' : '#71717a',
            fontSize: 12,
            cursor: name.trim() && template.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export function QuickActionsTab({ settings, onUpdate }: QuickActionsTabProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const actions = settings.quickActions

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverItem.current = index
  }, [])

  const handleDrop = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return

    const reordered = [...actions]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)

    dragItem.current = null
    dragOverItem.current = null

    onUpdate('quickActions', reordered)
  }, [actions, onUpdate])

  const handleAdd = useCallback(
    (data: ActionFormData) => {
      const id = data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
      const newAction: QuickAction = { id, ...data }
      onUpdate('quickActions', [...actions, newAction])
      setShowAddForm(false)
    },
    [actions, onUpdate]
  )

  const handleEdit = useCallback(
    (id: string, data: ActionFormData) => {
      const updated = actions.map((a) => (a.id === id ? { ...a, ...data } : a))
      onUpdate('quickActions', updated)
      setEditingId(null)
    },
    [actions, onUpdate]
  )

  const handleDelete = useCallback(
    (id: string) => {
      const filtered = actions.filter((a) => a.id !== id)
      onUpdate('quickActions', filtered)
      setDeleteConfirmId(null)
    },
    [actions, onUpdate]
  )

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ ...headingStyle, marginBottom: 0 }}>Quick Actions</h2>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
          style={{
            padding: '6px 14px',
            background: showAddForm ? '#1a1a2e' : 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 6,
            color: showAddForm ? '#71717a' : '#00d4ff',
            fontSize: 12,
            cursor: showAddForm ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Add Action
        </button>
      </div>

      {showAddForm && (
        <ActionForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {actions.map((action, index) => (
          <div key={action.id}>
            {editingId === action.id ? (
              <ActionForm
                initial={{ name: action.name, template: action.template }}
                onSave={(data) => handleEdit(action.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#0a0a0f',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  cursor: 'grab',
                }}
              >
                {/* Drag handle */}
                <span style={{ color: '#3f3f46', fontSize: 14, cursor: 'grab', userSelect: 'none' }}>
                  ⠿
                </span>

                {/* Action info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#fafafa', fontWeight: 500 }}>
                    {action.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 300,
                  }}>
                    {action.template}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditingId(action.id)}
                    style={{
                      padding: '4px 10px',
                      background: 'transparent',
                      border: '1px solid #27272a',
                      borderRadius: 4,
                      color: '#a1a1aa',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === action.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(action.id)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 4,
                          color: '#ef4444',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: '1px solid #27272a',
                          borderRadius: 4,
                          color: '#a1a1aa',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(action.id)}
                      style={{
                        padding: '4px 10px',
                        background: 'transparent',
                        border: '1px solid #27272a',
                        borderRadius: 4,
                        color: '#a1a1aa',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {actions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 32,
          color: '#71717a',
          fontSize: 13,
        }}>
          No quick actions configured. Click "Add Action" to create one.
        </div>
      )}
    </div>
  )
}
