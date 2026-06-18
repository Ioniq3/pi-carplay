import { render, screen } from '@testing-library/react'
import { FuelGauge } from '../FuelGauge'

describe('FuelGauge', () => {
  test('renders the rounded level as a percentage', () => {
    render(<FuelGauge level={54.6} />)

    expect(screen.getByText('55%')).toBeInTheDocument()
  })

  test('clamps the level to 0..100', () => {
    const { rerender } = render(<FuelGauge level={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()

    rerender(<FuelGauge level={-20} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('falls back to 0 for non-finite values', () => {
    render(<FuelGauge level={Number.NaN} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('renders the battery glyph in battery mode', () => {
    const { container } = render(<FuelGauge level={50} mode="battery" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  test('renders the configured number of bar segments', () => {
    const { container } = render(<FuelGauge level={50} segments={5} />)

    // the SegmentBar is the flex container holding the segment boxes
    const bars = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.childElementCount === 5
    )
    expect(bars.length).toBeGreaterThan(0)
  })

  test('applies className to the root element', () => {
    const { container } = render(<FuelGauge level={50} className="fuel-gauge-test" />)

    expect(container.firstChild).toHaveClass('fuel-gauge-test')
  })
})
