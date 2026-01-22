import { UpdatePhase } from './types'

export const CMP_CONFIG = {
  [-1]: {
    label: 'Update',
    status: 'Update available'
  },
  [0]: {
    label: 'Up to date',
    status: 'Up to date'
  },
  [1]: {
    label: 'Downgrade',
    status: 'Downgrade available'
  }
}

export const INSTALL_PHASES: readonly UpdatePhase[] = [
  'mounting',
  'copying',
  'unmounting',
  'installing',
  'relaunching'
]
