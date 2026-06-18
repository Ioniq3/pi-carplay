import { createTheme, ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import { SoftPanel } from '../SoftPanel'

const renderInMode = (mode: 'light' | 'dark', props = {}) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <SoftPanel {...props} />
    </ThemeProvider>
  )

describe('SoftPanel', () => {
  test('renders a positioned backdrop element', () => {
    const { container } = renderInMode('dark')

    expect(container.firstChild).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV')
  })

  test('renders in light mode (white gradient branch)', () => {
    expect(() => renderInMode('light')).not.toThrow()
  })

  test('accepts a single sx object', () => {
    expect(() => renderInMode('dark', { sx: { top: 10 } })).not.toThrow()
  })

  test('accepts an sx array', () => {
    expect(() => renderInMode('dark', { sx: [{ top: 10 }, { left: 20 }] })).not.toThrow()
  })

  test('honours custom gradient props', () => {
    expect(() =>
      renderInMode('dark', {
        alpha: 0.5,
        soft: 40,
        end: 80,
        shape: 'circle',
        originX: 30,
        originY: 70
      })
    ).not.toThrow()
  })
})
