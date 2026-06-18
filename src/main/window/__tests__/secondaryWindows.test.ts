import { EventEmitter } from 'node:events'

class MockSession {
  setPermissionCheckHandler = vi.fn()
  setPermissionRequestHandler = vi.fn()
}

class MockWebContents {
  session = new MockSession()
  setWindowOpenHandler = vi.fn()
}

class MockBrowserWindow extends EventEmitter {
  webContents = new MockWebContents()
  loadURL = vi.fn()
  close = vi.fn()
  setBounds = vi.fn()
  setContentSize = vi.fn()
  setPosition = vi.fn()
  setFullScreen = vi.fn()
  setKiosk = vi.fn()
  getPosition = vi.fn(() => [100, 100])
  getContentSize = vi.fn(() => [800, 480])
  isDestroyed = vi.fn(() => false)
  isFullScreen = vi.fn(() => false)
  isKiosk = vi.fn(() => false)
  once(event: string, listener: (...args: unknown[]) => void): this {
    super.once(event, listener)
    return this
  }
}

const lastWindows: MockBrowserWindow[] = []

vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(function () {
    const w = new MockBrowserWindow()
    lastWindows.push(w)
    return w
  }),
  shell: { openExternal: vi.fn() },
  screen: { getAllDisplays: vi.fn(() => []) }
}))

const { configEvents } = vi.hoisted(() => ({
  configEvents: { on: vi.fn(), off: vi.fn(), emit: vi.fn() }
}))
const saveSettingsMock = vi.fn()
vi.mock('@main/ipc/utils', () => ({
  configEvents,
  saveSettings: (...a: unknown[]) => saveSettingsMock(...a)
}))

vi.mock('@electron-toolkit/utils', () => ({
  is: { dev: false }
}))

import type { runtimeStateProps } from '@main/types'
import {
  closeAllSecondaryWindows,
  getSecondaryWindow,
  setupSecondaryWindows,
  syncSecondaryWindows
} from '../secondaryWindows'

function baseState(over: Partial<runtimeStateProps['config']> = {}): runtimeStateProps {
  return {
    config: {
      dashScreenActive: false,
      auxScreenActive: false,
      dashScreenWidth: 800,
      dashScreenHeight: 480,
      auxScreenWidth: 1024,
      auxScreenHeight: 600,
      ...over
    },
    isQuitting: false
  } as runtimeStateProps
}

beforeEach(() => {
  lastWindows.length = 0
  saveSettingsMock.mockReset()
  configEvents.on.mockReset()
  vi.useFakeTimers()
  closeAllSecondaryWindows()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('syncSecondaryWindows — open / close', () => {
  test('spawns a window when active flag is set', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(1)
    expect(getSecondaryWindow('dash')).not.toBeNull()
  })

  test('closes the window when active flag is cleared', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    rt.config.dashScreenActive = false
    syncSecondaryWindows(rt, { dashScreenActive: true } as never)
    expect(win.close).toHaveBeenCalled()
  })

  test('isQuitting short-circuits the sync', () => {
    const rt = baseState({ dashScreenActive: true })
    rt.isQuitting = true
    syncSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(0)
  })

  test('no-op when window is already open and config unchanged', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(1)
    syncSecondaryWindows(rt, { dashScreenActive: true } as never)
    expect(lastWindows).toHaveLength(1)
  })
})

describe('syncSecondaryWindows — resize + kiosk', () => {
  test('resizes the window when width/height change', () => {
    const rt = baseState({ dashScreenActive: true, dashScreenWidth: 800, dashScreenHeight: 480 })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    rt.config.dashScreenWidth = 1024
    rt.config.dashScreenHeight = 600
    syncSecondaryWindows(rt, {
      dashScreenActive: true,
      dashScreenWidth: 800,
      dashScreenHeight: 480
    } as never)
    expect(win.setContentSize).toHaveBeenCalledWith(1024, 600)
  })

  test('applyKiosk toggles fullScreen on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    const rt = baseState({ dashScreenActive: true, kiosk: { dash: false } } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    rt.config.kiosk = { dash: true } as never
    syncSecondaryWindows(rt, { dashScreenActive: true, kiosk: { dash: false } } as never)
    expect(win.setFullScreen).toHaveBeenCalledWith(true)
  })

  test('applyKiosk toggles kiosk on linux/win32', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    const rt = baseState({ dashScreenActive: true, kiosk: { dash: false } } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    rt.config.kiosk = { dash: true } as never
    syncSecondaryWindows(rt, { dashScreenActive: true, kiosk: { dash: false } } as never)
    expect(win.setKiosk).toHaveBeenCalledWith(true)
  })
})

describe('window lifecycle', () => {
  test('window emits move/resize → schedule save', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('move')
    win.emit('resize')
    vi.advanceTimersByTime(500)
    expect(saveSettingsMock).toHaveBeenCalled()
  })

  test('window "closed" event clears the active flag', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('closed')
    expect(saveSettingsMock).toHaveBeenCalledWith(rt, { dashScreenActive: false })
  })

  test('"closed" while quitting does not save', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    rt.isQuitting = true
    win.emit('closed')
    expect(saveSettingsMock).not.toHaveBeenCalled()
  })
})

describe('setupSecondaryWindows + closeAllSecondaryWindows', () => {
  test('setup runs initial sync + subscribes to config changes', () => {
    const rt = baseState({ dashScreenActive: true })
    setupSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(1)
    expect(configEvents.on).toHaveBeenCalledWith('changed', expect.any(Function))
  })

  test('config "changed" callback re-syncs', () => {
    const rt = baseState({ dashScreenActive: false })
    setupSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(0)
    const cb = configEvents.on.mock.calls.find((c) => c[0] === 'changed')![1] as (
      next: unknown,
      prev: unknown
    ) => void
    rt.config.dashScreenActive = true
    cb(rt.config, { dashScreenActive: false })
    expect(lastWindows).toHaveLength(1)
  })

  test('closeAllSecondaryWindows closes every open window', () => {
    const rt = baseState({ dashScreenActive: true, auxScreenActive: true })
    syncSecondaryWindows(rt)
    expect(lastWindows).toHaveLength(2)
    closeAllSecondaryWindows()
    for (const w of lastWindows) expect(w.close).toHaveBeenCalled()
  })

  test('getSecondaryWindow returns null for an unopened role', () => {
    expect(getSecondaryWindow('aux')).toBeNull()
  })

  test('getSecondaryWindow returns the open window for a role', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    expect(getSecondaryWindow('dash')).not.toBeNull()
  })
})

describe('secondaryWindows — bounds + ready-to-show', () => {
  test('bounds from config are applied on ready-to-show', () => {
    const rt = baseState({
      dashScreenActive: true,
      dashScreenBounds: { x: 10, y: 20, width: 1024, height: 768 }
    } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('ready-to-show')
    // width/height restored as content size, position separately (no titlebar drift)
    expect(win.setContentSize).toHaveBeenCalledWith(1024, 768)
    expect(win.setPosition).toHaveBeenCalledWith(10, 20)
  })

  test('darwin kiosk applies on ready-to-show', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    const rt = baseState({ dashScreenActive: true, kiosk: { dash: true } } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('ready-to-show')
    expect(win.setFullScreen).toHaveBeenCalledWith(true)
  })

  test('linux kiosk applies on ready-to-show', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    const rt = baseState({ dashScreenActive: true, kiosk: { dash: true } } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('ready-to-show')
    expect(win.setKiosk).toHaveBeenCalledWith(true)
  })

  test('persistBounds skips when fullScreen / kiosk', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.isFullScreen.mockReturnValue(true)
    win.emit('move')
    vi.advanceTimersByTime(500)
    expect(saveSettingsMock).not.toHaveBeenCalled()
  })

  test('persistBounds skips when destroyed', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.isDestroyed.mockReturnValue(true)
    win.emit('move')
    vi.advanceTimersByTime(500)
    expect(saveSettingsMock).not.toHaveBeenCalled()
  })

  test('persistBounds skips when bounds unchanged', () => {
    const rt = baseState({
      dashScreenActive: true,
      dashScreenBounds: { x: 100, y: 100, width: 800, height: 480 }
    } as never)
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.emit('move')
    vi.advanceTimersByTime(500)
    expect(saveSettingsMock).not.toHaveBeenCalled()
  })

  test('resize is a no-op when fullScreen / kiosk', () => {
    const rt = baseState({ dashScreenActive: true })
    syncSecondaryWindows(rt)
    const win = lastWindows[0]
    win.isFullScreen.mockReturnValue(true)
    rt.config.dashScreenWidth = 1234
    syncSecondaryWindows(rt, {
      dashScreenActive: true,
      dashScreenWidth: 800,
      dashScreenHeight: 480
    } as never)
    expect(win.setContentSize).not.toHaveBeenCalled()
  })
})
