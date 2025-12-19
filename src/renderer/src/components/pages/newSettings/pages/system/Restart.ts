import { StreamResolutionProps } from '../streamResolution/types'

export const Restart: React.FC<StreamResolutionProps> = () => {
  window.carplay.quit().catch(console.error)

  return null
}
