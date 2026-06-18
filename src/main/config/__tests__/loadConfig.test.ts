import { loadConfig } from '@main/config/loadConfig'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import type { Mock } from 'vitest'

vi.mock('fs', () => {
  const __m = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  }
  return { ...__m, default: __m }
})

vi.mock('@main/config/paths', () => ({
  CONFIG_PATH: '/tmp/config.json'
}))

vi.mock('@shared/types', () => ({
  DEFAULT_CONFIG: {
    width: 800,
    height: 480,
    kiosk: true,
    bindings: {}
  }
}))

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns defaults and writes config when file does not exist', () => {
    ;(existsSync as Mock).mockReturnValue(false)

    const result = loadConfig()

    expect(result).toEqual({ width: 800, height: 480, kiosk: true, bindings: {} })
    expect(writeFileSync).toHaveBeenCalledWith('/tmp/config.json', JSON.stringify(result, null, 2))
  })

  test('reads and returns merged config from file', () => {
    ;(existsSync as Mock).mockReturnValue(true)
    ;(readFileSync as Mock).mockReturnValue(
      JSON.stringify({ width: 1024, height: 600, kiosk: false, bindings: {} })
    )

    const result = loadConfig()

    expect(readFileSync).toHaveBeenCalledWith('/tmp/config.json', 'utf8')
    expect(result).toEqual({ width: 1024, height: 600, kiosk: false, bindings: {} })
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  test('falls back to defaults and rewrites file when json is invalid', () => {
    ;(existsSync as Mock).mockReturnValue(true)
    ;(readFileSync as Mock).mockReturnValue('{bad-json')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = loadConfig()

    expect(result).toEqual({ width: 800, height: 480, kiosk: true, bindings: {} })
    expect(warnSpy).toHaveBeenCalled()
    expect(writeFileSync).toHaveBeenCalledWith('/tmp/config.json', JSON.stringify(result, null, 2))

    warnSpy.mockRestore()
  })
})
