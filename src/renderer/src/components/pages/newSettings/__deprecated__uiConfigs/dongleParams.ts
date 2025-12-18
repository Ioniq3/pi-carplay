import { settingsPaths } from '../../../../routes/settings/paths'

export const dongleParamsSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  iBoxVersion: { label: 'iBoxVersion', type: 'route', path: settingsPaths.iBoxVersion },
  phoneWorkMode: { label: 'Phone Work Mode', type: 'route', path: settingsPaths.phoneWorkMode },
  packetMax: { label: 'Packet Max', type: 'route', path: settingsPaths.packetMax },
  androidAuto: { label: 'Android Auto', type: 'route', path: settingsPaths.androidAuto }
}
