import { execFile } from 'node:child_process'
import { installFromDmg } from '@main/ipc/update/install.dmg'
import { getMacDesiredOwner, sendUpdateEvent } from '@main/ipc/utils'
import { promises as fsp } from 'fs'
import type { Mock } from 'vitest'

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}))

vi.mock('fs', () => {
  const __m = {
    promises: {
      readdir: vi.fn()
    }
  }
  return { ...__m, default: __m }
})

vi.mock('@main/ipc/utils', () => ({
  getMacDesiredOwner: vi.fn(() => Promise.resolve({ user: 'anton', group: 'staff' })),
  sendUpdateEvent: vi.fn()
}))

describe('installFromDmg', () => {
  const originalPlatform = process.platform

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  test('throws outside macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    await expect(installFromDmg('/tmp/LIVI.dmg')).rejects.toThrow('macOS only')
  })

  test('mounts dmg, copies app via osascript and unmounts', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    ;(execFile as Mock).mockImplementation((cmd, args, cb) => cb(null))
    ;(fsp.readdir as Mock).mockResolvedValue([
      {
        name: 'LIVI.app',
        isDirectory: () => true
      }
    ])

    await expect(installFromDmg('/tmp/LIVI.dmg')).resolves.toBeUndefined()

    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'mounting' })
    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'copying' })
    expect(sendUpdateEvent).toHaveBeenCalledWith({ phase: 'unmounting' })
    expect(getMacDesiredOwner).toHaveBeenCalledWith('/Applications/LIVI.app')
    expect(execFile).toHaveBeenCalledWith(
      'hdiutil',
      expect.arrayContaining(['attach', '-nobrowse']),
      expect.any(Function)
    )
    expect(execFile).toHaveBeenCalledWith('osascript', expect.any(Array), expect.any(Function))
    expect(execFile).toHaveBeenCalledWith(
      'hdiutil',
      expect.arrayContaining(['detach', expect.stringMatching(/^\/Volumes\/pcu-/), '-quiet']),
      expect.any(Function)
    )
  })

  test('detaches and throws when no .app found in dmg', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    ;(execFile as Mock).mockImplementation((cmd, args, cb) => cb(null))
    ;(fsp.readdir as Mock).mockResolvedValue([
      {
        name: 'README.txt',
        isDirectory: () => false
      }
    ])

    await expect(installFromDmg('/tmp/LIVI.dmg')).rejects.toThrow('No .app found in DMG')
    expect(execFile).toHaveBeenCalledWith(
      'hdiutil',
      expect.arrayContaining(['detach', expect.any(String), '-quiet']),
      expect.any(Function)
    )
  })
})
