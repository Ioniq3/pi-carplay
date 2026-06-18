import { electronApp } from '@electron-toolkit/utils'
import { setupAppIdentity } from '@main/app/init'

vi.mock('@electron-toolkit/utils', () => ({
  electronApp: {
    setAppUserModelId: vi.fn()
  }
}))

describe('setupAppIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('sets expected app user model id', () => {
    setupAppIdentity()

    expect(electronApp.setAppUserModelId).toHaveBeenCalledWith('com.livi.app')
  })
})
