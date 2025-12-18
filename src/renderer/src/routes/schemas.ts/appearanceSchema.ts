import { SettingsNode } from '../types'

export const appearanceSchema: SettingsNode = {
  type: 'route',
  route: 'appearance',
  label: 'Appearance',
  children: [
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
    }
  ]
}
