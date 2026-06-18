import { installOnLinuxFromFile } from '@main/ipc/update/install.linux'
import { sendUpdateEvent } from '@main/ipc/utils'
import { spawn } from 'child_process'
import { app } from 'electron'
import { promises as fsp } from 'fs'
import type { Mock } from 'vitest'

vi.mock('fs', () => {
  const __m = {
    promises: {
      copyFile: vi.fn(() => Promise.resolve()),
      chmod: vi.fn(() => Promise.resolve()),
      rename: vi.fn(() => Promise.resolve())
    }
  }
  return { ...__m, default: __m }
})

vi.mock('child_process', () => ({
  spawn: vi.fn(function () {
    return { unref: vi.fn() }
  })
}))

vi.mock('@main/ipc/utils', () => ({
  sendUpdateEvent: vi.fn()
}))

describe('installOnLinuxFromFile', () => {
  const originalPlatform = process.platform
  const originalAppImage = process.env.APPIMAGE

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env.APPIMAGE = originalAppImage
  })

  test('throws outside linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    await expect(installOnLinuxFromFile('/tmp/new.AppImage')).rejects.toThrow('Linux only')
  })

  test('throws if not running from AppImage', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    delete process.env.APPIMAGE
    await expect(installOnLinuxFromFile('/tmp/new.AppImage')).rejects.toThrow(
      'Not running from an AppImage'
    )
  })

  test('copies new image in place and relaunches on will-quit', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env.APPIMAGE = '/opt/LIVI.AppImage'

    let onWillQuit: (() => void) | undefined
    ;(app.once as Mock).mockImplementation(function (event, cb) {
      if (event === 'will-quit') onWillQuit = cb
    })

    await installOnLinuxFromFile('/tmp/downloaded.AppImage')

    expect(fsp.copyFile).toHaveBeenCalledWith('/tmp/downloaded.AppImage', '/opt/LIVI.AppImage.new')
    expect(fsp.chmod).toHaveBeenCalledWith('/opt/LIVI.AppImage.new', 0o755)
    expect(fsp.rename).toHaveBeenCalledWith('/opt/LIVI.AppImage.new', '/opt/LIVI.AppImage')
    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'relaunching' })
    expect(app.quit).toHaveBeenCalledTimes(1)

    onWillQuit?.()

    expect(spawn).toHaveBeenCalledWith('/opt/LIVI.AppImage', [], {
      detached: true,
      stdio: 'ignore'
    })
  })
})
