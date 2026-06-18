import { linuxPresetAngleVulkan } from '@main/utils'
import { app } from 'electron'
import type { Mock } from 'vitest'

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: vi.fn()
    }
  }
}))

vi.mock('@main/utils', () => ({
  linuxPresetAngleVulkan: vi.fn(),
  setFeatureFlags: vi.fn()
}))

const mockedAppendSwitch = app.commandLine.appendSwitch as Mock
const mockedLinuxPresetAngleVulkan = linuxPresetAngleVulkan as Mock

describe('gpu module', () => {
  const originalPlatform = process.platform
  const originalArch = process.arch

  const loadGpuModule = async () => {
    await vi.isolateModules(async () => {
      await import('@main/app/gpu')
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    Object.defineProperty(process, 'arch', { value: originalArch })
  })

  test('commonGpuToggles applies expected chromium gpu flags', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    Object.defineProperty(process, 'arch', { value: 'x64' })

    let commonGpuToggles: () => void

    await vi.isolateModules(async () => {
      ;({ commonGpuToggles } = await import('@main/app/gpu'))
    })

    mockedAppendSwitch.mockClear()
    commonGpuToggles()

    expect(mockedAppendSwitch).toHaveBeenCalledWith('ignore-gpu-blocklist')
    expect(mockedAppendSwitch).toHaveBeenCalledWith('enable-gpu-rasterization')
  })

  test('on linux x64 import applies gpu toggles and linux preset', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    Object.defineProperty(process, 'arch', { value: 'x64' })

    await loadGpuModule()

    expect(mockedAppendSwitch).toHaveBeenCalledWith('ignore-gpu-blocklist')
    expect(mockedAppendSwitch).toHaveBeenCalledWith('enable-gpu-rasterization')
    expect(mockedLinuxPresetAngleVulkan).toHaveBeenCalledTimes(1)
  })

  test('on linux non-x64 import applies gpu toggles but not the vulkan preset', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    Object.defineProperty(process, 'arch', { value: 'arm64' })

    await loadGpuModule()

    expect(mockedAppendSwitch).toHaveBeenCalledWith('ignore-gpu-blocklist')
    expect(mockedAppendSwitch).toHaveBeenCalledWith('enable-gpu-rasterization')
    expect(mockedLinuxPresetAngleVulkan).not.toHaveBeenCalled()
  })

  test('on darwin import applies no startup gpu side effects', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    Object.defineProperty(process, 'arch', { value: 'arm64' })

    await loadGpuModule()

    expect(mockedLinuxPresetAngleVulkan).not.toHaveBeenCalled()
    expect(mockedAppendSwitch).not.toHaveBeenCalled()
  })

  test('on unsupported platform import does not apply startup gpu side effects', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    Object.defineProperty(process, 'arch', { value: 'x64' })

    await loadGpuModule()

    expect(mockedLinuxPresetAngleVulkan).not.toHaveBeenCalled()
    expect(mockedAppendSwitch).not.toHaveBeenCalled()
  })
})
