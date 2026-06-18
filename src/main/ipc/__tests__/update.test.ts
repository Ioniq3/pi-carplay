import { registerIpcHandle } from '@main/ipc/register'
import { registerUpdateIpc } from '@main/ipc/update'
import { Updater } from '@main/ipc/update/updater'
import type { Mock } from 'vitest'

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: vi.fn()
}))

vi.mock('@main/ipc/update/updater', () => ({
  Updater: vi.fn().mockImplementation(function () {
    return {
      perform: vi.fn(),
      abort: vi.fn(),
      install: vi.fn()
    }
  })
}))

describe('registerUpdateIpc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('creates Updater and registers update handlers', () => {
    const services = { projectionService: {}, usbService: {}, telemetrySocket: {} } as never

    registerUpdateIpc(services)

    expect(Updater).toHaveBeenCalledWith(services)

    const updaterInstance = (Updater as Mock).mock.results[0].value

    expect(registerIpcHandle).toHaveBeenCalledWith('app:performUpdate', updaterInstance.perform)
    expect(registerIpcHandle).toHaveBeenCalledWith('app:abortUpdate', updaterInstance.abort)
    expect(registerIpcHandle).toHaveBeenCalledWith('app:beginInstall', updaterInstance.install)
  })
})
