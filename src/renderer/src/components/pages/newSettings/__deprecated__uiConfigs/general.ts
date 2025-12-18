import { settingsPaths } from '../../../../routes/settings/paths'

export const generalSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  kiosk: { label: 'Fullscreen', type: 'toggle' },
  connectionAndNetwork: {
    label: 'Connection & Network',
    type: 'route',
    path: settingsPaths.connectionAndNetwork
  },
  deviceAndSources: {
    label: 'Devices & Sources',
    type: 'route',
    path: settingsPaths.deviceAndSources
  },
  audioDelay: {
    label: 'Car specific Audio Delay (visual only)',
    type: 'route',
    path: settingsPaths.audioDelay
  },
  dongleParams: {
    label: 'Advanced Dongle Parameters',
    type: 'route',
    path: settingsPaths.dongleParams
  },
  keybindings: {
    label: 'Keybindings',
    type: 'route',
    path: settingsPaths.keybindings
  },
  about: {
    label: 'About',
    type: 'route',
    path: settingsPaths.about
  }
}
