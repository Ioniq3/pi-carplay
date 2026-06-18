import { registerIpcHandle, registerIpcOn } from '@main/ipc/register'
import { ipcMain } from 'electron'
import type { Mock } from 'vitest'

describe('register IPC helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('registerIpcHandle replaces previous handler before registering a new one', () => {
    const handler = vi.fn()

    registerIpcHandle('test:handle', handler)

    expect(ipcMain.removeHandler).toHaveBeenCalledWith('test:handle')
    expect(ipcMain.handle).toHaveBeenCalledWith('test:handle', handler)
    expect((ipcMain.removeHandler as Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (ipcMain.handle as Mock).mock.invocationCallOrder[0]
    )
  })

  test('registerIpcOn replaces previous listeners before registering a new one', () => {
    const listener = vi.fn()

    registerIpcOn('test:on', listener)

    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('test:on')
    expect(ipcMain.on).toHaveBeenCalledWith('test:on', listener)
    expect((ipcMain.removeAllListeners as Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (ipcMain.on as Mock).mock.invocationCallOrder[0]
    )
  })
})
