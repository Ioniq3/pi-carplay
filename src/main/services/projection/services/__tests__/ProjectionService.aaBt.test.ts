import type { Mock } from 'vitest'

// Reuse the same mocking style as the main ProjectionService.test.ts but
// add a stubbed AaBtSockClient so we can exercise the AA-BT helpers
// (refreshAaBtPairedList / populateAaBtPairedListInitial / tryAutoConnect /
// openAaBtSubscription / closeAaBtSubscription) without involving the
// real Python sock.

const aaBtSockMock = {
  listPaired: vi.fn(
    async () => [] as Array<{ mac: string; name?: string; connected?: boolean; trusted?: boolean }>
  ),
  connect: vi.fn(async (_mac: string) => ({ ok: true })),
  connectFull: vi.fn(async (_mac: string) => ({ ok: true })),
  remove: vi.fn(async (_mac: string) => ({ ok: true })),
  subscribe: vi.fn((_onEvent: (e: unknown) => void, _onClose?: () => void) => ({
    close: vi.fn()
  }))
}

vi.mock('../../driver/aa/AaBtSockClient', () => ({
  AaBtSockClient: vi.fn().mockImplementation(function () {
    return aaBtSockMock
  })
}))

vi.mock('../../messages', async () => {
  const EventEmitter = require('events')
  class MockDongleDriver extends EventEmitter {
    send = vi.fn(async () => true)
    initialise = vi.fn(async () => undefined)
    start = vi.fn(async () => undefined)
    stop = vi.fn(async () => undefined)
    close = vi.fn(async () => undefined)
    sendBluetoothPairedList = vi.fn(async () => true)
  }
  class Stub {
    constructor(
      public a?: unknown,
      public b?: unknown
    ) {}
  }
  return {
    DongleDriver: MockDongleDriver,
    Plugged: class {},
    Unplugged: class {},
    PhoneType: { CarPlay: 3, AndroidAuto: 5 },
    BluetoothPairedList: class {},
    VideoData: class {},
    AudioData: class {},
    MetaData: class {},
    MediaType: { Data: 1 },
    NavigationMetaType: { DashboardInfo: 200 },
    Command: class {},
    BoxInfo: class {},
    SoftwareVersion: class {},
    GnssData: class {},
    SendRawMessage: Stub,
    SendCommand: Stub,
    SendTouch: Stub,
    SendMultiTouch: Stub,
    SendAudio: Stub,
    SendFile: Stub,
    SendServerCgiScript: Stub,
    SendLiviWeb: Stub,
    SendDisconnectPhone: Stub,
    SendCloseDongle: Stub,
    FileAddress: { ICON_120: '/120', ICON_180: '/180', ICON_256: '/256' },
    BoxUpdateProgress: class {},
    BoxUpdateState: class {},
    MessageType: { ClusterVideoData: 0x2c },
    decodeTypeMap: {},
    DEFAULT_CONFIG: { apkVer: '1.0.0', language: 'en' }
  }
})

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: vi.fn(),
  registerIpcOn: vi.fn()
}))

vi.mock('../ProjectionAudio', () => ({
  ProjectionAudio: vi.fn().mockImplementation(function () {
    return {
      setInitialVolumes: vi.fn(),
      resetForSessionStart: vi.fn(),
      resetForSessionStop: vi.fn(),
      setStreamVolume: vi.fn(),
      setVisualizerEnabled: vi.fn(),
      handleAudioData: vi.fn()
    }
  })
}))

vi.mock('../FirmwareUpdateService', () => ({
  FirmwareUpdateService: vi.fn().mockImplementation(function () {
    return {
      checkForUpdate: vi.fn(async () => ({ ok: true, hasUpdate: false, raw: {} })),
      downloadFirmwareToHost: vi.fn(),
      getLocalFirmwareStatus: vi.fn()
    }
  })
}))

const { configEventsMock } = vi.hoisted(() => ({
  configEventsMock: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}))
vi.mock('@main/ipc/utils', () => ({
  configEvents: configEventsMock
}))

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/appdata') },
  WebContents: class {}
}))

vi.mock('usb', () => ({
  WebUSBDevice: { createInstance: vi.fn(async () => ({})) },
  usb: { getDeviceList: vi.fn(() => []) }
}))

import { ProjectionService } from '../ProjectionService'

type FakeAa = {
  isWiredMode: Mock
  close: Mock
}

function newSvc(): {
  svc: ProjectionService
  setAa: (aa: FakeAa | null) => void
  setSupervisor: (sup: object | null) => void
} {
  const svc = new ProjectionService()
  const setAa = (aa: FakeAa | null): void => {
    ;(svc as unknown as { drivers: { aa: FakeAa | null } }).drivers.aa = aa
  }
  const setSupervisor = (sup: object | null): void => {
    ;(svc as unknown as { aaBtSupervisor: object | null }).aaBtSupervisor = sup
  }
  return { svc, setAa, setSupervisor }
}

function fakeAa(): FakeAa {
  return { isWiredMode: vi.fn(() => false), close: vi.fn() }
}

beforeEach(async () => {
  aaBtSockMock.listPaired.mockReset()
  aaBtSockMock.connect.mockReset()
  aaBtSockMock.remove.mockReset()
  aaBtSockMock.subscribe.mockReset()
  configEventsMock.emit.mockReset()
  vi.spyOn(console, 'log').mockImplementation(function () {})
  vi.spyOn(console, 'warn').mockImplementation(function () {})
  vi.spyOn(console, 'error').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('refreshAaBtPairedList', () => {
  test('still queries BT presence when no AA driver is active', async () => {
    const { svc } = newSvc()
    aaBtSockMock.listPaired.mockResolvedValueOnce([])
    await (svc as unknown as { refreshAaBtPairedList: () => Promise<void> }).refreshAaBtPairedList()
    expect(aaBtSockMock.listPaired).toHaveBeenCalled()
  })

  test('listPaired error is swallowed unless throwOnError', async () => {
    const { svc, setAa } = newSvc()
    setAa(fakeAa())
    aaBtSockMock.listPaired.mockImplementationOnce(async () => {
      throw new Error('sock down')
    })
    await expect(
      (svc as unknown as { refreshAaBtPairedList: () => Promise<void> }).refreshAaBtPairedList()
    ).resolves.toBeUndefined()
  })

  test('listPaired error rethrows when throwOnError=true', async () => {
    const { svc, setAa } = newSvc()
    setAa(fakeAa())
    aaBtSockMock.listPaired.mockImplementationOnce(async () => {
      throw new Error('sock down')
    })
    await expect(
      (
        svc as unknown as {
          refreshAaBtPairedList: (opts: { throwOnError: boolean }) => Promise<void>
        }
      ).refreshAaBtPairedList({ throwOnError: true })
    ).rejects.toThrow()
  })

  test('a new connected device is persisted via configEvents', async () => {
    const { svc, setAa } = newSvc()
    setAa(fakeAa())
    aaBtSockMock.listPaired.mockResolvedValueOnce([
      { mac: 'AA:BB', name: 'Phone', connected: true, trusted: true }
    ])
    await (svc as unknown as { refreshAaBtPairedList: () => Promise<void> }).refreshAaBtPairedList()
    expect(configEventsMock.emit).toHaveBeenCalledWith(
      'requestSave',
      expect.objectContaining({ lastConnectedAaBtMac: 'AA:BB' })
    )
  })

  test('builds DevList in boxInfo from paired devices', async () => {
    const { svc, setAa } = newSvc()
    setAa(fakeAa())
    aaBtSockMock.listPaired.mockResolvedValueOnce([
      { mac: 'AA:BB', name: 'P1', connected: false },
      { mac: 'CC:DD', name: 'P2', connected: false }
    ])
    await (svc as unknown as { refreshAaBtPairedList: () => Promise<void> }).refreshAaBtPairedList()
    const box = (svc as unknown as { boxInfo: { DevList?: unknown[] } }).boxInfo
    expect(box.DevList).toHaveLength(2)
  })
})

describe('tryAutoConnect', () => {
  test('no-op without active supervisor', async () => {
    const { svc } = newSvc()
    await (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    expect(aaBtSockMock.listPaired).not.toHaveBeenCalled()
  })

  test('bails when something is already connected', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([{ mac: 'AA:BB', connected: true }])
    await (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    expect(aaBtSockMock.connect).not.toHaveBeenCalled()
  })

  test('logs and bails when paired list is empty', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([])
    await (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    expect(aaBtSockMock.connect).not.toHaveBeenCalled()
  })

  test('prefers lastConnectedAaBtMac when present', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    ;(svc as unknown as { config: { lastConnectedAaBtMac: string } }).config.lastConnectedAaBtMac =
      'AA:BB'
    aaBtSockMock.listPaired.mockResolvedValueOnce([
      { mac: 'CC:DD', connected: false, trusted: false },
      { mac: 'AA:BB', connected: false, trusted: false }
    ])
    await (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    expect(aaBtSockMock.connect).toHaveBeenCalledWith('AA:BB')
  })

  test('falls back to first trusted device', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([
      { mac: 'CC:DD', connected: false, trusted: false },
      { mac: 'AA:BB', connected: false, trusted: true }
    ])
    await (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    expect(aaBtSockMock.connect).toHaveBeenCalledWith('AA:BB')
  })

  test('connect error is swallowed', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([{ mac: 'AA:BB', trusted: true }])
    aaBtSockMock.connect.mockImplementationOnce(async () => {
      throw new Error('busy')
    })
    await expect(
      (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    ).resolves.toBeUndefined()
  })

  test('connect resp.ok=false logs but does not throw', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([{ mac: 'AA:BB', trusted: true }])
    aaBtSockMock.connect.mockResolvedValueOnce({ ok: false, error: 'no agent' })
    await expect(
      (svc as unknown as { tryAutoConnect: () => Promise<void> }).tryAutoConnect()
    ).resolves.toBeUndefined()
  })
})

describe('openAaBtSubscription / closeAaBtSubscription', () => {
  test('open is a no-op without an active supervisor', async () => {
    const { svc } = newSvc()
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    expect(aaBtSockMock.subscribe).not.toHaveBeenCalled()
  })

  test('open with an active supervisor creates a subscription', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.subscribe.mockReturnValueOnce({ close: vi.fn() })
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    expect(aaBtSockMock.subscribe).toHaveBeenCalledTimes(1)
  })

  test('open is idempotent', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.subscribe.mockReturnValueOnce({ close: vi.fn() })
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    expect(aaBtSockMock.subscribe).toHaveBeenCalledTimes(1)
  })

  test('close ends the subscription', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    const closeFn = vi.fn()
    aaBtSockMock.subscribe.mockReturnValueOnce({ close: closeFn })
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    ;(svc as unknown as { closeAaBtSubscription: () => void }).closeAaBtSubscription()
    expect(closeFn).toHaveBeenCalled()
  })

  test('close is a no-op when no subscription is open', async () => {
    const { svc } = newSvc()
    expect(() =>
      (svc as unknown as { closeAaBtSubscription: () => void }).closeAaBtSubscription()
    ).not.toThrow()
  })

  test('close swallows a throw from the underlying handle', async () => {
    const { svc, setAa } = newSvc()
    setAa(fakeAa())
    aaBtSockMock.subscribe.mockReturnValueOnce({
      close: () => {
        throw new Error('already closed')
      }
    })
    ;(svc as unknown as { openAaBtSubscription: () => void }).openAaBtSubscription()
    expect(() =>
      (svc as unknown as { closeAaBtSubscription: () => void }).closeAaBtSubscription()
    ).not.toThrow()
  })
})

describe('populateAaBtPairedListInitial', () => {
  test('exits immediately on first non-empty list', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor({})
    aaBtSockMock.listPaired.mockResolvedValueOnce([{ mac: 'AA:BB' }])
    await (
      svc as unknown as { populateAaBtPairedListInitial: () => Promise<void> }
    ).populateAaBtPairedListInitial()
    expect(aaBtSockMock.listPaired).toHaveBeenCalled()
  })

  test('bails fast when supervisor disappears mid-loop', async () => {
    const { svc, setSupervisor } = newSvc()
    setSupervisor(null)
    await (
      svc as unknown as { populateAaBtPairedListInitial: () => Promise<void> }
    ).populateAaBtPairedListInitial()
    expect(aaBtSockMock.listPaired).not.toHaveBeenCalled()
  })
})
