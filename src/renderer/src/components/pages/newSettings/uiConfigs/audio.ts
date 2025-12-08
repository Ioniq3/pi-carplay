import { settingsPaths } from '../../../../routes/settings/paths'

export const audioSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  music: {
    label: 'Music',
    type: 'route',
    path: settingsPaths.streamResolution
  },
  navigation: {
    label: 'Navigation',
    type: 'route',
    path: settingsPaths.fps
  },
  siri: {
    label: 'Siri',
    type: 'route',
    path: settingsPaths.fps
  },
  phonecall: {
    label: 'Phonecall',
    type: 'route',
    path: settingsPaths.fps
  },
  audioBuffering: {
    label: 'Audio Buffering',
    type: 'route',
    path: settingsPaths.fps
  },
  samplingFrequency: {
    label: 'Sampling Frequency',
    type: 'route',
    path: settingsPaths.fps
  },
  callQuality: {
    label: 'Call Quality',
    type: 'route',
    path: settingsPaths.fps
  },
  audio: {
    label: 'Audio',
    type: 'route',
    path: settingsPaths.fps
  }
}
