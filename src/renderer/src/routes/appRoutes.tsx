import { RoutePath } from './types'
import { Home, Media, Camera, Info, Settings } from '../components/pages'
import { settingsRoutes } from './schemas.ts/schema'
import { Layout } from '../components/layouts/Layout'
import { SettingsPage as NewSettingsPage } from '../components/pages/newSettings/SettingsPage'

export const appRoutes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: `/${RoutePath.Camera}`,
        element: <Camera />
      },
      {
        path: `/${RoutePath.Media}`,
        element: <Media />
      },
      {
        path: `/${RoutePath.Home}`,
        element: <Home />
      },
      {
        path: `/${RoutePath.OldSettings}/*`,
        element: <Settings />
      },
      {
        path: `/${RoutePath.Settings}/*`,
        element: <NewSettingsPage />,
        children: settingsRoutes?.children ?? []
      }
    ]
  }
]
