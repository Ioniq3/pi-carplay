export enum RoutePath {
  Home = 'home',
  Settings = 'settings',
  NewSettings = 'new-settings',
  Camera = 'camera',
  Media = 'media',
  Info = 'info'
}

export type SettingsPageComponentProps = {
  value: any
  onChange: (v: any) => void
}

export type SettingsPageComponent = React.ComponentType<SettingsPageComponentProps>

export type BaseNode = {
  label: string
}

export type RouteNode = BaseNode & {
  type: 'route'
  route: string
  children: SettingsNode[]
  page?: SettingsPageComponent
}

export type ToggleNode = BaseNode & {
  type: 'toggle'
  path: string
}

export type CheckboxNode = BaseNode & {
  type: 'checkbox'
  path: string
}

export type SelectNode = BaseNode & {
  type: 'select'
  path: string
  options: Array<{ label: string; value: string }>
}

export type NumberNode = BaseNode & {
  type: 'number'
  path: string
  min?: number
  max?: number
  step?: number
}

export type StringNode = BaseNode & {
  type: 'string'
  path: string
}

export type ColorNode = BaseNode & {
  type: 'color'
  path: string
}

export interface SettingsCustomNode extends BaseNode {
  type: 'custom'
  component: React.ComponentType
}

export type SettingsNode =
  | RouteNode
  | ToggleNode
  | CheckboxNode
  | SelectNode
  | NumberNode
  | StringNode
  | ColorNode
  | SettingsCustomNode
