import { EventEmitter } from 'node:events'
import type { Mock } from 'vitest'
import { CH, CTRL_MSG, FRAME_FLAGS } from '../../constants'

// ── Mocks ───────────────────────────────────────────────────────────────────
type SendFn = (b: Buffer) => void

let lastSend: SendFn = () => {}
let lastBridge: { injectBytes: Mock } | null = null
let lastTlsSocket: (EventEmitter & { write: Mock; injectBytes?: Mock }) | null = null

vi.mock('../../crypto/TlsBridge', () => ({
  createTlsClient: (_cert: string, _key: string, send: SendFn) => {
    lastSend = send
    const bridge = { injectBytes: vi.fn() }
    const tlsSocket = Object.assign(new EventEmitter(), {
      write: vi.fn((_chunk: Buffer, cb?: () => void) => {
        if (cb) cb()
        return true
      })
    })
    lastBridge = bridge
    lastTlsSocket = tlsSocket as never
    return { tlsSocket, bridge }
  },
  TlsBridge: class {}
}))

vi.mock('../../crypto/cert', () => ({ HU_CERT_PEM: 'CERT', HU_KEY_PEM: 'KEY' }))

import { SessionTls, type SessionTlsDeps } from '../SessionTls'

function mkDeps(over: Partial<SessionTlsDeps> = {}): SessionTlsDeps {
  return {
    writeRaw: vi.fn(),
    onDecryptedMessage: vi.fn(),
    onSecureConnect: vi.fn(),
    onError: vi.fn(),
    isHandshakePhase: vi.fn(() => false),
    ...over
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  lastBridge = null
  lastTlsSocket = null
  vi.spyOn(console, 'log').mockImplementation(function () {})
  vi.spyOn(console, 'warn').mockImplementation(function () {})
  vi.spyOn(console, 'error').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('SessionTls — inbound injection', () => {
  test('injectHandshakeBytes forwards to bridge.injectBytes', async () => {
    const tls = new SessionTls(mkDeps())
    tls.injectHandshakeBytes(Buffer.from([1, 2, 3]))
    expect(lastBridge!.injectBytes).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
  })

  test('injectEncrypted queues channel ctx and pushes raw bytes', async () => {
    const tls = new SessionTls(mkDeps())
    tls.injectEncrypted(7, 0x0b, Buffer.from([0xaa, 0xbb]))
    expect(lastBridge!.injectBytes).toHaveBeenCalledWith(Buffer.from([0xaa, 0xbb]))
  })
})

describe('SessionTls — decrypted chunks → onDecryptedMessage', () => {
  test('BULK chunk (FIRST|LAST) emits a single message', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    tls.injectEncrypted(3, 0x03, Buffer.alloc(0))
    // Simulate the TLS engine handing us back the cleartext
    lastTlsSocket!.emit('data', Buffer.from([0x12, 0x34, 0xde, 0xad]))
    expect(onDecryptedMessage).toHaveBeenCalledWith(3, 0x03, 0x1234, Buffer.from([0xde, 0xad]))
  })

  test('FIRST + LAST fragments reassemble into one message', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    // FIRST (not LAST)
    tls.injectEncrypted(5, 0x01, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.from([0x00, 0x42, 0xaa]))
    // LAST
    tls.injectEncrypted(5, 0x02, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.from([0xbb, 0xcc]))
    expect(onDecryptedMessage).toHaveBeenCalledTimes(1)
    expect(onDecryptedMessage).toHaveBeenCalledWith(
      5,
      0x01,
      0x0042,
      Buffer.from([0xaa, 0xbb, 0xcc])
    )
  })

  test('FIRST + MIDDLE + LAST fragments reassemble', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    tls.injectEncrypted(5, 0x01, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.from([0x00, 0x42, 0x01]))
    tls.injectEncrypted(5, 0x00, Buffer.alloc(0)) // MIDDLE
    lastTlsSocket!.emit('data', Buffer.from([0x02]))
    tls.injectEncrypted(5, 0x02, Buffer.alloc(0)) // LAST
    lastTlsSocket!.emit('data', Buffer.from([0x03]))
    expect(onDecryptedMessage).toHaveBeenCalledTimes(1)
    expect(onDecryptedMessage).toHaveBeenCalledWith(
      5,
      0x01,
      0x0042,
      Buffer.from([0x01, 0x02, 0x03])
    )
  })

  test('decrypted chunk without queued ctx is dropped', async () => {
    const onDecryptedMessage = vi.fn()
    new SessionTls(mkDeps({ onDecryptedMessage }))
    lastTlsSocket!.emit('data', Buffer.from([0, 0, 0, 0]))
    expect(onDecryptedMessage).not.toHaveBeenCalled()
  })

  test('BULK chunk shorter than 2 bytes is dropped', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    tls.injectEncrypted(3, 0x03, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.from([0xff]))
    expect(onDecryptedMessage).not.toHaveBeenCalled()
  })

  test('continuation without a FIRST fragment is dropped', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    tls.injectEncrypted(5, 0x02, Buffer.alloc(0)) // LAST without FIRST
    lastTlsSocket!.emit('data', Buffer.from([0x00, 0x42, 0xaa]))
    expect(onDecryptedMessage).not.toHaveBeenCalled()
  })

  test('reassembled cleartext shorter than 2 bytes is dropped', async () => {
    const onDecryptedMessage = vi.fn()
    const tls = new SessionTls(mkDeps({ onDecryptedMessage }))
    tls.injectEncrypted(5, 0x01, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.from([0x42])) // only 1 byte
    tls.injectEncrypted(5, 0x02, Buffer.alloc(0))
    lastTlsSocket!.emit('data', Buffer.alloc(0))
    expect(onDecryptedMessage).not.toHaveBeenCalled()
  })
})

describe('SessionTls — outbound TLS bytes', () => {
  test('handshake bytes are coalesced into a single SSL_HANDSHAKE frame', () =>
    new Promise<void>((resolve) => {
      const writeRaw = vi.fn()
      const isHandshakePhase = vi.fn(() => true)
      new SessionTls(mkDeps({ writeRaw, isHandshakePhase }))
      // Simulate the TLS engine emitting two synchronous handshake chunks
      lastSend(Buffer.from([0x16, 0x03]))
      lastSend(Buffer.from([0x03, 0x00]))
      setImmediate(() => {
        expect(writeRaw).toHaveBeenCalledTimes(1)
        const frame = writeRaw.mock.calls[0][0] as Buffer
        // Frame: [ch=CONTROL][flags=PLAINTEXT][len=2BE=6][msgId=SSL_HANDSHAKE=2BE][payload]
        expect(frame.readUInt8(0)).toBe(CH.CONTROL)
        expect(frame.readUInt8(1)).toBe(FRAME_FLAGS.PLAINTEXT)
        expect(frame.readUInt16BE(2)).toBe(6)
        expect(frame.readUInt16BE(4)).toBe(CTRL_MSG.SSL_HANDSHAKE)
        expect(frame.subarray(6)).toEqual(Buffer.from([0x16, 0x03, 0x03, 0x00]))
        resolve()
      })
    }))

  test('post-handshake bytes get [ch][flags][len:2BE] header', async () => {
    const writeRaw = vi.fn()
    const tls = new SessionTls(mkDeps({ writeRaw, isHandshakePhase: () => false }))
    tls.sendEncrypted(0x05, 0x0b, Buffer.from([0xaa, 0xbb]))
    // The write-chain hands off through a microtask; flush before driving outbound bytes
    await new Promise((r) => setImmediate(r))
    lastSend(Buffer.from([0xc0, 0xff, 0xee]))
    expect(writeRaw).toHaveBeenCalled()
    const frame = writeRaw.mock.calls.at(-1)![0] as Buffer
    expect(frame.readUInt8(0)).toBe(0x05)
    expect(frame.readUInt8(1)).toBe(0x0b)
    expect(frame.readUInt16BE(2)).toBe(3)
    expect(frame.subarray(4)).toEqual(Buffer.from([0xc0, 0xff, 0xee]))
  })

  test('flushHandshake is a no-op when nothing was buffered', () =>
    new Promise<void>((resolve) => {
      const writeRaw = vi.fn()
      new SessionTls(mkDeps({ writeRaw, isHandshakePhase: () => true }))
      // No lastSend() call — but trigger the scheduled flush anyway via setImmediate
      setImmediate(() => {
        expect(writeRaw).not.toHaveBeenCalled()
        resolve()
      })
    }))
})

describe('SessionTls — TLS lifecycle', () => {
  test('tlsSocket secureConnect calls deps.onSecureConnect', async () => {
    const onSecureConnect = vi.fn()
    new SessionTls(mkDeps({ onSecureConnect }))
    lastTlsSocket!.emit('secureConnect')
    expect(onSecureConnect).toHaveBeenCalled()
  })

  test('tlsSocket error is forwarded to deps.onError', async () => {
    const onError = vi.fn()
    new SessionTls(mkDeps({ onError }))
    const err = new Error('boom')
    lastTlsSocket!.emit('error', err)
    expect(onError).toHaveBeenCalledWith(err)
  })
})

describe('SessionTls — sendEncrypted / drain', () => {
  test('sendEncrypted writes cleartext into the TLS socket', async () => {
    const tls = new SessionTls(mkDeps())
    tls.sendEncrypted(0x03, 0x0b, Buffer.from([0x12, 0x34]))
    await new Promise((r) => setImmediate(r))
    expect(lastTlsSocket!.write).toHaveBeenCalledWith(
      Buffer.from([0x12, 0x34]),
      expect.any(Function)
    )
  })

  test('drain() resolves after pending writes complete', async () => {
    const tls = new SessionTls(mkDeps())
    tls.sendEncrypted(0x03, 0x0b, Buffer.from([1, 2]))
    await expect(tls.drain()).resolves.toBeUndefined()
  })

  test('drain() resolves on a fresh instance with no pending writes', async () => {
    const tls = new SessionTls(mkDeps())
    await expect(tls.drain()).resolves.toBeUndefined()
  })

  test('sendEncrypted swallows a rejected writeChain', async () => {
    const tls = new SessionTls(mkDeps())
    // Force write to never invoke its callback to simulate a stuck chain;
    // then start a second send and ensure no unhandled rejection escapes.
    lastTlsSocket!.write.mockImplementationOnce(() => {
      throw new Error('synchronous write failure')
    })
    expect(() => tls.sendEncrypted(0x03, 0x0b, Buffer.from([1]))).not.toThrow()
    // Allow microtasks to run so the .catch handler fires
    await new Promise((r) => setImmediate(r))
  })
})
