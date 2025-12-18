import { useMemo } from 'react'
import { useSmartSettings } from './useSmartSettings'
import { getValueByPath } from '../utils'
import { SettingsNode } from '../../../../routes'

type FlatSettings = Record<string, any>
type Overrides<T> = Record<
  keyof T,
  {
    transform?: (value: any, prev?: any) => any
    validate?: (value: any) => boolean
  }
>

const walkSchema = (
  node: SettingsNode,
  settings: any,
  initial: FlatSettings,
  overrides: Overrides<FlatSettings>
) => {
  if (node.type !== 'custom') {
    initial[node.path] = getValueByPath(settings, node.path)

    if ('transform' in node && node.transform) {
      overrides[node.path] = { transform: node.transform }
    }
  }

  if (node.type === 'route' && node.children) {
    node.children.forEach((child) => walkSchema(child, settings, initial, overrides))
  }
}

// export const walkSchema = (
//   node: SettingsNode,
//   settings: any,
//   initialState: FlatSettings,
//   overrides: Overrides<FlatSettings>
// ) => {
//   // leaf-узел
//   if ('path' in node && node.path) {
//     const value = getValueByPath(settings, node.path)
//
//     initialState[node.path] = value ?? null
//
//     if ('transform' in node && node.transform) {
//       overrides[node.path] = {
//         transform: node.transform
//       }
//     }
//   }
//
//   if ('children' in node && Array.isArray(node.children)) {
//     node.children.forEach((child) => walkSchema(child, settings, initialState, overrides))
//   }
// }

export const useSmartSettingsFromSchema = (rootSchema: SettingsNode, settings: any) => {
  const { initialState, overrides } = useMemo(() => {
    const initialState: FlatSettings = {}
    const overrides: Overrides<FlatSettings> = {}

    walkSchema(rootSchema, settings ?? {}, initialState, overrides)
    console.log('initialState', initialState)

    return { initialState, overrides }
  }, [rootSchema, settings])

  return useSmartSettings(initialState, settings ?? {}, { overrides })
}
