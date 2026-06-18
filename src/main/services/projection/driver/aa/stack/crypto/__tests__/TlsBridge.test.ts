import { TlsBridge } from '../TlsBridge'

describe('TlsBridge', () => {
  test('forwards writes to the send callback', () =>
    new Promise<void>((resolve) => {
      const send = vi.fn()
      const bridge = new TlsBridge(send)
      bridge.write(Buffer.from('hello'), (err) => {
        expect(err).toBeFalsy()
        expect(send).toHaveBeenCalledWith(Buffer.from('hello'))
        resolve()
      })
    }))

  test('injectBytes pushes data into the readable side', () =>
    new Promise<void>((resolve) => {
      const bridge = new TlsBridge(vi.fn())
      bridge.on('readable', () => {
        const chunk = bridge.read()
        if (chunk) {
          expect((chunk as Buffer).toString()).toBe('payload')
          resolve()
        }
      })
      bridge.injectBytes(Buffer.from('payload'))
    }))

  test('_read is a no-op (we never pull from the bridge)', async () => {
    const bridge = new TlsBridge(vi.fn())
    // Calling _read directly must not throw
    expect(() => (bridge as unknown as { _read: (n: number) => void })._read(1024)).not.toThrow()
  })
})

describe('createTlsClient', () => {
  // We don't drive the full TLS handshake in unit tests — only verify wiring.
  test('returns { tlsSocket, bridge } where bridge forwards via the supplied send', async () => {
    const { createTlsClient } = (await vi.importActual(
      '../TlsBridge'
    )) as typeof import('../TlsBridge')
    const { HU_CERT_PEM, HU_KEY_PEM } = (await vi.importActual(
      '../cert'
    )) as typeof import('../cert')
    const send = vi.fn()
    const { tlsSocket, bridge } = createTlsClient(HU_CERT_PEM, HU_KEY_PEM, send)

    expect(tlsSocket).toBeDefined()
    expect(bridge).toBeInstanceOf(TlsBridge)

    // The bridge should forward chunks via send when written to
    bridge.write(Buffer.from([0xab]))
    expect(send).toHaveBeenCalled()
    tlsSocket.destroy()
  })
})
