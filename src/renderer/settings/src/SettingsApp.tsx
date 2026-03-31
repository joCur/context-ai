import { useState } from 'react'
import { Sidebar, type TabId } from './components/Sidebar'
import { GeneralTab } from './components/GeneralTab'
import { AIProviderTab } from './components/AIProviderTab'
import { QuickActionsTab } from './components/QuickActionsTab'
import { AppearanceTab } from './components/AppearanceTab'
import { useSettings } from './hooks/useSettings'

export function SettingsApp(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const { settings, loading, updateSetting } = useSettings()

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a1a1aa',
        fontSize: 14,
      }}>
        Loading settings...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: '100%',
    }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: 32,
      }}>
        {activeTab === 'general' && (
          <GeneralTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'ai-provider' && (
          <AIProviderTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'quick-actions' && (
          <QuickActionsTab settings={settings} onUpdate={updateSetting} />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab settings={settings} onUpdate={updateSetting} />
        )}
      </main>
    </div>
  )
}
