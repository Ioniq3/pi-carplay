import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../../../hooks/useSmartSettings'
import { packetMaxSettingKey } from './types'
import { TextField } from '@mui/material'
import { CAR_NAME_MAX } from '../../../../../../../settings/constants'
import NumberSpinner from '../../../../../../components/numberSpinner/numberSpinner'

export const PacketMax: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<packetMaxSettingKey, number | string | boolean> = {
    packetMax: settings?.packetMax
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="packetMax"
        label="packetMax"
        size="small"
        value={settingsState.iBoxVersion}
        onValueChange={(v) => onChange('packetMax', v)}
      />
    </SettingsLayout>
  )
}
