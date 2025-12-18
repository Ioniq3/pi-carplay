import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { ScreenResolutionSettingKey } from './types'
import { TextField } from '@mui/material'
import { CAR_NAME_MAX } from '../../../../../settings/constants'
import NumberSpinner from '../../../../components/numberSpinner/numberSpinner'

export const ScreenResolution: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<ScreenResolutionSettingKey, number | string | boolean> = {
    width: settings?.width,
    height: settings?.height
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <div>
        <NumberSpinner
          style={{ marginTop: 16 }}
          id="width"
          label="Width"
          size="small"
          value={settingsState.width}
          onValueChange={(v) => onChange('width', v)}
        />

        <span>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
          been the industry's standard dummy text ever since the 1500s,
        </span>
      </div>

      <br />

      <div>
        <NumberSpinner
          id="width"
          label="Width"
          size="small"
          value={settingsState.height}
          onValueChange={(v) => onChange('width', v)}
        />

        <span>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
          been the industry's standard dummy text ever since the 1500s,
        </span>
      </div>
    </SettingsLayout>
  )
}
