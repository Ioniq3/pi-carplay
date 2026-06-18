type IpcHandler = (evt: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, IpcHandler>()

const existsSyncMock = vi.fn(() => true)
const readMediaFileMock = vi.fn(function () {
  return { ok: true, kind: 'media' }
})
const readNavigationFileMock = vi.fn(function () {
  return { ok: true, kind: 'nav' }
})

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: (channel: string, handler: IpcHandler) => {
    handlers.set(channel, handler)
  },
  registerIpcOn: vi.fn()
}))

vi.mock('fs', () => {
  const __m = { existsSync: (...a: unknown[]) => existsSyncMock(...a) }
  return { ...__m, default: __m }
})
vi.mock('electron', () => ({ app: { getPath: () => '/tmp/livi' } }))
vi.mock('../../services/utils/readMediaFile', () => ({
  readMediaFile: (...a: unknown[]) => readMediaFileMock(...a)
}))
vi.mock('../../services/utils/readNavigationFile', () => ({
  readNavigationFile: (...a: unknown[]) => readNavigationFileMock(...a)
}))
vi.mock('../../services/constants', () => ({
  DEFAULT_MEDIA_DATA_RESPONSE: { __default: 'media' },
  DEFAULT_NAVIGATION_DATA_RESPONSE: { __default: 'nav' }
}))

import { registerDataIpc } from '../data'

beforeEach(async () => {
  handlers.clear()
  existsSyncMock.mockReset().mockReturnValue(true)
  readMediaFileMock.mockReset().mockReturnValue({ ok: true, kind: 'media' })
  readNavigationFileMock.mockReset().mockReturnValue({ ok: true, kind: 'nav' })
  vi.spyOn(console, 'log').mockImplementation(function () {})
})
afterEach(async () => vi.restoreAllMocks())

describe('data ipc — projection-media-read', () => {
  test('reads the media file when it exists', async () => {
    registerDataIpc()
    const r = await handlers.get('projection-media-read')!(null)
    expect(r).toEqual({ ok: true, kind: 'media' })
    expect(readMediaFileMock).toHaveBeenCalled()
  })

  test('returns the default response when the file is missing', async () => {
    existsSyncMock.mockReturnValueOnce(false)
    registerDataIpc()
    const r = await handlers.get('projection-media-read')!(null)
    expect(r).toEqual({ __default: 'media' })
  })

  test('returns the default response when readMediaFile throws', async () => {
    readMediaFileMock.mockImplementationOnce(() => {
      throw new Error('parse error')
    })
    registerDataIpc()
    const r = await handlers.get('projection-media-read')!(null)
    expect(r).toEqual({ __default: 'media' })
  })
})

describe('data ipc — projection-navigation-read', () => {
  test('reads the navigation file when it exists', async () => {
    registerDataIpc()
    const r = await handlers.get('projection-navigation-read')!(null)
    expect(r).toEqual({ ok: true, kind: 'nav' })
  })

  test('returns the default response when the file is missing', async () => {
    existsSyncMock.mockReturnValueOnce(false)
    registerDataIpc()
    const r = await handlers.get('projection-navigation-read')!(null)
    expect(r).toEqual({ __default: 'nav' })
  })

  test('returns the default response when readNavigationFile throws', async () => {
    readNavigationFileMock.mockImplementationOnce(() => {
      throw new Error('IO')
    })
    registerDataIpc()
    const r = await handlers.get('projection-navigation-read')!(null)
    expect(r).toEqual({ __default: 'nav' })
  })
})
