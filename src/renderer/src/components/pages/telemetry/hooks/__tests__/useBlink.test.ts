import { act, renderHook } from '@testing-library/react'
import { useBlink } from '../useBlink'

describe('useBlink', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts on when the wall clock is in the first half of the period', () => {
    const { result } = renderHook(() => useBlink(500))

    expect(result.current).toBe(true)
  })

  test('flips off and on again across period boundaries', () => {
    const { result } = renderHook(() => useBlink(500))
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(true)
  })

  test('is phase-aligned to the wall clock at mount', () => {
    vi.setSystemTime(500)

    const { result } = renderHook(() => useBlink(500))

    expect(result.current).toBe(false)
  })

  test('clears its interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useBlink())

    unmount()

    expect(clearSpy).toHaveBeenCalled()
  })
})
