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
    path: settingsPaths.music
  },
  navigation: {
    label: 'Navigation',
    type: 'route',
    path: settingsPaths.navi
  },
  siri: {
    label: 'Siri',
    type: 'route',
    path: settingsPaths.siri
  },
  phonecall: {
    label: 'Phonecall',
    type: 'route',
    path: settingsPaths.phone
  },
  audioBuffering: {
    label: 'Audio Buffering',
    type: 'route',
    path: settingsPaths.audioBuffer
  },
  samplingFrequency: {
    label: 'Sampling Frequency',
    type: 'route',
    path: settingsPaths.freq
  },
  callQuality: {
    label: 'Call Quality',
    type: 'route',
    path: settingsPaths.call
  },
  audio: {
    label: 'Audio',
    type: 'route',
    path: settingsPaths.audio2
  }
}
