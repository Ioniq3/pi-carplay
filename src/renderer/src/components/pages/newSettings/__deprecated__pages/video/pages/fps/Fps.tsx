import { SettingsLayout } from '@renderer/components/layouts/SettingsLayout'
import { useCarplayStore } from '@store/store'
import { useSmartSettings } from '../../../../hooks/useSmartSettings'
import { FpsSettingKey } from './types'
import NumberSpinner from '../../../../components/numberSpinner/numberSpinner'

export const Fps: React.FC = () => {
  // FIXME types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const settings = useCarplayStore((s) => s.settings)

  const initialState: Record<FpsSettingKey, number | string | boolean> = {
    fps: settings?.fps
  }

  const { state: settingsState, handleFieldChange, save } = useSmartSettings(initialState, settings)

  return (
    <SettingsLayout onSave={save}>
      <div>
        <NumberSpinner
          style={{ marginTop: 16 }}
          id="fps"
          label="FPS"
          size="small"
          value={settingsState.fps}
          onValueChange={(v) => onChange('width', v)}
        />

        <span>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
          been the industry's standard dummy text ever since the 1500s,
        </span>
      </div>
    </SettingsLayout>
  )
}
