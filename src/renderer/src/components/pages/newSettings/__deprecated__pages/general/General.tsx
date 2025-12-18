import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { GeneralSettingKey } from './types'
import { generalSettingsUIConfig } from '../../uiConfigs/general'
import { useSmartSettings } from '../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../components'

export const General = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<GeneralSettingKey, number | string | boolean> = {
    kiosk: settings?.kiosk
  }

  const {
    state: settingsState,
    handleFieldChange,
    save
  } = useSmartSettings(initialState, settings, {
    overrides: {
      audioTransferMode: {
        transform: (v: boolean) => !v
      }
    }
  })

  return (
    <SettingsLayout onSave={save}>
      {(Object.keys(generalSettingsUIConfig) as GeneralSettingKey[]).map((item, index) => {
        const onClick = () => handleFieldChange(item, !settingsState[item])

        return (
          <SettingsItemRow
            key={index}
            config={generalSettingsUIConfig}
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
