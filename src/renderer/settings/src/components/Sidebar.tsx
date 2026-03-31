export type TabId = 'general' | 'ai-provider' | 'quick-actions' | 'appearance'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'ai-provider', label: 'AI Provider', icon: '🤖' },
  { id: 'quick-actions', label: 'Quick Actions', icon: '⚡' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps): React.JSX.Element {
  return (
    <nav style={{
      width: 200,
      minWidth: 200,
      borderRight: '1px solid #27272a',
      padding: '16px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            margin: '0 8px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === tab.id ? 'rgba(0,212,255,0.08)' : 'transparent',
            color: activeTab === tab.id ? '#00d4ff' : '#a1a1aa',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
