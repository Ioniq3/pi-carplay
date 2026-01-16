import type React from 'react'

type CircleOpts = {
  pressed?: boolean
  focused?: boolean
  hovered?: boolean
  ringColor: string
}

export function circleBtnStyle(size: number, opts: CircleOpts): React.CSSProperties {
  const { pressed, focused, hovered, ringColor } = opts

  const baseBg = 'rgba(255,255,255,0.16)'
  const activeBg = 'rgba(255,255,255,0.24)'

  const background = hovered || pressed || focused ? activeBg : baseBg

  let boxShadow = 'none'
  if (focused) {
    boxShadow = `0 0 0 3px ${ringColor}`
  } else if (pressed) {
    boxShadow = `0 0 0 4px ${ringColor} inset`
  } else if (hovered) {
    boxShadow = `0 0 0 2px ${ringColor}`
  }

  return {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    lineHeight: 0,
    outline: 'none',
    transform: pressed ? 'scale(0.94)' : 'scale(1)',
    transition: 'transform 110ms ease, box-shadow 110ms ease, background 110ms ease',
    boxShadow
  }
}
