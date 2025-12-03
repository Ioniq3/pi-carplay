import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../hooks/useSmartSettings'
import { WiFiChannelSettingKey } from './types'
import NumberSpinner from '../../components/numberSpinner/numberSpinner'

export const WifiChannel: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<WiFiChannelSettingKey, number | string | boolean> = {
    wifiChannel: settings?.wifiChannel
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <NumberSpinner
        style={{ marginTop: 16 }}
        id="wifiChannel"
        label="WiFi Channel"
        size="small"
        value={settingsState.wifiChannel}
        onValueChange={(v) => onChange('wifiChannel', v)}
      />
      <span>Helper text</span>
    </SettingsLayout>
  )
}
