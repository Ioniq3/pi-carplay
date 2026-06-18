import { EventEmitter } from 'node:events'

class MockSocket extends EventEmitter {
  write = vi.fn()
  destroy = vi.fn()
}

const createConnection = vi.fn()
vi.mock('net', () => ({
  __esModule: true,
  createConnection: (...a: unknown[]) => createConnection(...a)
}))

import { triggerRfcommRetrigger } from '../retrigger'

function nextSocket(): MockSocket {
  return createConnection.mock.results[createConnection.mock.results.length - 1].value as MockSocket
}

beforeEach(async () => {
  createConnection.mockReset()
  createConnection.mockImplementation(function () {
    return new MockSocket()
  })
  vi.spyOn(console, 'log').mockImplementation(function () {})
  vi.spyOn(console, 'warn').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('triggerRfcommRetrigger', () => {
  test('writes "R" on connect and resolves true on "OK" reply', async () => {
    const p = triggerRfcommRetrigger()
    const sock = nextSocket()
    sock.emit('connect')
    expect(sock.write).toHaveBeenCalledWith(Buffer.from('R'))
    sock.emit('data', Buffer.from('OK'))
    sock.emit('close')
    expect(await p).toBe(true)
  })

  test('resolves false when reply is not OK', async () => {
    const p = triggerRfcommRetrigger()
    const sock = nextSocket()
    sock.emit('connect')
    sock.emit('data', Buffer.from('ERR'))
    sock.emit('close')
    expect(await p).toBe(false)
  })

  test('resolves false on ENOENT (sock not present)', async () => {
    const p = triggerRfcommRetrigger()
    const sock = nextSocket()
    const err = Object.assign(new Error('not there'), { code: 'ENOENT' }) as NodeJS.ErrnoException
    sock.emit('error', err)
    expect(await p).toBe(false)
  })

  test('resolves false on generic error', async () => {
    const p = triggerRfcommRetrigger()
    const sock = nextSocket()
    sock.emit('error', new Error('eof'))
    expect(await p).toBe(false)
  })

  test('resolves false on timeout', async () => {
    vi.useFakeTimers()
    const p = triggerRfcommRetrigger()
    nextSocket()
    vi.advanceTimersByTime(3_500)
    expect(await p).toBe(false)
    vi.useRealTimers()
  })
})
