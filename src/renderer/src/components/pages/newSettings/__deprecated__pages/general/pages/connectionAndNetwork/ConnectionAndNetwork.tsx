import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../../../components'
import { GeneralSettingKey } from '../../index'
import { connectionAndNetworkSettingsUIConfig } from '../../../../uiConfigs/connectionAndNetwork'
import { ConnectionAndNetworkSettingKey } from './types'

export const ConnectionAndNetwork: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<ConnectionAndNetworkSettingKey, number | string | boolean> = {
    carName: settings?.carName,
    autoConn: settings?.autoConn,
    wifiType: settings?.wifiType,
    wifiChannel: settings?.wifiChannel
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      {(Object.keys(connectionAndNetworkSettingsUIConfig) as GeneralSettingKey[]).map(
        (item, index) => {
          const onClick = () => handleFieldChange(item, !settingsState[item])

          return (
            <SettingsItemRow
              key={index}
              config={connectionAndNetworkSettingsUIConfig}
              item={item}
              state={settingsState}
              onClick={onClick}
              onChange={(e) => handleFieldChange(item, e.target.checked)}
            />
          )
        }
      )}
    </SettingsLayout>
  )
}
