import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { AudioSettingKey } from './types'
import { videoSettingsUIConfig } from '../../uiConfigs/video'
import { useSmartSettings } from '../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../components'
import { audioSettingsUIConfig } from '../../uiConfigs/audio'

export const Audio = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<AudioSettingKey, number | string | boolean> = {
    audioVolume: settings?.audioVolume,
    navVolume: settings?.navVolume,
    siriVolume: settings?.siriVolume,
    callVolume: settings?.callVolume,
    audioTransferMode: settings?.audioTransferMode,
    mediaSound: settings?.mediaSound
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
      {(Object.keys(videoSettingsUIConfig) as AudioSettingKey[]).map((item, index) => {
        const onClick = () => handleFieldChange(item, !settingsState[item])

        return (
          <SettingsItemRow
            key={index}
            config={audioSettingsUIConfig}
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
