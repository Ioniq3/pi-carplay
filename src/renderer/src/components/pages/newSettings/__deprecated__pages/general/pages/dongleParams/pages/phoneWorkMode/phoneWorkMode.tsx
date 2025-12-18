import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../../../hooks/useSmartSettings'
import { phoneWorkModeSettingKey } from './types'
import NumberSpinner from '../../../../../../components/numberSpinner/numberSpinner'

export const PhoneWorkMode: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<phoneWorkModeSettingKey, number | string | boolean> = {
    phoneWorkMode: settings?.phoneWorkMode
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="phoneWorkMode"
        label="phoneWorkMode"
        size="small"
        value={settingsState.iBoxVersion}
        onValueChange={(v) => onChange('phoneWorkMode', v)}
      />
    </SettingsLayout>
  )
}
