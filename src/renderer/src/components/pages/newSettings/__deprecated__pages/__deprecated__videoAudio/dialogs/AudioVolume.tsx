import NumberSpinner from '../../../components/numberSpinner/numberSpinner'
import { AudioVolumeProps } from '../types'

export const AudioVolume = ({ data, onChange }: AudioVolumeProps) => {
  return (
    <NumberSpinner
      id="audio-volume"
      size="small"
      isSlider
      value={Math.round(data.audioVolume * 100)}
      onValueChange={(v) => onChange('audioVolume', v / 100)}
    />
  )
}
