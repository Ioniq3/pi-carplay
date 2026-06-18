import { DEFAULT_MEDIA_DATA_RESPONSE } from '@main/services/projection/services/constants'
import { readMediaFile } from '@main/services/projection/services/utils/readMediaFile'
import fs from 'fs'
import type { Mock } from 'vitest'

vi.mock('fs', () => {
  const __m = {
    readFileSync: vi.fn()
  }
  return { ...__m, default: __m }
})

describe('readMediaFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns parsed persisted media payload', () => {
    const payload = {
      timestamp: '2026-01-01T00:00:00.000Z',
      payload: { type: 25, media: { MediaSongName: 'Song' }, base64Image: 'abc', error: false }
    }
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify(payload))

    expect(readMediaFile('/tmp/media.json')).toEqual(payload)
  })

  test('returns default response on read/parse failure', () => {
    ;(fs.readFileSync as Mock).mockImplementation(function () {
      throw new Error('boom')
    })

    expect(readMediaFile('/tmp/media.json')).toEqual(DEFAULT_MEDIA_DATA_RESPONSE)
  })
})
