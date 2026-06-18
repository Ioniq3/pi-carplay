import { installFromDmg } from '@main/ipc/update/install.dmg'
import { installOnMacFromFile } from '@main/ipc/update/install.mac'
import { sendUpdateEvent } from '@main/ipc/utils'
import { app } from 'electron'

vi.mock('@main/ipc/update/install.dmg', () => ({
  installFromDmg: vi.fn(() => Promise.resolve())
}))

vi.mock('@main/ipc/utils', () => ({
  sendUpdateEvent: vi.fn()
}))

describe('installOnMacFromFile', () => {
  const originalPlatform = process.platform

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  test('throws outside macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    await expect(installOnMacFromFile('/tmp/LIVI.dmg')).rejects.toThrow('macOS only')
  })

  test('installs from dmg, relaunches and quits', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    await installOnMacFromFile('/tmp/LIVI.dmg')
    vi.runAllTimers()

    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'installing' })
    expect(installFromDmg).toHaveBeenCalledWith('/tmp/LIVI.dmg')
    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'relaunching' })
    expect(app.relaunch).toHaveBeenCalledTimes(1)
    expect(app.quit).toHaveBeenCalledTimes(1)
  })
})
