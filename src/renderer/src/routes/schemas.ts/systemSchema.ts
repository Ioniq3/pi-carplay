import { Info } from '../../components/pages/info'
import { About } from '../../components/pages/settings/pages/about'
import { Restart } from '../../components/pages/settings/pages/system/Restart'
import { PowerOff } from '../../components/pages/settings/pages/system/PowerOff'
import type { SettingsNode } from '../types'
import type { ExtraConfig } from '@main/Globals'

export const systemSchema: SettingsNode<ExtraConfig> = {
  route: 'system',
  label: 'System',
  type: 'route',
  path: '',
  children: [
    {
      type: 'route',
      label: 'Info',
      route: 'info',
      path: '',
      children: [{ type: 'custom', label: 'Info', path: 'carName', component: Info }]
    },
    {
      type: 'route',
      label: 'About',
      route: 'about',
      path: '',
      children: [{ type: 'custom', label: 'About', path: 'carName', component: About }]
    },
    {
      type: 'route',
      label: 'Restart System',
      route: 'restart',
      path: '',
      children: [{ type: 'custom', label: 'Restart System', path: 'carName', component: Restart }]
    },
    {
      type: 'route',
      label: 'Power Off',
      route: 'poweroff',
      path: '',
      children: [{ type: 'custom', label: 'Power Off', path: 'carName', component: PowerOff }]
    }
  ]
}
