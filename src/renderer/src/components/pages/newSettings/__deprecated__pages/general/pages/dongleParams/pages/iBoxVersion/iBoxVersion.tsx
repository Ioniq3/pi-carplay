import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../../../hooks/useSmartSettings'
import { iBoxVersionSettingKey } from './types'
import NumberSpinner from '../../../../../../components/numberSpinner/numberSpinner'

export const IBoxVersion: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<iBoxVersionSettingKey, number | string | boolean> = {
    iBoxVersion: settings?.iBoxVersion
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="iBoxVersion"
        label="iBoxVersion"
        size="small"
        value={settingsState.iBoxVersion}
        onValueChange={(v) => onChange('iBoxVersion', v)}
      />
    </SettingsLayout>
  )
}
