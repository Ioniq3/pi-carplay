import { SettingsNode } from '../../../routes'

export const getValueByPath = (obj: any, path: string) => {
  if (!obj || !path) return undefined

  return path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined
    return acc[key]
  }, obj)
}

export const setValueByPath = (obj: any, path: string, value: any) => {
  const keys = path.split('.')
  let cur = obj

  keys.slice(0, -1).forEach((k) => {
    if (typeof cur[k] !== 'object' || cur[k] === null) {
      cur[k] = {}
    }
    cur = cur[k]
  })

  cur[keys[keys.length - 1]] = value
}

export const getNodeByPath = (root: SettingsNode, path: string[]): SettingsNode | null => {
  let current: any = root

  for (const segment of path) {
    const next = current.children?.find((c: any) => c.route === segment)
    if (!next) return null
    current = next
  }

  return current
}
