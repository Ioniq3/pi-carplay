import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../../../../../hooks/useSmartSettings'
import { DpiSettingKey } from './types'
import NumberSpinner from '../../../../../../../../components/numberSpinner/numberSpinner'

export const Dpi: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<DpiSettingKey, number | string | boolean> = {
    dpi: settings?.dpi
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="dpi"
        label="dpi"
        size="small"
        value={settingsState.iBoxVersion}
        onValueChange={(v) => onChange('dpi', v)}
      />
    </SettingsLayout>
  )
}
