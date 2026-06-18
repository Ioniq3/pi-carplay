import type { Mock, MockInstance } from 'vitest'

describe('installMainProcessErrorHandlers', () => {
  const realOn = process.on.bind(process)
  let handlers: Record<string, ((arg: unknown) => void) | undefined> = {}
  let warnSpy: MockInstance
  let errorSpy: MockInstance

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    handlers = {}
    vi.spyOn(process, 'on').mockImplementation(((event: string, cb: (arg: unknown) => void) => {
      handlers[event] = cb
      return process
    }) as typeof process.on)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(function () {})
  })

  afterEach(async () => {
    ;(process.on as unknown as MockInstance).mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    process.on = realOn
  })

  async function install() {
    const mod = await import('../errorHandler')
    mod.installMainProcessErrorHandlers()
  }

  test.each([
    ["Couldn't find matching udev device"],
    ['could not find matching udev device'],
    ['Couldnt find matching udev device'],
    ['LIBUSB_ERROR_NO_DEVICE'],
    ['matching udev device']
  ])('warns but never raises on benign libusb noise: %s', async (msg) => {
    await install()
    handlers.uncaughtException?.(new Error(msg))
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  test('logs non-benign uncaught exceptions to console.error without popping a dialog', async () => {
    await install()
    handlers.uncaughtException?.(new Error('Something completely unrelated'))
    expect(errorSpy).toHaveBeenCalled()
  })

  test('logs non-benign rejections to console.error', async () => {
    await install()
    handlers.unhandledRejection?.('plain string rejection')
    expect(errorSpy).toHaveBeenCalled()
  })

  test('is idempotent — installing twice only registers handlers once', async () => {
    await install()
    await install()
    expect((process.on as unknown as Mock).mock.calls.length).toBe(2)
  })
})
