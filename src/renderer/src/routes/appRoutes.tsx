import { RoutePath } from './types'
import { Home, Media, Camera, Info } from '../components/pages'
import { settingsRoutes } from './schemas.ts/schema'
import { Layout } from '../components/layouts/Layout'
import { SettingsPage } from '../components/pages/newSettings/SettingsPage'

export const appRoutes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: `/${RoutePath.Info}`,
        element: <Info />
      },
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
        path: `/${RoutePath.NewSettings}/*`,
        element: <SettingsPage />,
        children: settingsRoutes?.children ?? []
      }
    ]
  }
]
