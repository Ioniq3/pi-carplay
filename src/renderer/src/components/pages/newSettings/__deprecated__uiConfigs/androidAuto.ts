import { settingsPaths } from '../../../../routes/settings/paths'

export const androidAutoSettingsUIConfig: Record<
  string,
  {
    label: string
    type: string
    path?: string
  }
> = {
  dpi: { label: 'DPI', type: 'route', path: settingsPaths.dpi },
  format: { label: 'Format', type: 'route', path: settingsPaths.format }
}
