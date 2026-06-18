import { render, screen } from '@testing-library/react'
import { SoftReadout } from '../SoftReadout'

describe('SoftReadout', () => {
  test('renders the value and the caption', () => {
    render(<SoftReadout value={120} label="KPH" />)

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('KPH')).toBeInTheDocument()
  })

  test('renders a string value', () => {
    render(<SoftReadout value="D" label="GEAR" />)

    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('GEAR')).toBeInTheDocument()
  })

  test('applies className to the root element', () => {
    const { container } = render(<SoftReadout value={0} label="RPM" className="readout-test" />)

    expect(container.firstChild).toHaveClass('readout-test')
  })

  test.each(['center', 'start', 'end'] as const)('renders with %s alignment', (align) => {
    render(<SoftReadout value={42} label="X" align={align} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('reserves character width when maxChars is set', () => {
    render(<SoftReadout value={7} label="GEAR" maxChars={2} />)

    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
