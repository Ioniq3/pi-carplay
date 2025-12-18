import NumberSpinner from '../../../components/numberSpinner/numberSpinner'
import { NavVolumeProps } from '../types'

export const NavVolume = ({ data, onChange }: NavVolumeProps) => {
  return (
    <NumberSpinner
      id="nav-volume"
      size="small"
      isSlider
      value={Math.round(data.navVolume * 100)}
      onValueChange={(v) => onChange('navVolume', v / 100)}
    />
  )
}
