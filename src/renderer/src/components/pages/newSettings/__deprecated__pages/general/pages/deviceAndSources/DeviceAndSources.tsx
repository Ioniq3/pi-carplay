import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../../../components'
import { GeneralSettingKey } from '../../index'
import { devicesAndSourcesSettingsUIConfig } from '../../../../uiConfigs/devicesAndSources'
import { DeviceAndSourcesSettingKey } from './types'

export const DeviceAndSources: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<DeviceAndSourcesSettingKey, number | string | boolean> = {
    camera: settings?.camera,
    micType: settings?.micType
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      {(Object.keys(devicesAndSourcesSettingsUIConfig) as GeneralSettingKey[]).map(
        (item, index) => {
          const onClick = () => handleFieldChange(item, !settingsState[item])

          return (
            <SettingsItemRow
              key={index}
              config={devicesAndSourcesSettingsUIConfig}
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
