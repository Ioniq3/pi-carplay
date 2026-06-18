import { type Mock, vi } from 'vitest'

const isolateModules = async (fn: () => unknown): Promise<void> => {
  vi.resetModules()
  await fn()
}
Object.assign(vi, { isolateModules, isolateModulesAsync: isolateModules })

vi.mock('electron', () => {
  const webContents = {
    send: vi.fn(),
    setZoomFactor: vi.fn(),
    session: {
      setPermissionCheckHandler: vi.fn(),
      setPermissionRequestHandler: vi.fn(),
      setUSBProtectedClassesHandler: vi.fn()
    },
    setWindowOpenHandler: vi.fn(),
    openDevTools: vi.fn()
  }

  return {
    app: {
      getPath: vi.fn(() => '/tmp'),
      getVersion: vi.fn(() => '0.0.0-test'),
      quit: vi.fn(),
      relaunch: vi.fn(),
      exit: vi.fn(),
      requestSingleInstanceLock: vi.fn(() => true),
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      once: vi.fn(),
      commandLine: { appendSwitch: vi.fn() }
    },
    ipcRenderer: {
      send: vi.fn(),
      on: vi.fn(),
      invoke: vi.fn(),
      removeListener: vi.fn()
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
      removeAllListeners: vi.fn()
    },
    BrowserWindow: Object.assign(
      vi.fn(() => ({ webContents })),
      {
        getAllWindows: vi.fn(() => [])
      }
    ),
    WebContents: vi.fn(),
    protocol: {
      registerSchemesAsPrivileged: vi.fn(),
      registerStreamProtocol: vi.fn()
    },
    session: {
      defaultSession: { webRequest: { onHeadersReceived: vi.fn() } }
    },
    shell: {
      openExternal: vi.fn()
    },
    screen: {
      getDisplayMatching: vi.fn(() => ({ workArea: { width: 1920, height: 1080, x: 0, y: 0 } })),
      getPrimaryDisplay: vi.fn(() => ({ workArea: { width: 1920, height: 1080, x: 0, y: 0 } }))
    },
    net: {
      request: vi.fn()
    }
  }
})

vi.mock('usb', () => ({
  usb: {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    unrefHotplugEvents: vi.fn()
  },
  getDeviceList: vi.fn(() => []),
  WebUSBDevice: vi.fn()
}))

declare global {
  interface Window {
    api: {
      send: Mock
      receive: Mock
    }
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    value: {
      send: vi.fn(),
      receive: vi.fn()
    },
    configurable: true
  })
}
