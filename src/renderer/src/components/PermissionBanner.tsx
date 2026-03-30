import { useEffect, useState } from 'react'

export function PermissionBanner(): React.JSX.Element | null {
  const [needsPermission, setNeedsPermission] = useState(false)

  useEffect(() => {
    return window.api.onPermissionStatus((status) => {
      setNeedsPermission(!status.accessibility)
    })
  }, [])

  if (!needsPermission) return null

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-md p-3 mx-4 mt-4">
      <p className="text-sm text-muted-foreground mb-2">
        Accessibility permission is required to capture selected text.
      </p>
      <button
        className="text-sm font-medium text-accent hover:text-accent/80"
        onClick={() => window.api.requestAccessibilityPermission()}
      >
        Grant Access in System Settings
      </button>
    </div>
  )
}
