import { settingsPaths } from '../../../../routes/settings/paths'

export const devicesAndSourcesSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  camera: { label: 'Camera', type: 'route', path: settingsPaths.camera },
  micType: { label: 'Mic type', type: 'route', path: settingsPaths.micType }
}
