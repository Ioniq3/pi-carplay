vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn()
  },
  net: {
    fetch: vi.fn()
  }
}))

describe('appProtocol', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function loadModule() {
    const existsSync = vi.fn()

    vi.doMock('fs', () => ({
      existsSync
    }))

    vi.doMock('url', () => ({
      pathToFileURL: vi.fn(function (file: string) {
        return {
          toString: () => `file://${file}`
        }
      })
    }))

    const mod = await import('@main/protocol/appProtocol')
    const { protocol, net } = await import('electron')

    return {
      registerAppProtocol: mod.registerAppProtocol,
      protocol,
      net,
      existsSync
    }
  }

  test('registers privileged app scheme at module load', async () => {
    const { protocol } = await loadModule()

    expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: 'app',
        privileges: {
          secure: true,
          standard: true,
          corsEnabled: true,
          supportFetchAPI: true,
          stream: true
        }
      }
    ])
  })

  test('registerAppProtocol registers app handler', async () => {
    const { registerAppProtocol, protocol } = await loadModule()

    registerAppProtocol()

    expect(protocol.handle).toHaveBeenCalledWith('app', expect.any(Function))
  })

  test('registerAppProtocol responds 200 with fetched file body and security headers', async () => {
    const { registerAppProtocol, protocol, net, existsSync } = await loadModule()

    existsSync.mockReturnValue(true)
    net.fetch.mockResolvedValue(
      new Response('ok', {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      })
    )

    registerAppProtocol()

    const handler = protocol.handle.mock.calls.find(([scheme]: [string]) => scheme === 'app')?.[1]
    expect(handler).toBeDefined()

    const response = await handler({ url: 'app://index.html' })

    expect(net.fetch).toHaveBeenCalledWith(expect.stringContaining('/renderer/index.html'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html')
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-site')
    expect(await response.text()).toBe('ok')
  })

  test('registerAppProtocol responds 404 when file is missing', async () => {
    const { registerAppProtocol, protocol, net, existsSync } = await loadModule()

    existsSync.mockReturnValue(false)

    registerAppProtocol()

    const handler = protocol.handle.mock.calls.find(([scheme]: [string]) => scheme === 'app')?.[1]
    expect(handler).toBeDefined()

    const response = await handler({ url: 'app://missing.js' })

    expect(response.status).toBe(404)
    expect(net.fetch).not.toHaveBeenCalled()
  })

  test('registerAppProtocol responds 500 on invalid URL parse error', async () => {
    const { registerAppProtocol, protocol } = await loadModule()

    registerAppProtocol()

    const handler = protocol.handle.mock.calls.find(([scheme]: [string]) => scheme === 'app')?.[1]
    expect(handler).toBeDefined()

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await handler({ url: '::invalid-url::' })

    expect(response.status).toBe(500)
    expect(errSpy).toHaveBeenCalled()

    errSpy.mockRestore()
  })
})
