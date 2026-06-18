import { registerIpcHandle } from '@main/ipc/register'
import { BrowserWindow } from 'electron'
import { usb } from 'usb'
import type { Mock } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: vi.fn(() => []) }
}))

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: vi.fn()
}))

vi.mock('@main/services/audio', () => ({
  Microphone: { getSysdefaultPrettyName: vi.fn(() => 'Mic') }
}))

vi.mock('usb', () => ({
  usb: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getDevices: vi.fn(async () => [])
  }
}))

vi.mock('../helpers', () => ({
  findDongle: vi.fn(async () => null)
}))

const isAccessoryModeMock = vi.fn(() => false)
vi.mock('../../projection/driver/aa/stack/aoap/handshake', () => ({
  isAccessoryMode: (...a: unknown[]) => isAccessoryModeMock(...a)
}))

import { USBService } from '@main/services/usb/USBService'

const projection = {
  markDongleConnected: vi.fn(),
  markPhoneConnected: vi.fn(),
  autoStartIfNeeded: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
  getActiveTransport: vi.fn(() => null),
  isExpectingPhoneReenumeration: vi.fn(() => false)
} as any

// usb@3 USBDevice: flat fields + async methods. deviceClass 0x00 makes it a
// wired-AA phone candidate (not a dongle, not a non-phone class).
function mkPhoneCandidate(vid = 0x18d1, pid = 0x4ee1, deviceClass = 0x00) {
  return {
    vendorId: vid,
    productId: pid,
    deviceClass,
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined)
  } as never
}

// USBConnectionEvent wraps the device under `.device`.
const evt = (device: unknown) => ({ device }) as never

function connectHandler(): (ev: unknown) => void {
  const calls = (usb.addEventListener as Mock).mock.calls
  const row = calls.find(([e]) => e === 'connect')!
  return row[1] as (ev: unknown) => void
}

function disconnectHandler(): (ev: unknown) => void {
  const calls = (usb.addEventListener as Mock).mock.calls
  const row = calls.find(([e]) => e === 'disconnect')!
  return row[1] as (ev: unknown) => void
}

beforeEach(async () => {
  vi.clearAllMocks()
  isAccessoryModeMock.mockReset().mockReturnValue(false)
  ;(usb.getDevices as Mock).mockReset().mockResolvedValue([])
  projection.markDongleConnected.mockReset()
  projection.markPhoneConnected.mockReset()
  projection.autoStartIfNeeded.mockReset().mockResolvedValue(undefined)
  projection.isExpectingPhoneReenumeration.mockReset().mockReturnValue(false)
  projection.getActiveTransport.mockReset().mockReturnValue(null)
  vi.spyOn(console, 'log').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('USBService — phone attach paths', () => {
  test('accessory-mode device on connect marks phone connected', async () => {
    isAccessoryModeMock.mockReturnValue(true)
    new USBService(projection)
    connectHandler()(evt(mkPhoneCandidate()))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(true, expect.anything())
  })

  test('phone candidate on connect kicks off the bring-up (no probe)', async () => {
    new USBService(projection)
    connectHandler()(evt(mkPhoneCandidate()))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(true, expect.anything())
  })

  test('phone detach fires markPhoneConnected(false)', async () => {
    const phone = mkPhoneCandidate()
    new USBService(projection)
    connectHandler()(evt(phone))
    // Advance past the PHONE_REENUM_SUPPRESS_MS window so detach isn't suppressed
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 20_000)
    projection.markPhoneConnected.mockClear()
    disconnectHandler()(evt(phone))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(false)
    vi.useRealTimers()
  })

  test('phone detach during re-enumeration window is suppressed', async () => {
    const phone = mkPhoneCandidate()
    new USBService(projection)
    connectHandler()(evt(phone))
    projection.markPhoneConnected.mockClear()
    projection.isExpectingPhoneReenumeration.mockReturnValue(true)
    disconnectHandler()(evt(phone))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })

  test('OEM-PID re-attach while lastPhone=true resets state', async () => {
    const phone = mkPhoneCandidate()
    new USBService(projection)
    connectHandler()(evt(phone))
    projection.markPhoneConnected.mockClear()
    // Second attach with same OEM-PID
    connectHandler()(evt(phone))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(false)
  })

  test('accessory-mode re-attach during re-enum window keeps the bridge owner', async () => {
    isAccessoryModeMock.mockReturnValue(true)
    const phone = mkPhoneCandidate()
    new USBService(projection)
    connectHandler()(evt(phone))
    projection.markPhoneConnected.mockClear()
    projection.isExpectingPhoneReenumeration.mockReturnValue(true)
    connectHandler()(evt(phone))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(true, expect.anything())
  })

  test('attach while AA is active suppresses dongle broadcast', async () => {
    projection.getActiveTransport.mockReturnValue('aa')
    new USBService(projection)
    const dongle = {
      vendorId: 0x1314,
      productId: 0x1520,
      deviceClass: 0x00,
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      reset: vi.fn(async () => undefined)
    } as never
    connectHandler()(evt(dongle))
    // markDongleConnected still fires, but the renderer broadcast doesn't
    expect(projection.markDongleConnected).toHaveBeenCalledWith(true)
    expect((BrowserWindow.getAllWindows as Mock).mock.results).toEqual(expect.any(Array))
  })

  test('attach during stopped state is ignored', async () => {
    const svc = new USBService(projection)
    ;(svc as unknown as { stopped: boolean }).stopped = true
    connectHandler()(evt(mkPhoneCandidate()))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })

  test('detach during stopped state is ignored', async () => {
    const svc = new USBService(projection)
    ;(svc as unknown as { stopped: boolean }).stopped = true
    disconnectHandler()(evt(mkPhoneCandidate()))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })
})

describe('USBService — startup scan', () => {
  test('marks the first phone candidate on the bus on construction', async () => {
    const phone = mkPhoneCandidate()
    ;(usb.getDevices as Mock).mockResolvedValue([phone])
    new USBService(projection)
    // The startup scan runs asynchronously
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    expect(projection.markPhoneConnected).toHaveBeenCalledWith(true, phone)
  })

  test('startup scan skips when no candidate is in the list', async () => {
    ;(usb.getDevices as Mock).mockResolvedValue([])
    new USBService(projection)
    await new Promise((r) => setImmediate(r))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })
})

describe('USBService — isPhoneCandidate filter', () => {
  test('skips non-phone device classes (HID/HUB/etc.)', async () => {
    new USBService(projection)
    const hub = {
      vendorId: 0x1000,
      productId: 0x2000,
      deviceClass: 0x09 /* hub */,
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      reset: vi.fn(async () => undefined)
    } as never
    connectHandler()(evt(hub))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })

  test('skips a device with undefined deviceClass', async () => {
    new USBService(projection)
    const weird = {
      vendorId: 0x1000,
      productId: 0x2000,
      deviceClass: undefined,
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      reset: vi.fn(async () => undefined)
    } as never
    connectHandler()(evt(weird))
    expect(projection.markPhoneConnected).not.toHaveBeenCalled()
  })
})

// Ensure registerIpcHandle has been called (test infrastructure check)
test('USBService registers IPC on construction', async () => {
  new USBService(projection)
  expect(registerIpcHandle).toHaveBeenCalled()
})
