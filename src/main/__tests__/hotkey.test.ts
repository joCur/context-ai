import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn(() => true),
    unregister: vi.fn()
  }
}))

import { globalShortcut } from 'electron'
import { registerHotkey, unregisterHotkey, getCurrentAccelerator } from '../hotkey'

describe('hotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    unregisterHotkey()
  })

  it('registers a global hotkey and tracks the accelerator', () => {
    const callback = vi.fn()
    const success = registerHotkey('CmdOrCtrl+Shift+Space', callback)

    expect(success).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space',
      callback
    )
    expect(getCurrentAccelerator()).toBe('CmdOrCtrl+Shift+Space')
  })

  it('unregisters previous hotkey before registering a new one', () => {
    registerHotkey('CmdOrCtrl+Shift+Space', vi.fn())
    registerHotkey('CmdOrCtrl+Shift+A', vi.fn())

    expect(globalShortcut.unregister).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space'
    )
    expect(getCurrentAccelerator()).toBe('CmdOrCtrl+Shift+A')
  })

  it('returns false and clears accelerator when registration fails', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)

    const success = registerHotkey('Invalid+Key', vi.fn())

    expect(success).toBe(false)
    expect(getCurrentAccelerator()).toBeNull()
  })

  it('unregisters the current hotkey', () => {
    registerHotkey('CmdOrCtrl+Shift+Space', vi.fn())
    unregisterHotkey()

    expect(globalShortcut.unregister).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+Space'
    )
    expect(getCurrentAccelerator()).toBeNull()
  })

  it('does nothing when unregistering with no active hotkey', () => {
    unregisterHotkey()
    expect(globalShortcut.unregister).not.toHaveBeenCalled()
  })
})
