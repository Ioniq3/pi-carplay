import { AudioCommand } from '@shared/types/ProjectionEnums'

const {
  requestDevice,
  micInstances,
  MockMicrophone,
  MockDongleDriver,
  Plugged,
  Unplugged,
  VideoData,
  MediaData,
  Command,
  AudioData,
  SendAudio,
  SendCommand,
  SendTouch
} = vi.hoisted(() => {
  const EventEmitter = require('events')
  const requestDevice = vi.fn()
  const micInstances: any[] = []

  class MockMicrophone extends EventEmitter {
    start = vi.fn()
    stop = vi.fn()
    constructor() {
      super()
      micInstances.push(this)
    }
  }

  class MockDongleDriver extends EventEmitter {
    static knownDevices = [{ vendorId: 0x1314, productId: 0x1520 }]
    send = vi.fn(async () => true)
    initialise = vi.fn(async () => undefined)
    start = vi.fn(async () => undefined)
    close = vi.fn(async () => undefined)
  }

  class Plugged {
    constructor(public phoneType: number) {}
  }
  class Unplugged {}
  class VideoData {}
  class MediaData {}
  class Command {}
  class AudioData {
    constructor(
      public command?: number,
      public decodeType?: number
    ) {}
  }
  class SendAudio {
    constructor(
      public data: Int16Array,
      public decodeType: number
    ) {}
  }
  class SendCommand {
    constructor(public value: string) {}
  }
  class SendTouch {
    constructor(
      public x: number,
      public y: number,
      public action: number
    ) {}
  }

  return {
    requestDevice,
    micInstances,
    MockMicrophone,
    MockDongleDriver,
    Plugged,
    Unplugged,
    VideoData,
    MediaData,
    Command,
    AudioData,
    SendAudio,
    SendCommand,
    SendTouch
  }
})

vi.mock('usb', () => ({
  webusb: {
    requestDevice
  }
}))

vi.mock('@main/services/audio', () => ({
  Microphone: MockMicrophone
}))

vi.mock('@main/services/projection/messages', () => ({
  Plugged,
  Unplugged,
  VideoData,
  AudioData,
  MediaData,
  Command,
  SendAudio,
  SendCommand,
  SendTouch
}))

vi.mock('@main/services/projection/driver/dongle/dongleDriver', () => ({
  DongleDriver: MockDongleDriver,
  DEFAULT_CONFIG: { phoneConfig: {} }
}))

import Projection from '@main/services/projection/node/Projection'

describe('Projection node wrapper', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    micInstances.length = 0
    requestDevice.mockReset()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
  })

  test('microphone PCM data is forwarded to dongle driver as SendAudio', async () => {
    const p = new Projection({}) as any
    const mic = micInstances[0]

    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioInputConfig, 3))

    const chunk = new Int16Array([1, 2, 3])
    mic.emit('data', chunk)

    expect(p.dongleDriver.send).toHaveBeenCalledTimes(1)
    expect(p.dongleDriver.send.mock.calls[0][0]).toBeInstanceOf(SendAudio)
    expect(p.dongleDriver.send.mock.calls[0][0].data).toBe(chunk)
    expect(p.dongleDriver.send.mock.calls[0][0].decodeType).toBe(3)
  })

  test('handles Plugged event and emits onmessage plugged', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    p.dongleDriver.emit('message', new Plugged(3))

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'plugged' })
  })

  test('audio command start/stop controls microphone', async () => {
    const p = new Projection({}) as any
    const mic = micInstances[0]

    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioInputConfig, 3))

    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioVoiceAssistantStart))
    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioPhonecallStart))
    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioVoiceAssistantStop))
    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioPhonecallStop))

    expect(mic.start).toHaveBeenCalledTimes(2)
    expect(mic.start).toHaveBeenNthCalledWith(1, 3)
    expect(mic.start).toHaveBeenNthCalledWith(2, 3)
    expect(mic.stop).toHaveBeenCalledTimes(2)
  })

  test('resetDongle opens, resets and closes usb device', async () => {
    const dev = {
      open: vi.fn(async () => undefined),
      reset: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    }
    requestDevice.mockResolvedValue(dev)

    const p = new Projection({})
    await p.resetDongle()

    expect(requestDevice).toHaveBeenCalledWith({ filters: MockDongleDriver.knownDevices })
    expect(dev.open).toHaveBeenCalledTimes(1)
    expect(dev.reset).toHaveBeenCalledTimes(1)
    expect(dev.close).toHaveBeenCalledTimes(1)
  })

  test('initialiseAfterReconnect initialises driver and schedules wifiPair', async () => {
    const dev = {
      open: vi.fn(async () => undefined),
      reset: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    }
    requestDevice.mockResolvedValue(dev)

    const p = new Projection({ width: 800, height: 480, fps: 60 }) as any

    await p.initialiseAfterReconnect()

    expect(p.dongleDriver.initialise).toHaveBeenCalledWith(dev)
    expect(p.dongleDriver.start).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(15000)
    await Promise.resolve()
    expect(p.dongleDriver.send).toHaveBeenCalled()
  })

  test('sendKey and sendTouch proxy to dongle driver.send', async () => {
    const p = new Projection({}) as any

    p.sendKey('frame')
    p.sendTouch({ type: 2, x: 0.5, y: 0.4 })

    expect(p.dongleDriver.send.mock.calls[0][0]).toBeInstanceOf(SendCommand)
    expect(p.dongleDriver.send.mock.calls[1][0]).toBeInstanceOf(SendTouch)
  })

  test('stop closes dongle driver and clears timers', async () => {
    const p = new Projection({}) as any
    p._pairTimeout = setTimeout(() => {}, 1000)
    p._frameInterval = setInterval(() => {}, 1000)

    await p.stop()

    expect(p.dongleDriver.close).toHaveBeenCalledTimes(1)
    expect(p._pairTimeout).toBeNull()
    expect(p._frameInterval).toBeNull()
  })

  test('handles Plugged event with frameInterval config and sends frame commands on interval', async () => {
    const p = new Projection({
      phoneConfig: {
        3: { frameInterval: 1000 }
      }
    } as any) as any

    p.onmessage = vi.fn()

    p.dongleDriver.emit('message', new Plugged(3))

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'plugged' })

    vi.advanceTimersByTime(1000)

    expect(p.dongleDriver.send).toHaveBeenCalledTimes(1)
    expect(p.dongleDriver.send.mock.calls[0][0]).toBeInstanceOf(SendCommand)
    expect(p.dongleDriver.send.mock.calls[0][0].value).toBe('frame')
  })

  test('handles Unplugged event and emits onmessage unplugged', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    p.dongleDriver.emit('message', new Unplugged())

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'unplugged' })
  })

  test('handles VideoData event and emits onmessage video', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    const message = new VideoData()
    p.dongleDriver.emit('message', message)

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'video', message })
  })

  test('handles MediaData event and emits onmessage media', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    const message = new MediaData()
    p.dongleDriver.emit('message', message)

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'media', message })
  })

  test('handles Command event and emits onmessage command', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    const message = new Command()
    p.dongleDriver.emit('message', message)

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'command', message })
  })

  test('handles failure event and emits onmessage failure', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    p.dongleDriver.emit('failure')

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'failure' })
  })

  test('handles dongle-info event and emits onmessage dongleInfo', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    const info = { dongleFwVersion: '1.2.3', boxInfo: { foo: 'bar' } }
    p.dongleDriver.emit('dongle-info', info)

    expect(p.onmessage).toHaveBeenCalledWith({ type: 'dongleInfo', message: info })
  })

  test('resetDongle throws when no device is found', async () => {
    requestDevice.mockResolvedValue(null)

    const p = new Projection({})

    await expect(p.resetDongle()).rejects.toThrow('No dongle found for reset')
  })

  test('initialiseAfterReconnect throws when no device is found after reconnect', async () => {
    requestDevice.mockResolvedValue(null)

    const p = new Projection({})

    await expect(p.initialiseAfterReconnect()).rejects.toThrow('Dongle not found after reconnect')
  })

  test('resetDongle returns null from findDevice when requestDevice throws', async () => {
    requestDevice.mockRejectedValue(new Error('usb failed'))

    const p = new Projection({})

    await expect(p.resetDongle()).rejects.toThrow('No dongle found for reset')
  })

  test('stop catches close errors and logs them', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(function () {})
    const p = new Projection({}) as any
    const err = new Error('close failed')

    p.dongleDriver.close.mockRejectedValue(err)

    await expect(p.stop()).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(err)

    errorSpy.mockRestore()
  })

  test('ignores microphone data until an AudioInputConfig decode type was received', async () => {
    const p = new Projection({}) as any
    const mic = micInstances[0]

    const chunk = new Int16Array([1, 2, 3])
    mic.emit('data', chunk)

    expect(p.dongleDriver.send).not.toHaveBeenCalled()
  })

  test('ignores unknown driver message types', async () => {
    const p = new Projection({}) as any
    p.onmessage = vi.fn()

    class UnknownMessage {}
    p.dongleDriver.emit('message', new UnknownMessage())

    expect(p.onmessage).not.toHaveBeenCalled()
  })

  test('does not start microphone on audio start command when decode type is still unknown', async () => {
    const p = new Projection({}) as any
    const mic = micInstances[0]

    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioVoiceAssistantStart))
    p.dongleDriver.emit('message', new AudioData(AudioCommand.AudioPhonecallStart))

    expect(mic.start).not.toHaveBeenCalled()
  })
})
