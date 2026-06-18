import type { Mock } from 'vitest'

vi.mock('node:fs', () => {
  const __m = {
    readFileSync: vi.fn(),
    readdirSync: vi.fn()
  }
  return { ...__m, default: __m }
})
vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}))

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import { detectBtMac, detectWifiBssid } from '../hwaddr'

const mockReadFileSync = fs.readFileSync as Mock
const mockReaddirSync = fs.readdirSync as Mock
const mockExecSync = execSync as Mock

describe('detectBtMac', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env['AA_BT_MAC']
    vi.spyOn(console, 'log').mockImplementation(function () {})
    vi.spyOn(console, 'warn').mockImplementation(function () {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('returns AA_BT_MAC env var when set', () => {
    process.env['AA_BT_MAC'] = '11:22:33:44:55:66'
    expect(detectBtMac()).toBe('11:22:33:44:55:66')
    expect(mockReaddirSync).not.toHaveBeenCalled()
  })

  test('reads MAC from sysfs and uppercases it', () => {
    mockReaddirSync.mockReturnValueOnce(['hci0', 'hci1'])
    mockReadFileSync.mockReturnValueOnce('aa:bb:cc:dd:ee:ff\n')
    expect(detectBtMac()).toBe('AA:BB:CC:DD:EE:FF')
  })

  test('rejects invalid MAC content and falls through to next candidate', () => {
    mockReaddirSync.mockReturnValueOnce(['hci0', 'hci1'])
    mockReadFileSync.mockImplementationOnce(() => 'not-a-mac')
    mockReadFileSync.mockImplementationOnce(() => '11:22:33:44:55:66')
    expect(detectBtMac()).toBe('11:22:33:44:55:66')
  })

  test('falls back to busctl when sysfs has nothing', () => {
    mockReaddirSync.mockReturnValueOnce([])
    mockExecSync.mockReturnValueOnce('s "AA:BB:CC:DD:EE:FF"\n')
    expect(detectBtMac()).toBe('AA:BB:CC:DD:EE:FF')
  })

  test('falls back to hciconfig when sysfs and busctl have nothing', () => {
    mockReaddirSync.mockReturnValueOnce([])
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('busctl missing')
    })
    mockExecSync.mockReturnValueOnce('BD Address: AA:BB:CC:DD:EE:FF  ACL MTU: ...\n')
    expect(detectBtMac()).toBe('AA:BB:CC:DD:EE:FF')
  })

  test('returns undefined when nothing is detected', () => {
    mockReaddirSync.mockReturnValueOnce([])
    mockExecSync.mockImplementation(function () {
      throw new Error('not found')
    })
    expect(detectBtMac()).toBeUndefined()
  })

  test('honours an explicit iface argument and skips sysfs listing', () => {
    mockReadFileSync.mockReturnValueOnce('AA:BB:CC:11:22:33')
    expect(detectBtMac('hci2')).toBe('AA:BB:CC:11:22:33')
    expect(mockReaddirSync).not.toHaveBeenCalled()
  })
})

describe('detectWifiBssid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env['AA_WIFI_BSSID']
    vi.spyOn(console, 'log').mockImplementation(function () {})
    vi.spyOn(console, 'warn').mockImplementation(function () {})
  })

  test('returns AA_WIFI_BSSID env var when set', () => {
    process.env['AA_WIFI_BSSID'] = 'aa:bb:cc:dd:ee:ff'
    expect(detectWifiBssid()).toBe('aa:bb:cc:dd:ee:ff')
  })

  test('reads MAC from sysfs for the first wlan* interface', () => {
    mockReaddirSync.mockReturnValueOnce(['eth0', 'wlan0', 'lo'])
    mockReadFileSync.mockReturnValueOnce('11:22:33:44:55:66')
    expect(detectWifiBssid()).toBe('11:22:33:44:55:66')
  })

  test('returns undefined when no wlan interface has a MAC', () => {
    mockReaddirSync.mockReturnValueOnce(['eth0'])
    expect(detectWifiBssid()).toBeUndefined()
  })

  test('honours an explicit iface argument', () => {
    mockReadFileSync.mockReturnValueOnce('AA:BB:CC:11:22:33')
    expect(detectWifiBssid('wlan2')).toBe('AA:BB:CC:11:22:33')
    expect(mockReaddirSync).not.toHaveBeenCalled()
  })

  test('returns undefined when sysfs readdir throws', () => {
    mockReaddirSync.mockImplementationOnce(() => {
      throw new Error('not linux')
    })
    expect(detectWifiBssid()).toBeUndefined()
  })
})
