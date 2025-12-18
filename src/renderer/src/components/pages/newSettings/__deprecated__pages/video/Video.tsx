import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { VideoSettingKey } from './types'
import { videoSettingsUIConfig } from '../../uiConfigs/video'
import { useSmartSettings } from '../../hooks/useSmartSettings'
import { SettingsItemRow } from '../../components'

export const Video = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<VideoSettingKey, number | string | boolean> = {
    width: settings?.width,
    height: settings?.height
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
      {(Object.keys(videoSettingsUIConfig) as VideoSettingKey[]).map((item, index) => {
        const onClick = () => handleFieldChange(item, !settingsState[item])

        return (
          <SettingsItemRow
            key={index}
            config={videoSettingsUIConfig}
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
