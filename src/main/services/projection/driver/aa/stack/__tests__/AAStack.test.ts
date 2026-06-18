import { EventEmitter } from 'node:events'
import type { Mock } from 'vitest'

class MockSession extends EventEmitter {
  sendTouch = vi.fn()
  sendButton = vi.fn()
  sendRotary = vi.fn()
  sendFuelData = vi.fn()
  sendSpeedData = vi.fn()
  sendRpmData = vi.fn()
  sendGearData = vi.fn()
  sendNightModeData = vi.fn()
  sendParkingBrakeData = vi.fn()
  sendLightData = vi.fn()
  sendEnvironmentData = vi.fn()
  sendOdometerData = vi.fn()
  sendDrivingStatusData = vi.fn()
  sendGpsLocationData = vi.fn()
  sendVehicleEnergyModel = vi.fn()
  sendMicPcm = vi.fn()
  requestVideoFocus = vi.fn()
  requestClusterKeyframe = vi.fn()
  setClusterStreamActive = vi.fn()
  requestShutdown = vi.fn(async () => undefined)
  start = vi.fn(async () => undefined)
  close = vi.fn()
}

class MockTcpServer extends EventEmitter {
  listen = vi.fn()
  close = vi.fn()
}

vi.mock('../session/Session', () => ({
  Session: vi.fn().mockImplementation(function () {
    return new MockSession()
  })
}))

vi.mock('../transport/TcpServer', () => ({
  TcpServer: vi.fn().mockImplementation(function () {
    return new MockTcpServer()
  })
}))

vi.mock('../system/hwaddr', () => ({
  detectBtMac: vi.fn(() => 'AA:BB:CC:DD:EE:FF'),
  detectWifiBssid: vi.fn(() => '11:22:33:44:55:66')
}))

import type * as net from 'node:net'
import { AAStack, type AAStackConfig } from '../index'

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(function () {})
  vi.spyOn(console, 'warn').mockImplementation(function () {})
  vi.spyOn(console, 'error').mockImplementation(function () {})
  ;((await vi.importMock('../session/Session')) as { Session: Mock }).Session.mockReset()
  ;((await vi.importMock('../session/Session')) as { Session: Mock }).Session.mockImplementation(
    function () {
      return new MockSession()
    }
  )
  ;((await vi.importMock('../transport/TcpServer')) as { TcpServer: Mock }).TcpServer.mockReset()
  ;(
    (await vi.importMock('../transport/TcpServer')) as { TcpServer: Mock }
  ).TcpServer.mockImplementation(function () {
    return new MockTcpServer()
  })
})
afterEach(async () => vi.restoreAllMocks())

function baseCfg(over: Partial<AAStackConfig> = {}): AAStackConfig {
  return {
    huName: 'LIVI',
    clusterWidth: 0,
    clusterHeight: 0,
    clusterFps: 0,
    clusterDpi: 0,
    ...over
  } as AAStackConfig
}

function setup() {
  const stack = new AAStack(baseCfg())
  const server = (stack as unknown as { _server: MockTcpServer })._server
  // Drive a session through the server
  const session = new MockSession()
  server.emit('session', session)
  return { stack, server, session }
}

describe('AAStack — construction', () => {
  test('auto-detects btMacAddress + wifiBssid when missing', async () => {
    const cfg = baseCfg()
    new AAStack(cfg)
    expect(cfg.btMacAddress).toBe('AA:BB:CC:DD:EE:FF')
    expect(cfg.wifiBssid).toBe('11:22:33:44:55:66')
  })

  test('skips auto-detection when provided', async () => {
    const cfg = baseCfg({ btMacAddress: 'preset', wifiBssid: 'wlan-mac' })
    new AAStack(cfg)
    expect(cfg.btMacAddress).toBe('preset')
    expect(cfg.wifiBssid).toBe('wlan-mac')
  })
})

describe('AAStack — lifecycle', () => {
  test('start() listens on the configured port', async () => {
    const stack = new AAStack(baseCfg({ port: 5277 }))
    const server = (stack as unknown as { _server: MockTcpServer })._server
    stack.start()
    expect(server.listen).toHaveBeenCalledWith(5277)
  })

  test('stop() closes the active session and the server', async () => {
    const { stack, server, session } = setup()
    stack.stop()
    expect(session.close).toHaveBeenCalled()
    expect(server.close).toHaveBeenCalled()
  })

  test('stop() without an active session still closes the server', async () => {
    const stack = new AAStack(baseCfg())
    const server = (stack as unknown as { _server: MockTcpServer })._server
    stack.stop()
    expect(server.close).toHaveBeenCalled()
  })

  test('session.close throwing is swallowed during stop()', async () => {
    const { stack, session } = setup()
    session.close.mockImplementation(function () {
      throw new Error('already closed')
    })
    expect(() => stack.stop()).not.toThrow()
  })
})

describe('AAStack — event forwarding', () => {
  test('forwards video / audio / nav events from the active session', async () => {
    const { session, stack } = setup()
    const events: string[] = []
    const expected = [
      'video-frame',
      'cluster-video-frame',
      'video-codec',
      'cluster-video-codec',
      'audio-frame',
      'audio-start',
      'audio-stop',
      'mic-start',
      'mic-stop',
      'voice-session',
      'host-ui-requested',
      'video-focus-projected',
      'cluster-video-focus-projected',
      'media-metadata',
      'media-status',
      'nav-start',
      'nav-stop',
      'nav-status',
      'nav-turn',
      'nav-distance',
      'connected',
      'disconnected'
    ]
    for (const e of expected) stack.on(e, () => events.push(e))
    for (const e of expected) session.emit(e)
    expect(events).toEqual(expected)
  })

  test('session "error" is forwarded', () => {
    const { session, stack } = setup()
    const onError = vi.fn()
    stack.on('error', onError)
    session.emit('error', new Error('x'))
    expect(onError).toHaveBeenCalled()
  })

  test('server "error" is forwarded', () => {
    const stack = new AAStack(baseCfg())
    const server = (stack as unknown as { _server: MockTcpServer })._server
    const onError = vi.fn()
    stack.on('error', onError)
    server.emit('error', new Error('eaddrinuse'))
    expect(onError).toHaveBeenCalled()
  })
})

describe('AAStack — outbound API delegates to active session', () => {
  test('without an active session, calls are silently dropped', async () => {
    const stack = new AAStack(baseCfg())
    expect(() => {
      stack.sendTouch(0, [{ x: 0, y: 0, id: 0 }])
      stack.sendButton(3, true)
      stack.sendRotary(1)
      stack.sendFuelData(50)
      stack.sendSpeedData(10_000)
      stack.sendRpmData(2_000_000)
      stack.sendGearData(4)
      stack.sendNightModeData(true)
      stack.sendParkingBrakeData(false)
      stack.sendLightData(1, false, 2)
      stack.sendEnvironmentData(20_000)
      stack.sendOdometerData(120_000)
      stack.sendDrivingStatusData(0)
      stack.sendGpsLocationData({ latDeg: 52, lngDeg: 13 })
      stack.sendVehicleEnergyModel(50_000, 30_000, 200_000)
      stack.sendMicPcm(Buffer.alloc(0))
      stack.requestVideoFocus()
      stack.requestClusterKeyframe()
    }).not.toThrow()
  })

  test('every outbound method delegates to the active session', async () => {
    const { stack, session } = setup()
    stack.sendTouch(0, [{ x: 0, y: 0, id: 0 }], 0)
    stack.sendButton(3, true)
    stack.sendRotary(1)
    stack.sendFuelData(50, 200, true)
    stack.sendSpeedData(10_000, true, 12_000)
    stack.sendRpmData(2_000_000)
    stack.sendGearData(4)
    stack.sendNightModeData(true)
    stack.sendParkingBrakeData(false)
    stack.sendLightData(1, false, 2)
    stack.sendEnvironmentData(20_000, 101_000, 0)
    stack.sendOdometerData(120_000)
    stack.sendDrivingStatusData(0)
    stack.sendGpsLocationData({ latDeg: 52, lngDeg: 13 })
    stack.sendVehicleEnergyModel(50_000, 30_000, 200_000)
    stack.sendMicPcm(Buffer.from([1]))
    stack.requestVideoFocus()
    stack.requestClusterKeyframe()
    await stack.requestShutdown()

    expect(session.sendTouch).toHaveBeenCalled()
    expect(session.sendButton).toHaveBeenCalled()
    expect(session.sendRotary).toHaveBeenCalled()
    expect(session.sendFuelData).toHaveBeenCalled()
    expect(session.sendSpeedData).toHaveBeenCalled()
    expect(session.sendRpmData).toHaveBeenCalled()
    expect(session.sendGearData).toHaveBeenCalled()
    expect(session.sendNightModeData).toHaveBeenCalled()
    expect(session.sendParkingBrakeData).toHaveBeenCalled()
    expect(session.sendLightData).toHaveBeenCalled()
    expect(session.sendEnvironmentData).toHaveBeenCalled()
    expect(session.sendOdometerData).toHaveBeenCalled()
    expect(session.sendDrivingStatusData).toHaveBeenCalled()
    expect(session.sendGpsLocationData).toHaveBeenCalled()
    expect(session.sendVehicleEnergyModel).toHaveBeenCalled()
    expect(session.sendMicPcm).toHaveBeenCalled()
    expect(session.requestVideoFocus).toHaveBeenCalled()
    expect(session.requestClusterKeyframe).toHaveBeenCalled()
    expect(session.requestShutdown).toHaveBeenCalled()
  })
})

describe('AAStack.attachSocket', () => {
  test('constructs a Session and starts it', async () => {
    const stack = new AAStack(baseCfg())
    const sock = { setNoDelay: vi.fn() } as unknown as net.Socket
    const session = stack.attachSocket(sock)
    expect((sock as unknown as { setNoDelay: Mock }).setNoDelay).toHaveBeenCalledWith(true)
    expect(session).toBeDefined()
    expect((session as unknown as MockSession).start).toHaveBeenCalled()
  })

  test('attachSocket session "error" + "disconnected" are logged with the loopback tag', () => {
    const errLog = vi.spyOn(console, 'error').mockImplementation(function () {})
    const log = vi.spyOn(console, 'log').mockImplementation(function () {})
    const stack = new AAStack(baseCfg())
    stack.on('error', () => {})
    const sock = { setNoDelay: vi.fn() } as unknown as net.Socket
    const session = stack.attachSocket(sock) as unknown as MockSession
    session.emit('error', new Error('reset'))
    session.emit('disconnected', 'phone closed')
    session.emit('disconnected') // no reason → '' fallback
    expect(errLog).toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
    errLog.mockRestore()
    log.mockRestore()
  })

  test('attachSocket session.start rejecting is caught and logged', async () => {
    const errLog = vi.spyOn(console, 'error').mockImplementation(function () {})
    const { Session } = (await vi.importMock('../session/Session')) as { Session: Mock }
    Session.mockImplementationOnce(function () {
      const s = new MockSession()
      s.start = vi.fn(async () => {
        throw new Error('TLS rejected')
      })
      return s
    })
    const stack = new AAStack(baseCfg())
    const sock = { setNoDelay: vi.fn() } as unknown as net.Socket
    stack.attachSocket(sock)
    await new Promise((r) => setImmediate(r))
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('start error'), 'TLS rejected')
    errLog.mockRestore()
  })

  test('attachSocket session.disconnected with no reason yields empty-string log', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(function () {})
    const stack = new AAStack(baseCfg())
    const sock = { setNoDelay: vi.fn() } as unknown as net.Socket
    const session = stack.attachSocket(sock) as unknown as MockSession
    session.emit('disconnected', undefined)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
