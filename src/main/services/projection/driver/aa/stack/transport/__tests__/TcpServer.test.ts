import { EventEmitter } from 'node:events'
import type { Mock } from 'vitest'

class MockNetSocket extends EventEmitter {
  remoteAddress = '127.0.0.1'
  remotePort = 12345
  setNoDelay = vi.fn()
  setTimeout = vi.fn()
}

class MockServer extends EventEmitter {
  listen = vi.fn((_port: number, _addr: string, cb: () => void) => cb())
  close = vi.fn()
}

const createServerMock = vi.fn()
vi.mock('net', () => ({
  __esModule: true,
  createServer: (...args: unknown[]) => createServerMock(...args)
}))

class MockSession extends EventEmitter {
  start = vi.fn(async () => undefined)
  close = vi.fn()
}

const sessionCtor = vi.fn()
vi.mock('../../session/Session', () => ({
  Session: vi.fn().mockImplementation(function (sock: unknown, cfg: unknown) {
    sessionCtor(sock, cfg)
    return new MockSession()
  })
}))

import { TcpServer } from '../TcpServer'

beforeEach(async () => {
  createServerMock.mockReset()
  sessionCtor.mockReset()
  vi.spyOn(console, 'log').mockImplementation(function () {})
  vi.spyOn(console, 'error').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('TcpServer', () => {
  test('listen() opens a net.createServer on the supplied port', async () => {
    let handler: ((s: unknown) => void) | null = null
    const srv = new MockServer()
    createServerMock.mockImplementationOnce((_opts: unknown, h: (s: unknown) => void) => {
      handler = h
      return srv
    })

    const tcp = new TcpServer({} as never)
    tcp.listen(5555)
    expect(srv.listen).toHaveBeenCalledWith(5555, '0.0.0.0', expect.any(Function))
    void handler
  })

  test('an inbound connection wires a Session and emits "session"', () => {
    let connHandler: ((s: MockNetSocket) => void) | null = null
    const srv = new MockServer()
    createServerMock.mockImplementationOnce((_opts: unknown, h: (s: unknown) => void) => {
      connHandler = h as (s: MockNetSocket) => void
      return srv
    })

    const tcp = new TcpServer({} as never)
    const sessionCb = vi.fn()
    tcp.on('session', sessionCb)
    tcp.listen()

    const sock = new MockNetSocket()
    connHandler!(sock)
    expect(sock.setNoDelay).toHaveBeenCalledWith(true)
    expect(sessionCtor).toHaveBeenCalled()
    expect(sessionCb).toHaveBeenCalled()
  })

  test('close() closes the server', async () => {
    const srv = new MockServer()
    createServerMock.mockImplementationOnce(() => srv)
    const tcp = new TcpServer({} as never)
    tcp.listen()
    tcp.close()
    expect(srv.close).toHaveBeenCalled()
  })

  test('session error/disconnected events are logged with the remote address', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(function () {})
    const log = vi.spyOn(console, 'log').mockImplementation(function () {})

    let connHandler: ((s: MockNetSocket) => void) | null = null
    const srv = new MockServer()
    createServerMock.mockImplementationOnce((_opts: unknown, h: (s: unknown) => void) => {
      connHandler = h as (s: MockNetSocket) => void
      return srv
    })

    const tcp = new TcpServer({} as never)
    tcp.listen()
    const sock = new MockNetSocket()
    connHandler!(sock)
    const session = ((await vi.importMock('../../session/Session')) as { Session: Mock }).Session
      .mock.results[0].value as MockSession
    session.emit('error', new Error('reset'))
    session.emit('disconnected', 'phone closed')
    session.emit('disconnected') // no reason → falls back to ''

    expect(errorLog).toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
    errorLog.mockRestore()
    log.mockRestore()
  })

  test('session.start rejection is logged but never throws out of the listener', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(function () {})
    const { Session } = (await vi.importMock('../../session/Session')) as { Session: Mock }
    Session.mockImplementationOnce(function () {
      const s = new MockSession()
      s.start = vi.fn(async () => {
        throw new Error('TLS broken')
      })
      return s
    })

    let connHandler: ((s: MockNetSocket) => void) | null = null
    const srv = new MockServer()
    createServerMock.mockImplementationOnce((_opts: unknown, h: (s: unknown) => void) => {
      connHandler = h as (s: MockNetSocket) => void
      return srv
    })

    const tcp = new TcpServer({} as never)
    tcp.listen()
    expect(() => connHandler!(new MockNetSocket())).not.toThrow()
    await new Promise((r) => setImmediate(r))
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('start error'),
      expect.any(String)
    )
    errorLog.mockRestore()
  })

  test('server "error" event is re-emitted', () => {
    const srv = new MockServer()
    createServerMock.mockImplementationOnce(() => srv)
    const tcp = new TcpServer({} as never)
    const onError = vi.fn()
    tcp.on('error', onError)
    tcp.listen()
    srv.emit('error', new Error('eaddrinuse'))
    expect(onError).toHaveBeenCalled()
  })
})
