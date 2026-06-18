import { render, screen } from '@testing-library/react'
import { TempGauge } from '../TempGauge'

describe('TempGauge', () => {
  test('renders the rounded temperature in degrees', () => {
    render(<TempGauge value={92.4} />)

    expect(screen.getByText('92°')).toBeInTheDocument()
  })

  test('falls back to 0 for non-finite values', () => {
    render(<TempGauge value={Number.NaN} />)

    expect(screen.getByText('0°')).toBeInTheDocument()
  })

  test('renders values above warnAbove (hot)', () => {
    render(<TempGauge value={130} warnAbove={125} />)

    expect(screen.getByText('130°')).toBeInTheDocument()
  })

  test('renders the configured number of bar segments', () => {
    const { container } = render(<TempGauge value={90} segments={6} />)

    const bars = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.childElementCount === 6
    )
    expect(bars.length).toBeGreaterThan(0)
  })

  test('handles a degenerate min/max range without dividing by zero', () => {
    expect(() => render(<TempGauge value={50} min={100} max={100} />)).not.toThrow()
  })

  test('applies className to the root element', () => {
    const { container } = render(<TempGauge value={90} className="temp-gauge-test" />)

    expect(container.firstChild).toHaveClass('temp-gauge-test')
  })
})
