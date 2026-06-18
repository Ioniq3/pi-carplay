import { act, render } from '@testing-library/react'
import { GaugeArc } from '../GaugeArc'

const colors = {
  colorScale: '#111',
  colorMajor: '#222',
  colorPointer: '#0f0',
  colorRedline: '#f00'
}

describe('GaugeArc', () => {
  test('renders an accessible gauge svg with scale ticks', () => {
    const { container } = render(
      <GaugeArc value={0} scaleMax={100} ticks={10} armTicks={2} majorCount={4} {...colors} />
    )

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', 'gauge')
    // arc ticks (10) + two caps of 2 = 14 scale rects, plus the pointer
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(14)
  })

  test('renders one label per major graduation', () => {
    const { container } = render(
      <GaugeArc
        value={50}
        scaleMax={100}
        majorCount={4}
        labels={['0', '30', '60', '90']}
        {...colors}
      />
    )

    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts).toHaveLength(4)
    expect(texts).toEqual(['0', '30', '60', '90'])
  })

  test('colors ticks at/above the redline red', () => {
    const { container } = render(
      <GaugeArc value={90} scaleMax={100} redline={50} ticks={20} {...colors} />
    )

    const fills = Array.from(container.querySelectorAll('rect')).map((r) => r.getAttribute('fill'))
    expect(fills).toContain('#f00')
  })

  test('renders mirrored without crashing', () => {
    expect(() => render(<GaugeArc value={30} scaleMax={100} mirror {...colors} />)).not.toThrow()
  })

  test('sanitizes degenerate tick / major / scale values', () => {
    const { container } = render(
      <GaugeArc value={10} scaleMax={0} ticks={1} armTicks={0} majorCount={1} {...colors} />
    )

    // ticks floored to 2, no majors → no label texts
    expect(container.querySelectorAll('text')).toHaveLength(0)
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2)
  })

  test('eases the pointer in and fades the trail over time', () => {
    vi.useFakeTimers()
    try {
      const { container, unmount } = render(
        <GaugeArc value={80} scaleMax={100} ticks={20} {...colors} />
      )
      const before = container.querySelectorAll('rect').length

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // the trail fades in (opacity > 0), adding rects over the passed-over scale
      expect(container.querySelectorAll('rect').length).toBeGreaterThan(before)

      unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
