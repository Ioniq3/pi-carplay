import { SettingsNode } from '../types'
import { ExtraConfig } from '../../../../main/Globals'
import { IconUploaderPage } from '../../components/pages/settings/pages/system/IconUploaderPage'

export const appearanceSchema: SettingsNode<ExtraConfig> = {
  type: 'route',
  route: 'appearance',
  label: 'Appearance',
  path: '',
  children: [
    {
      type: 'checkbox',
      label: 'Darkmode',
      path: 'nightMode'
    },
    {
      type: 'color',
      label: 'Primary Color Dark',
      path: 'primaryColorDark'
    },
    {
      type: 'color',
      label: 'Primary Color Light',
      path: 'primaryColorLight'
    },
    {
      type: 'color',
      label: 'Highlight Editable Field Dark',
      path: 'highlightEditableFieldDark'
    },
    {
      type: 'color',
      label: 'Highlight Editable Field Light',
      path: 'highlightEditableFieldLight'
    },
    {
      type: 'route',
      label: 'UI Icon',
      route: 'ui-icon',
      path: '',
      children: [
        { type: 'custom', label: 'UI Icon', path: 'dongleIcon180', component: IconUploaderPage }
      ]
    }
  ]
}
