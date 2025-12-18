import { SettingsNode } from '../components/pages/newSettings/type'
import { RouteObject } from 'react-router-dom'
import { SettingsPage } from '../components/pages/newSettings/SettingsPage'

export const generateRoutes = (node: SettingsNode): RouteObject | null => {
  if (node.type !== 'route') return null

  return {
    path: node.route,
    element: <SettingsPage node={node} />,
    children: node.children?.map(generateRoutes).filter((r): r is RouteObject => !!r)
  }
}
