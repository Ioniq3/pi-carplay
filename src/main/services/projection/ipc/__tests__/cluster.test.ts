import type { Mock } from 'vitest'

type IpcHandler = (evt: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, IpcHandler>()

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: (channel: string, handler: IpcHandler) => {
    handlers.set(channel, handler)
  },
  registerIpcOn: vi.fn()
}))

import { SendCommand } from '../../messages/sendable'
import { registerClusterIpc } from '../cluster'

function freshHost() {
  return {
    getConfig: vi.fn(function () {
      return {
        dashboards: { dash3: { main: true, dash: false, aux: false } }
      }
    }) as Mock,
    setClusterRequested: vi.fn(),
    setClusterVisible: vi.fn(),
    resetLastClusterVideoSize: vi.fn(),
    getLastClusterCodec: vi.fn(() => 'h264' as 'h264' | null),
    getLastClusterVideoSize: vi.fn(() => null as { width: number; height: number } | null),
    getClusterTargetWebContents: vi.fn(() => []),
    send: vi.fn(async () => true)
  }
}

beforeEach(async () => handlers.clear())

describe('cluster ipc — cluster:request', () => {
  test('enabled=false sets cluster off and resets size', async () => {
    const host = freshHost()
    registerClusterIpc(host)
    const r = await handlers.get('cluster:request')!(null, false)
    expect(host.setClusterRequested).toHaveBeenCalledWith(false)
    expect(host.resetLastClusterVideoSize).toHaveBeenCalled()
    expect(r).toEqual({ ok: true, enabled: false })
  })

  test('enabled=true with cluster off in config still resets', async () => {
    const host = freshHost()
    host.getConfig.mockReturnValue({
      dashboards: { dash3: { main: false, dash: false, aux: false } }
    } as never)
    registerClusterIpc(host)
    const r = await handlers.get('cluster:request')!(null, true)
    expect(host.setClusterRequested).toHaveBeenCalledWith(false)
    expect(r).toEqual({ ok: true, enabled: false })
  })

  test('enabled=true with cluster on emits codec to each target + send focus', async () => {
    const wc = { send: vi.fn() }
    const host = freshHost()
    host.getClusterTargetWebContents.mockReturnValue([wc as never])
    registerClusterIpc(host)
    const r = await handlers.get('cluster:request')!(null, true)
    expect(wc.send).toHaveBeenCalledWith('projection-event', {
      type: 'cluster-video-codec',
      payload: { codec: 'h264' }
    })
    expect(host.send).toHaveBeenCalledWith(expect.any(SendCommand))
    expect(r).toEqual({ ok: true, enabled: true })
  })

  test('skips codec re-emit when no cached codec', async () => {
    const host = freshHost()
    host.getLastClusterCodec.mockReturnValue(null)
    const wc = { send: vi.fn() }
    host.getClusterTargetWebContents.mockReturnValue([wc as never])
    registerClusterIpc(host)
    await handlers.get('cluster:request')!(null, true)
    expect(wc.send).not.toHaveBeenCalled()
  })

  test('thrown wc.send is swallowed', async () => {
    const host = freshHost()
    const wc = {
      send: vi.fn(function () {
        throw new Error('detached')
      })
    }
    host.getClusterTargetWebContents.mockReturnValue([wc as never])
    registerClusterIpc(host)
    await expect(handlers.get('cluster:request')!(null, true)).resolves.toEqual({
      ok: true,
      enabled: true
    })
  })

  test('thrown host.send is swallowed', async () => {
    const host = freshHost()
    host.send.mockImplementation(function () {
      throw new Error('not started')
    })
    registerClusterIpc(host)
    await expect(handlers.get('cluster:request')!(null, true)).resolves.toEqual({
      ok: true,
      enabled: true
    })
  })
})
