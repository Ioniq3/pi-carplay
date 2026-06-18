import { render } from '@testing-library/react'
import { SegmentBar } from '../SegmentBar'

describe('SegmentBar', () => {
  const segmentCount = (el: ChildNode | null): number =>
    el ? (el as HTMLElement).childNodes.length : 0

  test('renders the default 8 segments', () => {
    const { container } = render(<SegmentBar ratio={0.5} onColor="#fff" offColor="#000" />)

    expect(segmentCount(container.firstChild)).toBe(8)
  })

  test('honours a custom segment count', () => {
    const { container } = render(
      <SegmentBar ratio={0.5} segments={5} onColor="#fff" offColor="#000" />
    )

    expect(segmentCount(container.firstChild)).toBe(5)
  })

  test('clamps out-of-range ratios without crashing', () => {
    expect(() => render(<SegmentBar ratio={2} onColor="#fff" offColor="#000" />)).not.toThrow()
    expect(() => render(<SegmentBar ratio={-1} onColor="#fff" offColor="#000" />)).not.toThrow()
  })

  test('applies className to the root element', () => {
    const { container } = render(
      <SegmentBar ratio={0.5} onColor="#fff" offColor="#000" className="seg-test" />
    )

    expect(container.firstChild).toHaveClass('seg-test')
  })
})
