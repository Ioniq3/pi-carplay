import type { Mocked } from 'vitest'

type IpcHandler = (evt: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, IpcHandler>()

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: (channel: string, handler: IpcHandler) => {
    handlers.set(channel, handler)
  },
  registerIpcOn: vi.fn()
}))

import { SendForgetBluetoothAddr } from '../../messages/sendable'
import { registerBluetoothIpc } from '../bluetooth'
import type { ProjectionIpcHost } from '../types'

type BtHost = Pick<
  ProjectionIpcHost,
  | 'isStarted'
  | 'isUsingDongle'
  | 'isUsingAa'
  | 'send'
  | 'sendBluetoothPairedList'
  | 'connectAaBt'
  | 'removeAaBt'
  | 'refreshAaBtPaired'
  | 'getBoxInfo'
  | 'setPendingStartupConnectTarget'
>

function fakeHost(over: Partial<BtHost> = {}): Mocked<BtHost> {
  return {
    isStarted: vi.fn(() => true),
    isUsingDongle: vi.fn(() => false),
    isUsingAa: vi.fn(() => false),
    send: vi.fn(async () => true),
    sendBluetoothPairedList: vi.fn(async () => true),
    connectAaBt: vi.fn(async () => ({ ok: true })),
    removeAaBt: vi.fn(async () => ({ ok: true })),
    refreshAaBtPaired: vi.fn(),
    getBoxInfo: vi.fn(() => undefined),
    setPendingStartupConnectTarget: vi.fn(),
    ...over
  } as Mocked<BtHost>
}

beforeEach(async () => {
  handlers.clear()
})

describe('bluetooth ipc — projection-bt-pairedlist-set', () => {
  test('returns { ok: false } when not started', async () => {
    const host = fakeHost({ isStarted: vi.fn(() => false) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-pairedlist-set')!
    await expect(h(null, 'abc')).resolves.toEqual({ ok: false })
  })

  test('sends to dongle when using dongle', async () => {
    const host = fakeHost({ isUsingDongle: vi.fn(() => true) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-pairedlist-set')!
    await expect(h(null, 'abc')).resolves.toEqual({ ok: true })
    expect(host.sendBluetoothPairedList).toHaveBeenCalledWith('abc')
  })

  test('no-op on AA path', async () => {
    const host = fakeHost({ isUsingDongle: vi.fn(() => false) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-pairedlist-set')!
    await expect(h(null, 'abc')).resolves.toEqual({ ok: true })
    expect(host.sendBluetoothPairedList).not.toHaveBeenCalled()
  })
})

describe('bluetooth ipc — projection-bt-connect-device', () => {
  test('rejects when not started or mac empty', async () => {
    const host = fakeHost({ isStarted: vi.fn(() => false) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false })

    const h2 = (() => {
      handlers.clear()
      registerBluetoothIpc(fakeHost())
      return handlers.get('projection-bt-connect-device')!
    })()
    await expect(h2(null, '   ')).resolves.toEqual({ ok: false })
  })

  test('AA path delegates to connectAaBt and refreshes on success', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      connectAaBt: vi.fn(async () => ({ ok: true }))
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
    expect(host.refreshAaBtPaired).toHaveBeenCalled()
  })

  test('AA path: connectAaBt throwing surfaces as { ok:false, error }', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      connectAaBt: vi.fn(async () => {
        throw new Error('busy')
      })
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false, error: 'busy' })
  })

  test('dongle path: AndroidAuto entry → Android phoneWorkMode', async () => {
    const host = fakeHost({
      getBoxInfo: vi.fn(function () {
        return { DevList: [{ id: 'AA:BB', type: 'AndroidAuto' }] }
      })
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
    expect(host.setPendingStartupConnectTarget).toHaveBeenCalledWith({
      btMac: 'AA:BB',
      phoneWorkMode: expect.any(Number)
    })
  })

  test('dongle path: non-AA entry → CarPlay phoneWorkMode', async () => {
    const host = fakeHost({
      getBoxInfo: vi.fn(function () {
        return { DevList: [{ id: 'CC:DD', type: 'CarPlay' }] }
      })
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await h(null, 'CC:DD')
    const arg = host.setPendingStartupConnectTarget.mock.calls[0][0]
    expect(arg).not.toBeNull()
  })
})

describe('bluetooth ipc — projection-bt-forget-device', () => {
  test('rejects when not started or mac empty', async () => {
    const host = fakeHost({ isStarted: vi.fn(() => false) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false })
  })

  test('AA path delegates to removeAaBt and refreshes on success', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      removeAaBt: vi.fn(async () => ({ ok: true }))
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
    expect(host.refreshAaBtPaired).toHaveBeenCalled()
  })

  test('AA path: removeAaBt throwing surfaces as { ok:false, error }', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      removeAaBt: vi.fn(async () => {
        throw new Error('not paired')
      })
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false, error: 'not paired' })
  })

  test('dongle path sends SendForgetBluetoothAddr', async () => {
    const host = fakeHost({ isUsingAa: vi.fn(() => false) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
    expect(host.send).toHaveBeenCalledWith(expect.any(SendForgetBluetoothAddr))
  })

  test('dongle path returns { ok: false } when send resolves falsy', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => false),
      send: vi.fn(async () => false)
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false })
  })

  test('forget rejects an empty mac', async () => {
    const host = fakeHost()
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, '')).resolves.toEqual({ ok: false })
    await expect(h(null, '   ')).resolves.toEqual({ ok: false })
  })

  test('forget AA-path: refresh not called when removeAaBt fails', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      removeAaBt: vi.fn(async () => ({ ok: false, error: 'unknown' }))
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-forget-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false, error: 'unknown' })
    expect(host.refreshAaBtPaired).not.toHaveBeenCalled()
  })
})

describe('bluetooth ipc — edge cases', () => {
  test('pairedlist-set tolerates null listText payload', async () => {
    const host = fakeHost({ isUsingDongle: vi.fn(() => true) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-pairedlist-set')!
    await h(null, null as unknown as string)
    expect(host.sendBluetoothPairedList).toHaveBeenCalledWith('')
  })

  test('connect AA-path: refresh not called when connectAaBt resolves !ok', async () => {
    const host = fakeHost({
      isUsingAa: vi.fn(() => true),
      connectAaBt: vi.fn(async () => ({ ok: false, error: 'no peer' }))
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: false, error: 'no peer' })
    expect(host.refreshAaBtPaired).not.toHaveBeenCalled()
  })

  test('connect dongle-path: empty BoxInfo or non-array DevList falls back to empty list', async () => {
    const host = fakeHost({ getBoxInfo: vi.fn(() => undefined) })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
    expect(host.setPendingStartupConnectTarget).toHaveBeenCalled()
  })

  test('connect dongle-path: BoxInfo with non-array DevList shape', async () => {
    const host = fakeHost({
      getBoxInfo: vi.fn(function () {
        return { DevList: 'not-an-array' }
      })
    })
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, 'AA:BB')).resolves.toEqual({ ok: true })
  })

  test('connect rejects empty mac (whitespace-only)', async () => {
    const host = fakeHost()
    registerBluetoothIpc(host)
    const h = handlers.get('projection-bt-connect-device')!
    await expect(h(null, '   ')).resolves.toEqual({ ok: false })
  })
})
