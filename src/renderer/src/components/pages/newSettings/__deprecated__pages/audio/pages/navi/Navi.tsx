import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { NavSettingKey } from './types'
import { Slide, Slider } from '@mui/material'

export const Navi: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<NavSettingKey, number | string | boolean> = {
    navVolume: settings?.navVolume
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <div>
        <Slider
          aria-label="navVolume"
          size="small"
          value={Math.round((settingsState.navVolume ?? 1.0) * 100)}
          min={0}
          max={100}
          step={5}
          marks
          valueLabelDisplay="auto"
          onChange={(_, v) => typeof v === 'number' && handleFieldChange('navVolume', v / 100)}
        />

        <span>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
          been the industry's standard dummy text ever since the 1500s,
        </span>
      </div>
    </SettingsLayout>
  )
}
