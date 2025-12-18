import { Slider, Switch } from '@mui/material'
import { SettingsItemRow } from './components'
import { SettingsNode } from '../../../routes'

type Props<T> = {
  node: SettingsNode
  state: T
  onChange: <K extends keyof T>(key: K, value: T[K]) => void
}

export const SettingsNodeRenderer = <T extends Record<string, any>>({
  node,
  state,
  onChange
}: Props<T>) => {
  switch (node.type) {
    case 'checkbox':
      return (
        <SettingsItemRow label={node.label}>
          <Switch
            checked={!!state[node.path]}
            onChange={(e) => onChange(node.path as keyof T, e.target.checked as T[keyof T])}
          />
        </SettingsItemRow>
      )

    case 'number':
    case 'string':
      return (
        <SettingsItemRow label={node.label}>
          <input
            value={state[node.path]}
            onChange={(e) => onChange(node.path as keyof T, e.target.value as T[keyof T])}
          />
        </SettingsItemRow>
      )

    case 'select':
      return (
        <SettingsItemRow label={node.label}>
          <Slider
            value={state[node.path]}
            min={node.min}
            max={node.max}
            onChange={(_, v) => onChange(node.path as keyof T, v as T[keyof T])}
          />
        </SettingsItemRow>
      )

    case 'color':
      return (
        <SettingsItemRow label={node.label}>
          <div
            style={{ width: '100px', height: '30px', backgroundColor: state[node.path] || 'red' }}
          />
        </SettingsItemRow>
      )

    case 'custom': {
      const Component = node.component
      return <Component />
    }

    default:
      return null
  }
}
