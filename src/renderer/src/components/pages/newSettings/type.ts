import { ReactNode } from 'react'

export interface StackItemProps {
  children?: ReactNode
  withForwardIcon?: boolean
  value?: string
  onClick?: () => void
}
