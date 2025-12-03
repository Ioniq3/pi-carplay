import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../hooks/useSmartSettings'
import { FormatSettingKey } from './types'
import NumberSpinner from '../../components/numberSpinner/numberSpinner'

export const Format: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<FormatSettingKey, number | string | boolean> = {
    format: settings?.format
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="format"
        label="format"
        size="small"
        value={settingsState.iBoxVersion}
        onValueChange={(v) => onChange('format', v)}
      />
    </SettingsLayout>
  )
}
