import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { Mock } from 'vitest'
import { bootstrapCompositor } from '../compositorBootstrap'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
vi.mock('node:fs', () => {
  const __m = { existsSync: vi.fn() }
  return { ...__m, default: __m }
})

const mockedSpawn = spawn as Mock
const mockedExistsSync = existsSync as Mock

describe('bootstrapCompositor', () => {
  const originalPlatform = process.platform
  const originalEnv = process.env
  const originalResourcesPath = process.resourcesPath

  const setPlatform = (value: string) => {
    Object.defineProperty(process, 'platform', { value, configurable: true })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedSpawn.mockReturnValue({ unref: vi.fn() })
    mockedExistsSync.mockReturnValue(true)
    process.env = { ...originalEnv }
    delete process.env.LIVI_COMPOSITOR
    delete process.env.LIVI_NO_COMPOSITOR
    process.env.APPIMAGE = '/home/user/LIVI.AppImage'
    ;(process as { resourcesPath: string }).resourcesPath = '/opt/livi/resources'
    setPlatform('linux')
  })

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env = originalEnv
    ;(process as { resourcesPath?: string }).resourcesPath = originalResourcesPath
  })

  test('returns false and does not spawn on non-linux', () => {
    setPlatform('darwin')
    expect(bootstrapCompositor()).toBe(false)
    expect(mockedSpawn).not.toHaveBeenCalled()
  })

  test('returns false when already inside the compositor', () => {
    process.env.LIVI_COMPOSITOR = '1'
    expect(bootstrapCompositor()).toBe(false)
    expect(mockedSpawn).not.toHaveBeenCalled()
  })

  test('returns false when opted out', () => {
    process.env.LIVI_NO_COMPOSITOR = '1'
    expect(bootstrapCompositor()).toBe(false)
    expect(mockedSpawn).not.toHaveBeenCalled()
  })

  test('re-execs via process.execPath when not an AppImage (.deb)', () => {
    delete process.env.APPIMAGE
    expect(bootstrapCompositor()).toBe(true)
    const [, argv] = mockedSpawn.mock.calls[0]
    expect(argv[1]).toContain(process.execPath)
    expect(argv[1]).toContain('--ozone-platform=wayland')
  })

  test('returns false when the compositor launcher is missing', () => {
    mockedExistsSync.mockReturnValue(false)
    expect(bootstrapCompositor()).toBe(false)
    expect(mockedSpawn).not.toHaveBeenCalled()
  })

  test('spawns the compositor and re-execs the AppImage inside it', () => {
    expect(bootstrapCompositor()).toBe(true)

    expect(mockedSpawn).toHaveBeenCalledTimes(1)
    const [launcher, argv, opts] = mockedSpawn.mock.calls[0]
    expect(launcher).toBe('/opt/livi/resources/compositor/livi-compositor')
    expect(argv[0]).toBe('-s')
    expect(argv[1]).toContain('LIVI_COMPOSITOR=1')
    expect(argv[1]).toContain('/home/user/LIVI.AppImage')
    expect(argv[1]).toContain('--ozone-platform=wayland')
    expect(opts.detached).toBe(true)
    expect(opts.env.LIVI_OUTPUT_APP_ID).toBe('dev.f-io.livi')
    expect(opts.env.LIVI_SCREENS).toBe('main,dash,aux')
    expect(opts.env.APPIMAGE).toBeUndefined()
  })
})
