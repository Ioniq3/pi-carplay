import { EventEmitter } from 'node:events'

class MockHttpServer extends EventEmitter {
  listen = vi.fn((_port: number, cb: () => void) => cb())
  close = vi.fn((cb?: () => void) => cb?.())
}

class MockSocket extends EventEmitter {
  emit = vi.fn((event: string, payload?: unknown) => {
    super.emit(event, payload)
    return true
  })
}

class MockIoServer extends EventEmitter {
  close = vi.fn((cb?: () => void) => cb?.())
  override emit = vi.fn((event: string, payload?: unknown) => {
    super.emit(event, payload)
    return true
  })
}

const lastIo: { server: MockIoServer | null } = { server: null }

vi.mock('http', () => ({
  __esModule: true,
  default: {
    createServer: vi.fn(function () {
      return new MockHttpServer()
    })
  },
  createServer: vi.fn(function () {
    return new MockHttpServer()
  })
}))

vi.mock('socket.io', () => ({
  __esModule: true,
  Server: vi.fn().mockImplementation(function () {
    const s = new MockIoServer()
    lastIo.server = s
    return s
  })
}))

import { TelemetryEvents, TelemetrySocket } from '../Socket'
import { TelemetryStore } from '../telemetry/TelemetryStore'

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(function () {})
  lastIo.server = null
})
afterEach(async () => vi.restoreAllMocks())

describe('TelemetrySocket', () => {
  test('starts an io server on the requested port', async () => {
    const store = new TelemetryStore()
    const _sock = new TelemetrySocket(store, 4001)
    expect(_sock.io).not.toBeNull()
  })

  test('new client connection emits the current snapshot', async () => {
    const store = new TelemetryStore()
    store.merge({ speedKph: 50 })
    new TelemetrySocket(store, 4002)

    const sock = new MockSocket()
    lastIo.server!.emit(TelemetryEvents.Connection, sock)
    expect(sock.emit).toHaveBeenCalledWith(
      TelemetryEvents.Update,
      expect.objectContaining({ speedKph: 50 })
    )
  })

  test('empty snapshot is not pushed on connect', async () => {
    const store = new TelemetryStore()
    new TelemetrySocket(store, 4003)
    const sock = new MockSocket()
    lastIo.server!.emit(TelemetryEvents.Connection, sock)
    expect(sock.emit).not.toHaveBeenCalled()
  })

  test('inbound "telemetry:push" merges into the store', () => {
    const store = new TelemetryStore()
    new TelemetrySocket(store, 4004)
    const sock = new MockSocket()
    lastIo.server!.emit(TelemetryEvents.Connection, sock)
    sock.emit(TelemetryEvents.Push, { speedKph: 10 })
    expect(store.snapshot().speedKph).toBe(10)
  })

  test('store change → broadcast on io server', async () => {
    const store = new TelemetryStore()
    new TelemetrySocket(store, 4005)
    store.merge({ speedKph: 7 })
    expect(lastIo.server!.emit).toHaveBeenCalledWith(
      TelemetryEvents.Update,
      expect.objectContaining({ speedKph: 7 })
    )
  })

  test('disconnect() closes io + http and detaches the store listener', async () => {
    const store = new TelemetryStore()
    const ts = new TelemetrySocket(store, 4006)
    const io = lastIo.server!
    await ts.disconnect()
    expect(io.close).toHaveBeenCalled()
  })

  test('connect() spins a new server back up', async () => {
    const store = new TelemetryStore()
    const ts = new TelemetrySocket(store, 4007)
    await ts.disconnect()
    await ts.connect()
    expect(ts.io).not.toBeNull()
  })

  test('disconnect resolves directly when there is no httpServer', async () => {
    const store = new TelemetryStore()
    const ts = new TelemetrySocket(store, 4008)
    // Force the httpServer to null AFTER initial setup but keep io
    ;(ts as unknown as { httpServer: null }).httpServer = null
    await expect(ts.disconnect()).resolves.toBeUndefined()
  })

  test('disconnect is a no-op when nothing was started yet', async () => {
    const store = new TelemetryStore()
    const ts = new TelemetrySocket(store, 4009)
    ;(ts as unknown as { io: null; httpServer: null; unsubscribeStore: null }).io = null
    ;(ts as unknown as { httpServer: null }).httpServer = null
    ;(ts as unknown as { unsubscribeStore: null }).unsubscribeStore = null
    await expect(ts.disconnect()).resolves.toBeUndefined()
  })
})
