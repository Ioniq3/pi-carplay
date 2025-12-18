import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../../../hooks/useSmartSettings'
import { CameraSettingKey } from './types'
import { StackItem } from '../../../../../../components/stackItem'
import { Typography } from '@mui/material'

export const Camera: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<CameraSettingKey, number | string | boolean> = {
    camera: settings?.camera
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <StackItem>
        <Typography>{settingsState.camera}</Typography>

        <Typography
          style={{
            justifyContent: 'flex-end'
          }}
        >
          {settingsState.camera?.length ? '+' : '-'}
        </Typography>
      </StackItem>
    </SettingsLayout>
  )
}
