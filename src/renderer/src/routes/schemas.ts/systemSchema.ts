import { Restart } from '../../components/pages/newSettings/pages/system/Restart'
import { PowerOff } from '../../components/pages/newSettings/pages/system/PowerOff'
import { Info } from '../../components/pages/info'
import { About } from '../../components/pages/newSettings/pages/about'
import { SettingsNode } from '../types'
import { ExtraConfig } from '@main/Globals'

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
      children: [
        {
          path: '',
          type: 'custom',
          label: 'Info',
          component: Info
        }
      ]
    },
    {
      type: 'route',
      label: 'About',
      route: 'about',
      path: '',
      children: [
        {
          path: 'about',
          type: 'custom',
          label: 'About',
          component: About
        }
      ]
    },
    {
      type: 'route',
      label: 'Restart System',
      route: 'restart',
      path: '',
      children: [
        {
          path: '',
          type: 'custom',
          label: 'Restart System',
          component: Restart
        }
      ]
    },
    {
      type: 'route',
      label: 'Power Off',
      route: 'poweroff',
      path: '',
      children: [
        {
          path: '',
          type: 'custom',
          label: 'Power Off',
          component: PowerOff
        }
      ]
    }
  ]
}
