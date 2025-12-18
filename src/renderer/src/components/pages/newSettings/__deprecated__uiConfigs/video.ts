import { settingsPaths } from '../../../../routes/settings/paths'

export const videoSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  streamResolution: {
    label: 'Stream Resolution',
    type: 'route',
    path: settingsPaths.streamResolution
  },
  fps: {
    label: 'FPS',
    type: 'route',
    path: settingsPaths.fps
  }
}
