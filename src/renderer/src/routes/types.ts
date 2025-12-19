import { SettingsCustomPageProps } from '../components/pages/newSettings/pages/streamResolution/types'

export enum RoutePath {
  Home = 'home',
  OldSettings = 'old-settings',
  Settings = 'settings',
  Camera = 'camera',
  Media = 'media',
  Info = 'info'
}

export type ValueTransform<StoreValue, ViewValue = StoreValue> = {
  toView?: (value: StoreValue) => ViewValue
  fromView?: (value: ViewValue) => StoreValue
  format?: (value: ViewValue) => string
}

export type BaseFieldNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = {
  label: string
  path: K
  displayValue?: boolean
  displayValueUnit?: string
  valueTransform?: ValueTransform<TStore[K], ViewValue>
  page?: {
    title?: string
    description?: string
  }
}

export type CheckboxNode<TStore, K extends keyof TStore> = BaseFieldNode<TStore, K> & {
  type: 'checkbox'
}

export type NumberNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'number'
  min?: number
  max?: number
  step?: number
}

export type StringNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'string'
}

export type ColorNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'color'
}

export type SelectNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'select'
  options: Array<{ label: string; value: string | number }>
}

export type ToggleNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'toggle'
  path: string
}

// TODO
export type SliderNode<TStore, K extends keyof TStore, ViewValue = TStore[K]> = BaseFieldNode<
  TStore,
  K,
  ViewValue
> & {
  type: 'slider'
  path: string
}

export type SettingsCustomNode<TStore> = {
  type: 'custom'
  label: string
  path?: keyof TStore
  displayValue?: boolean
  component: React.ComponentType<SettingsCustomPageProps<TStore>>
}

export type RouteNode<TStore> = BaseFieldNode<TStore, any, any> & {
  type: 'route'
  label: string
  route: string
  children: SettingsNode<TStore>[]
}

export type SettingsNode<TStore> =
  | RouteNode<TStore>
  | ToggleNode<TStore, keyof TStore>
  | CheckboxNode<TStore, keyof TStore>
  | SelectNode<TStore, keyof TStore, any>
  | NumberNode<TStore, keyof TStore, any>
  | StringNode<TStore, keyof TStore>
  | ColorNode<TStore, keyof TStore>
  | SliderNode<TStore, keyof TStore, any>
  | SettingsCustomNode<TStore>
