describe('USBWorker', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const flush = () => new Promise((r) => setImmediate(r))

  test('throws if parentPort is missing', async () => {
    vi.doMock('worker_threads', () => ({ parentPort: null }))

    await expect(import('@main/services/usb/USBWorker')).rejects.toThrow('No parent port found')
  })

  test('posts connected status on check-dongle when helper finds device', async () => {
    const on = vi.fn()
    const postMessage = vi.fn()

    vi.doMock('worker_threads', () => ({
      parentPort: { on, postMessage }
    }))

    vi.doMock('@main/services/usb/helpers', () => ({
      findDongle: vi.fn(async () => ({
        vendorId: 0x1314,
        productId: 0x1520
      }))
    }))

    await vi.isolateModules(async () => {
      await import('@main/services/usb/USBWorker')
    })

    const cb = on.mock.calls.find(([evt]: [string]) => evt === 'message')?.[1]
    expect(cb).toBeDefined()

    cb('check-dongle')
    await flush()

    expect(postMessage).toHaveBeenCalledWith({
      type: 'dongle-status',
      connected: true,
      vendorId: 0x1314,
      productId: 0x1520
    })
  })

  test('posts disconnected status on check-dongle when no device', async () => {
    const on = vi.fn()
    const postMessage = vi.fn()

    vi.doMock('worker_threads', () => ({
      parentPort: { on, postMessage }
    }))

    vi.doMock('@main/services/usb/helpers', () => ({
      findDongle: vi.fn(async () => null)
    }))

    await vi.isolateModules(async () => {
      await import('@main/services/usb/USBWorker')
    })

    const cb = on.mock.calls.find(([evt]: [string]) => evt === 'message')?.[1]
    cb('check-dongle')
    await flush()

    expect(postMessage).toHaveBeenCalledWith({ type: 'dongle-status', connected: false })
  })

  test('ignores unknown worker messages', async () => {
    const on = vi.fn()
    const postMessage = vi.fn()

    vi.doMock('worker_threads', () => ({
      parentPort: { on, postMessage }
    }))

    vi.doMock('@main/services/usb/helpers', () => ({
      findDongle: vi.fn(async () => null)
    }))

    await vi.isolateModules(async () => {
      await import('@main/services/usb/USBWorker')
    })

    const cb = on.mock.calls.find(([evt]: [string]) => evt === 'message')?.[1]
    cb('noop')
    await flush()

    expect(postMessage).not.toHaveBeenCalled()
  })
})
