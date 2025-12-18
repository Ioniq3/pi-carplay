import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../../../components'
import { GeneralSettingKey } from '../../index'
import { dongleParamsSettingsUIConfig } from '../../../../uiConfigs/dongleParams'
import { DongleParamSettingKey } from './types'

export const DongleParams: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<DongleParamSettingKey, number | string | boolean> = {
    iBoxVersion: settings?.iBoxVersion,
    phoneWorkMode: settings?.phoneWorkMode,
    packetMax: settings?.packetMax
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      {(Object.keys(dongleParamsSettingsUIConfig) as GeneralSettingKey[]).map((item, index) => {
        const onClick = () => handleFieldChange(item, !settingsState[item])

        return (
          <SettingsItemRow
            key={index}
            config={dongleParamsSettingsUIConfig}
            item={item}
            state={settingsState}
            onClick={onClick}
            onChange={(e) => handleFieldChange(item, e.target.checked)}
          />
        )
      })}
    </SettingsLayout>
  )
}
