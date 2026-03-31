import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../../../shared/settings-types'
import { DEFAULT_SETTINGS } from '../../../../shared/settings-types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.settingsApi.getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })

    const unsub = window.settingsApi.onSettingsChanged((updated) => {
      setSettings(updated)
    })

    return unsub
  }, [])

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const updated = await window.settingsApi.setSetting(key, value)
      setSettings(updated)
    },
    []
  )

  return { settings, loading, updateSetting }
}
