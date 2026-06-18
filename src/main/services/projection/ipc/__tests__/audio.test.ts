type IpcOnHandler = (evt: unknown, ...args: unknown[]) => void
const onHandlers = new Map<string, IpcOnHandler>()

vi.mock('@main/ipc/register', () => ({
  registerIpcHandle: vi.fn(),
  registerIpcOn: (channel: string, handler: IpcOnHandler) => {
    onHandlers.set(channel, handler)
  }
}))

import { registerAudioIpc } from '../audio'

beforeEach(() => onHandlers.clear())

describe('audio ipc', () => {
  test('projection-set-volume forwards stream + volume', () => {
    const host = { setAudioStreamVolume: vi.fn(), setAudioVisualizerEnabled: vi.fn() }
    registerAudioIpc(host)
    onHandlers.get('projection-set-volume')!(null, { stream: 'music', volume: 0.5 })
    expect(host.setAudioStreamVolume).toHaveBeenCalledWith('music', 0.5)
  })

  test('projection-set-volume null payload still calls setter (with undefineds)', () => {
    const host = { setAudioStreamVolume: vi.fn(), setAudioVisualizerEnabled: vi.fn() }
    registerAudioIpc(host)
    onHandlers.get('projection-set-volume')!(null, null)
    expect(host.setAudioStreamVolume).toHaveBeenCalled()
  })

  test('projection-set-visualizer-enabled coerces to boolean', () => {
    const host = { setAudioStreamVolume: vi.fn(), setAudioVisualizerEnabled: vi.fn() }
    registerAudioIpc(host)
    onHandlers.get('projection-set-visualizer-enabled')!(null, 1)
    onHandlers.get('projection-set-visualizer-enabled')!(null, 0)
    // No event sender in this test, so the per-window id is undefined
    expect(host.setAudioVisualizerEnabled).toHaveBeenCalledWith(true, undefined)
    expect(host.setAudioVisualizerEnabled).toHaveBeenCalledWith(false, undefined)
  })
})
