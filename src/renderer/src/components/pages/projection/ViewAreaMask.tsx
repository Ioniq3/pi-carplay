import { useTheme } from '@mui/material'
import type { CSSProperties } from 'react'

export type ViewAreaInsets = { top: number; bottom: number; left: number; right: number }

// Passepartout between the LIVI UI and the video plane: paints the configured view-area margins
// with the theme background, leaving the view area itself transparent so the video shows through.
// Platform-independent, the video always sits below the React UI (mac NSView, Linux compositor plane).
export function ViewAreaMask({
  insets,
  displayWidth,
  displayHeight,
  visible
}: {
  insets: ViewAreaInsets
  displayWidth: number
  displayHeight: number
  visible: boolean
}) {
  const theme = useTheme()
  if (!visible || displayWidth <= 0 || displayHeight <= 0) return null

  const pct = (v: number, total: number): string => `${(Math.max(0, v) / total) * 100}%`
  const bar: CSSProperties = {
    position: 'absolute',
    backgroundColor: theme.palette.background.default,
    pointerEvents: 'none',
    zIndex: 5
  }

  return (
    <>
      <div style={{ ...bar, top: 0, left: 0, right: 0, height: pct(insets.top, displayHeight) }} />
      <div
        style={{ ...bar, bottom: 0, left: 0, right: 0, height: pct(insets.bottom, displayHeight) }}
      />
      <div style={{ ...bar, top: 0, bottom: 0, left: 0, width: pct(insets.left, displayWidth) }} />
      <div
        style={{ ...bar, top: 0, bottom: 0, right: 0, width: pct(insets.right, displayWidth) }}
      />
    </>
  )
}
