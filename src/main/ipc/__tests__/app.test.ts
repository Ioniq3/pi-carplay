import { registerAppIpc } from '@main/ipc/app'
import { registerIpcHandle, registerIpcOn } from '@main/ipc/register'
import { isMacPlatform } from '@main/utils'
import { broadcastToRenderers } from '@main/window/broadcast'
import { getMainWindow } from '@main/window/createWindow'
import { restoreKioskAfterWmExit } from '@main/window/utils'
import { spawn } from 'child_process'
import { app, shell } from 'electron'
import type { Mock } from 'vitest'

vi.mock('@main/window/createWindow', () => ({
  getMainWindow: vi.fn(() => null)
}))

vi.mock('@main/utils', () => ({
  isMacPlatform: vi.fn(() => false)
}))

vi.mock('@main/window/utils', () => ({
  restoreKioskAfterWmExit: vi.fn()
}))

vi.mock('@main/window/broadcast', () => ({
  broadcastToRenderers: vi.fn()
}))

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: vi.fn(),
  registerIpcOn: vi.fn()
}))

vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

const mockedGetMainWindow = getMainWindow as Mock
const mockedIsMacPlatform = isMacPlatform as Mock
const mockedRegisterIpcHandle = registerIpcHandle as Mock
const mockedRegisterIpcOn = registerIpcOn as Mock
const mockedSpawn = spawn as Mock
const mockedBroadcastToRenderers = broadcastToRenderers as Mock

describe('registerAppIpc', () => {
  const originalPlatform = process.platform
  const originalAppImage = process.env.APPIMAGE
  const originalAppDir = process.env.APPDIR
  const originalArgv0 = process.env.ARGV0
  const originalOwd = process.env.OWD

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    mockedGetMainWindow.mockReturnValue(null)
    mockedIsMacPlatform.mockReturnValue(false)

    process.env.APPIMAGE = originalAppImage
    process.env.APPDIR = originalAppDir
    process.env.ARGV0 = originalArgv0
    process.env.OWD = originalOwd
  })

  afterAll(async () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env.APPIMAGE = originalAppImage
    process.env.APPDIR = originalAppDir
    process.env.ARGV0 = originalArgv0
    process.env.OWD = originalOwd
  })

  function getHandle(channel: string) {
    return mockedRegisterIpcHandle.mock.calls.find(([name]) => name === channel)?.[1]
  }

  function getOn(channel: string) {
    return mockedRegisterIpcOn.mock.calls.find(([name]) => name === channel)?.[1]
  }

  test('registers app handlers and listener', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const registeredHandles = mockedRegisterIpcHandle.mock.calls.map((c) => c[0])
    const registeredOn = mockedRegisterIpcOn.mock.calls.map((c) => c[0])

    expect(registeredHandles).toEqual(
      expect.arrayContaining(['quit', 'app:quitApp', 'app:restartApp', 'app:openExternal'])
    )
    expect(registeredOn).toEqual(expect.arrayContaining(['app:user-activity', 'app:media-key']))
  })

  test('quit handler calls app.quit on non-mac platforms', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const quitHandler = getHandle('quit') as (() => void) | undefined
    expect(quitHandler).toBeDefined()

    quitHandler?.()

    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('quit handler hides window on mac when not fullscreen', async () => {
    const hide = vi.fn()
    mockedIsMacPlatform.mockReturnValue(true)
    mockedGetMainWindow.mockReturnValue({
      isFullScreen: vi.fn(() => false),
      hide
    })

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const quitHandler = getHandle('quit') as (() => void) | undefined
    quitHandler?.()

    expect(hide).toHaveBeenCalledTimes(1)
    expect(app.quit).not.toHaveBeenCalled()
  })

  test('quit handler exits fullscreen first on mac and suppresses next fs sync', async () => {
    const once = vi.fn()
    const setFullScreen = vi.fn()
    mockedIsMacPlatform.mockReturnValue(true)
    mockedGetMainWindow.mockReturnValue({
      isFullScreen: vi.fn(() => true),
      once,
      setFullScreen,
      hide: vi.fn()
    })

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const quitHandler = getHandle('quit') as (() => void) | undefined
    quitHandler?.()

    expect(runtimeState.suppressNextFsSync).toBe(true)
    expect(once).toHaveBeenCalledWith('leave-full-screen', expect.any(Function))
    expect(setFullScreen).toHaveBeenCalledWith(false)
  })

  test('app:quitApp calls app.quit when app is not quitting', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const quitAppHandler = getHandle('app:quitApp') as (() => void) | undefined

    expect(quitAppHandler).toBeDefined()
    quitAppHandler?.()

    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:quitApp does nothing when already quitting', async () => {
    const runtimeState = { isQuitting: true, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const quitAppHandler = getHandle('app:quitApp') as (() => void) | undefined
    quitAppHandler?.()

    expect(app.quit).not.toHaveBeenCalled()
  })

  test('app:media-key fans the command out to all renderers', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const mediaKeyListener = getOn('app:media-key') as
      | ((evt: unknown, cmd: string) => void)
      | undefined
    expect(mediaKeyListener).toBeDefined()

    mediaKeyListener?.(undefined, 'playPause')
    expect(mockedBroadcastToRenderers).toHaveBeenCalledWith('app:media-key', 'playPause')
  })

  test('app:media-key ignores empty or non-string commands', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const mediaKeyListener = getOn('app:media-key') as
      | ((evt: unknown, cmd: unknown) => void)
      | undefined

    mediaKeyListener?.(undefined, '')
    mediaKeyListener?.(undefined, undefined)
    mediaKeyListener?.(undefined, 42)

    expect(mockedBroadcastToRenderers).not.toHaveBeenCalled()
  })

  test('app:user-activity triggers kiosk restore sync', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const userActivityListener = getOn('app:user-activity') as (() => void) | undefined

    expect(userActivityListener).toBeDefined()
    userActivityListener?.()

    expect(restoreKioskAfterWmExit).toHaveBeenCalledWith(runtimeState)
  })

  test('app:restartApp shuts down usb service, relaunches and quits', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation(function (fn: TimerHandler) {
      if (typeof fn === 'function') fn()
      return 0 as any
    } as typeof setTimeout)
    const unref = vi.fn()
    mockedSpawn.mockReturnValue({ unref })
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env.APPIMAGE = '/tmp/app.AppImage'

    const beginShutdown = vi.fn()
    const gracefulReset = vi.fn().mockResolvedValue(undefined)

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = { usbService: { beginShutdown, gracefulReset } } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined
    await restartHandler?.()

    expect(beginShutdown).toHaveBeenCalledTimes(1)
    expect(gracefulReset).toHaveBeenCalledTimes(1)
    expect(unref).toHaveBeenCalledTimes(1)
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:restartApp ignores re-entrant calls while a restart is already in flight', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation(function (fn: TimerHandler) {
      if (typeof fn === 'function') fn()
      return 0 as any
    } as typeof setTimeout)
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    delete process.env.APPIMAGE

    const beginShutdown = vi.fn()
    const gracefulReset = vi.fn().mockResolvedValue(undefined)

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = { usbService: { beginShutdown, gracefulReset } } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined

    await Promise.all([restartHandler?.(), restartHandler?.(), restartHandler?.()])

    expect(beginShutdown).toHaveBeenCalledTimes(1)
    expect(gracefulReset).toHaveBeenCalledTimes(1)
    expect(app.relaunch).toHaveBeenCalledTimes(1)
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:restartApp continues when gracefulReset fails', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation(function (fn: TimerHandler) {
      if (typeof fn === 'function') fn()
      return 0 as any
    } as typeof setTimeout)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const unref = vi.fn()
    mockedSpawn.mockReturnValue({ unref })
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env.APPIMAGE = '/tmp/app.AppImage'

    const beginShutdown = vi.fn()
    const gracefulReset = vi.fn().mockRejectedValue(new Error('boom'))

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = { usbService: { beginShutdown, gracefulReset } } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined
    await restartHandler?.()

    expect(beginShutdown).toHaveBeenCalledTimes(1)
    expect(gracefulReset).toHaveBeenCalledTimes(1)
    expect(unref).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[MAIN] gracefulReset failed (continuing restart):',
      expect.any(Error)
    )
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:restartApp returns early when already quitting', async () => {
    const runtimeState = { isQuitting: true, suppressNextFsSync: false } as any
    const services = { usbService: { beginShutdown: vi.fn(), gracefulReset: vi.fn() } } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined
    await restartHandler?.()

    expect(app.relaunch).not.toHaveBeenCalled()
    expect(app.quit).not.toHaveBeenCalled()
  })

  test('app:restartApp uses APPIMAGE relaunch path on linux', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation(function (fn: TimerHandler) {
      if (typeof fn === 'function') fn()
      return 0 as any
    } as typeof setTimeout)
    const unref = vi.fn()
    mockedSpawn.mockReturnValue({ unref })

    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env.APPIMAGE = '/tmp/app.AppImage'
    process.env.APPDIR = '/tmp/appdir'
    process.env.ARGV0 = 'argv0'
    process.env.OWD = '/tmp/owd'

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = {
      usbService: {
        beginShutdown: vi.fn(),
        gracefulReset: vi.fn().mockResolvedValue(undefined)
      }
    } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined
    await restartHandler?.()

    expect(mockedSpawn).toHaveBeenCalledWith(
      '/tmp/app.AppImage',
      [],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore'
      })
    )

    const spawnOptions = mockedSpawn.mock.calls[0][2]
    expect(spawnOptions.env).not.toHaveProperty('APPIMAGE')
    expect(spawnOptions.env).not.toHaveProperty('APPDIR')
    expect(spawnOptions.env).not.toHaveProperty('ARGV0')
    expect(spawnOptions.env).not.toHaveProperty('OWD')

    expect(unref).toHaveBeenCalledTimes(1)
    expect(app.relaunch).not.toHaveBeenCalled()
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:openExternal rejects empty urls', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const openExternalHandler = getHandle('app:openExternal') as
      | ((evt: unknown, url: string) => Promise<unknown>)
      | undefined

    await expect(openExternalHandler?.(undefined, '')).resolves.toEqual({
      ok: false,
      error: 'Empty URL'
    })
  })

  test('app:openExternal rejects non-http urls', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const openExternalHandler = getHandle('app:openExternal') as
      | ((evt: unknown, url: string) => Promise<unknown>)
      | undefined

    await expect(openExternalHandler?.(undefined, 'file:///tmp/test')).resolves.toEqual({
      ok: false,
      error: 'Only http/https URLs are allowed'
    })
  })

  test('app:openExternal opens valid http urls', async () => {
    ;(shell.openExternal as Mock).mockResolvedValue(undefined)

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const openExternalHandler = getHandle('app:openExternal') as
      | ((evt: unknown, url: string) => Promise<unknown>)
      | undefined

    await expect(openExternalHandler?.(undefined, ' https://example.com ')).resolves.toEqual({
      ok: true
    })
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
  })

  test('app:restartApp relaunches and quits on non-APPIMAGE path', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation(function (fn: TimerHandler) {
      if (typeof fn === 'function') fn()
      return 0 as any
    } as typeof setTimeout)
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    delete process.env.APPIMAGE

    const beginShutdown = vi.fn()
    const gracefulReset = vi.fn().mockResolvedValue(undefined)

    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as any
    const services = { usbService: { beginShutdown, gracefulReset } } as any

    registerAppIpc(runtimeState, services)

    const restartHandler = getHandle('app:restartApp') as (() => Promise<void>) | undefined
    await restartHandler?.()

    expect(beginShutdown).toHaveBeenCalledTimes(1)
    expect(gracefulReset).toHaveBeenCalledTimes(1)
    expect(mockedSpawn).not.toHaveBeenCalled()
    expect(app.relaunch).toHaveBeenCalledTimes(1)
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  test('app:openExternal rejects undefined urls via nullish fallback', async () => {
    const runtimeState = { isQuitting: false, suppressNextFsSync: false } as never
    const services = { usbService: {} } as never

    registerAppIpc(runtimeState, services)

    const openExternalHandler = getHandle('app:openExternal') as
      | ((evt: unknown, url?: string) => Promise<unknown>)
      | undefined

    await expect(openExternalHandler?.(undefined, undefined)).resolves.toEqual({
      ok: false,
      error: 'Empty URL'
    })
  })
})
