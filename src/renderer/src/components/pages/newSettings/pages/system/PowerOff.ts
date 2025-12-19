import { StreamResolutionProps } from '../streamResolution/types'

export const PowerOff: React.FC<StreamResolutionProps> = () => {
  window.carplay.quit().catch(console.error)

  return null
}
