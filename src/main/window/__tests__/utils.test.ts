import { saveSettings } from '@main/ipc/utils'
import { isMacPlatform, pushSettingsToRenderer } from '@main/utils'
import { getMainWindow } from '@main/window/createWindow'
import {
  applyAspectRatioFullscreen,
  applyAspectRatioWindowed,
  applyWindowedContentSize,
  attachKioskStateSync,
  currentKiosk,
  persistKioskAndBroadcast,
  restoreKioskAfterWmExit,
  sanitizeBounds,
  sendKioskSync
} from '@main/window/utils'
import { screen } from 'electron'
import type { Mock } from 'vitest'

vi.mock('@main/window/createWindow', () => ({
  getMainWindow: vi.fn()
}))

vi.mock('@main/utils', () => ({
  isMacPlatform: vi.fn(() => false),
  pushSettingsToRenderer: vi.fn()
}))

vi.mock('@main/ipc/utils', () => ({
  saveSettings: vi.fn()
}))

vi.mock('electron', () => ({
  screen: {
    getDisplayMatching: vi.fn(function () {
      return {
        workAreaSize: { width: 1600, height: 900 }
      }
    }),
    getAllDisplays: vi.fn(() => [])
  }
}))

type WindowHandler = () => void

describe('window utils', () => {
  const originalPlatform = process.platform
  const mockedGetDisplayMatching = screen.getDisplayMatching as Mock

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.clearAllMocks()
  })

  test('applyAspectRatioFullscreen sets ratio from width/height', () => {
    const win = { setAspectRatio: vi.fn() } as any
    applyAspectRatioFullscreen(win, 800, 400)
    expect(win.setAspectRatio).toHaveBeenCalledWith(2, { width: 0, height: 0 })
  })

  test('applyAspectRatioWindowed resets constraints when dimensions are missing', () => {
    const win = {
      setAspectRatio: vi.fn(),
      setMinimumSize: vi.fn()
    } as any

    applyAspectRatioWindowed(win, 0, 0)

    expect(win.setAspectRatio).toHaveBeenCalledWith(0)
    expect(win.setMinimumSize).toHaveBeenCalledWith(0, 0)
  })

  test('applyAspectRatioWindowed clears aspect ratio and sets minimum size with frame extras', () => {
    const win = {
      setAspectRatio: vi.fn(),
      setMinimumSize: vi.fn(),
      getSize: vi.fn(() => [820, 520]),
      getContentSize: vi.fn(() => [800, 480])
    } as any

    applyAspectRatioWindowed(win, 800, 480)

    expect(win.setAspectRatio).toHaveBeenCalledWith(0)
    expect(win.setMinimumSize).toHaveBeenCalledWith(320, 240)
  })

  test('applyWindowedContentSize on non-linux sets content size and reapplies windowed constraints', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    const win = {
      setContentSize: vi.fn(),
      setAspectRatio: vi.fn(),
      setMinimumSize: vi.fn(),
      getSize: vi.fn(() => [820, 520]),
      getContentSize: vi.fn(() => [800, 480])
    } as any

    applyWindowedContentSize(win, 1024, 600)

    expect(win.setContentSize).toHaveBeenCalledWith(1024, 600, false)
    expect(win.setAspectRatio).toHaveBeenCalledWith(0)
    expect(win.setMinimumSize).toHaveBeenCalled()
  })

  test('applyWindowedContentSize on linux clamps size to work area and reapplies constraints', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const win = {
      getBounds: vi.fn(function () {
        return { x: 0, y: 0, width: 800, height: 480 }
      }),
      setResizable: vi.fn(),
      setMinimumSize: vi.fn(),
      setContentSize: vi.fn(),
      setAspectRatio: vi.fn(),
      getSize: vi.fn(() => [820, 520]),
      getContentSize: vi.fn(() => [800, 480])
    } as any

    mockedGetDisplayMatching.mockReturnValue({
      workAreaSize: { width: 1000, height: 700 }
    })

    applyWindowedContentSize(win, 1200, 800)

    expect(win.setResizable).toHaveBeenCalledWith(true)
    expect(win.setMinimumSize).toHaveBeenCalledWith(0, 0)
    expect(win.setContentSize).toHaveBeenCalledWith(1000, 700, false)
    expect(win.setAspectRatio).toHaveBeenCalledWith(0)
  })

  test('applyWindowedContentSize on linux clamps invalid sizes to at least 1x1', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const win = {
      getBounds: vi.fn(function () {
        return { x: 0, y: 0, width: 800, height: 480 }
      }),
      setResizable: vi.fn(),
      setMinimumSize: vi.fn(),
      setContentSize: vi.fn(),
      setAspectRatio: vi.fn(),
      getSize: vi.fn(() => [20, 20]),
      getContentSize: vi.fn(() => [20, 20])
    } as any

    mockedGetDisplayMatching.mockReturnValue({
      workAreaSize: { width: 1000, height: 700 }
    })

    applyWindowedContentSize(win, 0, -5)

    expect(win.setContentSize).toHaveBeenCalledWith(1, 1, false)
  })

  test('currentKiosk returns runtime config when main window is absent', () => {
    ;(getMainWindow as Mock).mockReturnValue(null)

    expect(currentKiosk({ kiosk: { main: true, dash: false, aux: false } } as any)).toBe(true)
  })

  test('currentKiosk returns runtime config when window is destroyed', () => {
    ;(getMainWindow as Mock).mockReturnValue({
      isDestroyed: vi.fn(() => true)
    })

    expect(currentKiosk({ kiosk: { main: false, dash: false, aux: false } } as any)).toBe(false)
  })

  test('currentKiosk reads kiosk state from native window on non-mac', () => {
    ;(isMacPlatform as Mock).mockReturnValue(false)
    ;(getMainWindow as Mock).mockReturnValue({
      isDestroyed: vi.fn(() => false),
      isKiosk: vi.fn(() => true)
    })

    expect(currentKiosk({ kiosk: { main: false, dash: false, aux: false } } as any)).toBe(true)
  })

  test('currentKiosk reads fullscreen state from native window on mac', () => {
    ;(isMacPlatform as Mock).mockReturnValue(true)
    ;(getMainWindow as Mock).mockReturnValue({
      isDestroyed: vi.fn(() => false),
      isFullScreen: vi.fn(() => true)
    })

    expect(currentKiosk({ kiosk: { main: false, dash: false, aux: false } } as any)).toBe(true)
  })

  test('persistKioskAndBroadcast only pushes when kiosk unchanged', () => {
    const runtimeState = {
      config: { kiosk: { main: true, dash: false, aux: false } },
      wmExitedKiosk: true
    } as any

    persistKioskAndBroadcast(true, runtimeState)

    expect(pushSettingsToRenderer).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: true, dash: false, aux: false }
    })
    expect(saveSettings).not.toHaveBeenCalled()
  })

  test('persistKioskAndBroadcast saves when kiosk changed', () => {
    const runtimeState = {
      config: { kiosk: { main: true, dash: false, aux: false } },
      wmExitedKiosk: true
    } as any

    persistKioskAndBroadcast(false, runtimeState)

    expect(runtimeState.wmExitedKiosk).toBe(false)
    expect(saveSettings).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: false, dash: false, aux: false }
    })
  })

  test('sendKioskSync emits kiosk sync event', () => {
    const send = vi.fn()
    sendKioskSync(true, { webContents: { send } } as any)
    expect(send).toHaveBeenCalledWith('settings:kiosk-sync', true)
  })

  test('sendKioskSync does nothing when window is null', () => {
    expect(() => sendKioskSync(true, null)).not.toThrow()
  })

  test('restoreKioskAfterWmExit returns early on non-linux', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    const runtimeState = {
      wmExitedKiosk: true,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    restoreKioskAfterWmExit(runtimeState)

    expect(saveSettings).not.toHaveBeenCalled()
  })

  test('restoreKioskAfterWmExit returns early when window is absent', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    ;(getMainWindow as Mock).mockReturnValue(null)

    const runtimeState = {
      wmExitedKiosk: true,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    restoreKioskAfterWmExit(runtimeState)

    expect(saveSettings).not.toHaveBeenCalled()
  })

  test('restoreKioskAfterWmExit returns early when window is destroyed', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    ;(getMainWindow as Mock).mockReturnValue({
      isDestroyed: vi.fn(() => true)
    })

    const runtimeState = {
      wmExitedKiosk: true,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    restoreKioskAfterWmExit(runtimeState)

    expect(saveSettings).not.toHaveBeenCalled()
  })

  test('restoreKioskAfterWmExit returns early when kiosk was not exited by wm', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    ;(getMainWindow as Mock).mockReturnValue({
      isDestroyed: vi.fn(() => false),
      setKiosk: vi.fn()
    })

    const runtimeState = {
      wmExitedKiosk: false,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    restoreKioskAfterWmExit(runtimeState)

    expect(saveSettings).not.toHaveBeenCalled()
  })

  test('restoreKioskAfterWmExit swallows setKiosk errors and still persists on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const win = {
      isDestroyed: vi.fn(() => false),
      setKiosk: vi.fn(function () {
        throw new Error('boom')
      })
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      wmExitedKiosk: true,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    expect(() => restoreKioskAfterWmExit(runtimeState)).not.toThrow()
    expect(runtimeState.wmExitedKiosk).toBe(false)
    expect(saveSettings).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: true, dash: false, aux: false }
    })
  })

  test('restoreKioskAfterWmExit re-enters kiosk and persists on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const win = {
      isDestroyed: vi.fn(() => false),
      setKiosk: vi.fn()
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      wmExitedKiosk: true,
      config: { kiosk: { main: false, dash: false, aux: false } }
    } as any

    restoreKioskAfterWmExit(runtimeState)

    expect(runtimeState.wmExitedKiosk).toBe(false)
    expect(win.setKiosk).toHaveBeenCalledWith(true)
    expect(saveSettings).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: true, dash: false, aux: false }
    })
  })

  test('attachKioskStateSync returns early on non-linux', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    expect(() => attachKioskStateSync(runtimeState)).not.toThrow()
  })

  test('attachKioskStateSync returns early when window is absent', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    ;(getMainWindow as Mock).mockReturnValue(null)

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    attachKioskStateSync(runtimeState)

    expect(pushSettingsToRenderer).not.toHaveBeenCalled()
  })

  test('attachKioskStateSync registers listeners and sends initial sync in normal mode', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const handlers: Record<string, WindowHandler> = {}
    const win = {
      isDestroyed: vi.fn(() => false),
      isKiosk: vi.fn(() => false),
      on: vi.fn(function (event: string, handler: WindowHandler) {
        handlers[event] = handler
      })
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    attachKioskStateSync(runtimeState)

    expect(win.on).toHaveBeenCalledWith('enter-full-screen', expect.anything())
    expect(win.on).toHaveBeenCalledWith('leave-full-screen', expect.anything())
    expect(win.on).toHaveBeenCalledWith('resize', expect.anything())
    expect(win.on).toHaveBeenCalledWith('move', expect.anything())
    expect(win.on).toHaveBeenCalledWith('show', expect.anything())
    expect(win.on).toHaveBeenCalledWith('focus', expect.anything())
    expect(win.on).toHaveBeenCalledWith('blur', expect.anything())
    expect(win.on).toHaveBeenCalledWith('restore', expect.anything())
    expect(win.on).toHaveBeenCalledWith('minimize', expect.anything())

    expect(pushSettingsToRenderer).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: false, dash: false, aux: false }
    })
    expect(handlers.focus).toBeDefined()
  })

  test('attachKioskStateSync avoids duplicate renderer pushes for unchanged kiosk state', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const handlers: Record<string, WindowHandler> = {}
    const win = {
      isDestroyed: vi.fn(() => false),
      isKiosk: vi.fn(() => false),
      on: vi.fn(function (event: string, handler: WindowHandler) {
        handlers[event] = handler
      })
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    attachKioskStateSync(runtimeState)
    handlers.resize()

    expect(pushSettingsToRenderer).toHaveBeenCalledTimes(1)
  })

  test('attachKioskStateSync persists truthful state when wm forces kiosk off', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const handlers: Record<string, WindowHandler> = {}
    const win = {
      isDestroyed: vi.fn(() => false),
      isKiosk: vi.fn(() => false),
      on: vi.fn(function (event: string, handler: WindowHandler) {
        handlers[event] = handler
      })
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      config: { kiosk: { main: true, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    attachKioskStateSync(runtimeState)

    expect(runtimeState.wmExitedKiosk).toBe(true)
    expect(saveSettings).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: false, dash: false, aux: false }
    })
    expect(pushSettingsToRenderer).not.toHaveBeenCalled()
  })

  test('attachKioskStateSync ignores syncs when window is destroyed', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const handlers: Record<string, WindowHandler> = {}
    const win = {
      isDestroyed: vi.fn(() => true),
      isKiosk: vi.fn(() => false),
      on: vi.fn(function (event: string, handler: WindowHandler) {
        handlers[event] = handler
      })
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: false
    } as any

    attachKioskStateSync(runtimeState)

    expect(pushSettingsToRenderer).not.toHaveBeenCalled()
    handlers.resize?.()
    expect(pushSettingsToRenderer).not.toHaveBeenCalled()
  })

  test('attachKioskStateSync restores kiosk on focus', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const handlers: Record<string, WindowHandler> = {}
    const win = {
      isDestroyed: vi.fn(() => false),
      isKiosk: vi.fn(() => false),
      on: vi.fn(function (event: string, handler: WindowHandler) {
        handlers[event] = handler
      }),
      setKiosk: vi.fn()
    }
    ;(getMainWindow as Mock).mockReturnValue(win)

    const runtimeState = {
      config: { kiosk: { main: false, dash: false, aux: false } },
      wmExitedKiosk: true
    } as any

    attachKioskStateSync(runtimeState)
    handlers.focus()

    expect(win.setKiosk).toHaveBeenCalledWith(true)
    expect(saveSettings).toHaveBeenCalledWith(runtimeState, {
      kiosk: { main: true, dash: false, aux: false }
    })
  })

  describe('sanitizeBounds', () => {
    const mockedGetAllDisplays = screen.getAllDisplays as Mock

    const display = (x: number, y: number, width: number, height: number) => ({
      workArea: { x, y, width, height }
    })

    test('returns undefined for missing or malformed bounds', () => {
      mockedGetAllDisplays.mockReturnValue([display(0, 0, 1920, 1080)])
      expect(sanitizeBounds(undefined)).toBeUndefined()
      expect(sanitizeBounds({ x: 0, y: 0, width: 0, height: 480 } as any)).toBeUndefined()
      expect(sanitizeBounds({ x: 0, y: 0, width: 800 } as any)).toBeUndefined()
    })

    test('keeps a rect that is visible on a display', () => {
      mockedGetAllDisplays.mockReturnValue([display(0, 0, 1920, 1080)])
      const b = { x: 100, y: 100, width: 800, height: 480 }
      expect(sanitizeBounds(b)).toBe(b)
    })

    test('keeps a rect on a second monitor (negative offset)', () => {
      mockedGetAllDisplays.mockReturnValue([
        display(0, 0, 1920, 1080),
        display(-1920, 0, 1920, 1080)
      ])
      const b = { x: -1820, y: 200, width: 800, height: 480 }
      expect(sanitizeBounds(b)).toBe(b)
    })

    test('drops a rect that lies fully off all displays (monitor unplugged)', () => {
      mockedGetAllDisplays.mockReturnValue([display(0, 0, 1920, 1080)])
      // saved on a now-missing monitor at x=-1820
      expect(sanitizeBounds({ x: -1820, y: 200, width: 800, height: 480 })).toBeUndefined()
    })

    test('drops a rect with only a sliver visible (< 64px)', () => {
      mockedGetAllDisplays.mockReturnValue([display(0, 0, 1920, 1080)])
      // only 10px peek in from the left edge
      expect(sanitizeBounds({ x: 1910, y: 200, width: 800, height: 480 })).toBeUndefined()
    })

    test('trusts the rect when no display info is available (headless)', () => {
      mockedGetAllDisplays.mockReturnValue([])
      const b = { x: 4000, y: 4000, width: 800, height: 480 }
      expect(sanitizeBounds(b)).toBe(b)
    })
  })
})
