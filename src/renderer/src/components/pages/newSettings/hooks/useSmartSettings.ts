import { useEffect, useMemo, useState } from 'react'
import { requiresRestartParams } from '../../settings/constants'
import { getValueByPath, setValueByPath } from '../utils'

type OverrideConfig<T> = {
  transform?: (value: any, prev: T) => T
  validate?: (value: any) => boolean
}

type Overrides<T> = Partial<Record<keyof T, OverrideConfig<T>>>

export function useSmartSettings<T extends Record<string, any>>(
  initial: T,
  settings: T,
  options?: { overrides?: Overrides<T> }
) {
  const overrides = options?.overrides ?? {}
  const [state, setState] = useState<T>(() => ({ ...initial }))
  const [isRequireReset, setIsRequireReset] = useState(false)

  useEffect(() => {
    setState({ ...initial })
    setIsRequireReset(false)
  }, [initial])

  const isDirty = useMemo(
    () =>
      Object.keys(state).some((path) => {
        return getValueByPath(settings, path) !== state[path]
      }),
    [state, settings]
  )

  const evaluateNeedRestart = (path: string, nextValue: any) => {
    const key = path.split('.').at(-1) as any
    return requiresRestartParams.includes(key)
  }

  const handleFieldChange = (path: string, rawValue: any) => {
    const prevValue = state[path]
    const override = overrides[path]

    const nextValue = override?.transform?.(rawValue, prevValue) ?? rawValue

    if (override?.validate && !override.validate(nextValue)) return

    if (evaluateNeedRestart(path, nextValue)) {
      setIsRequireReset(true)
    }

    setState((prev) => ({
      ...prev,
      [path]: nextValue
    }))
  }

  const resetState = () => setState(initial)

  const save = () => {
    const newSettings = structuredClone(settings ?? {})

    Object.entries(state).forEach(([path, value]) => {
      setValueByPath(newSettings, path, value)
    })

    console.log('saved settings:', newSettings)

    // saveSettings(newSettings)
    return isRequireReset
  }

  return {
    state,
    isDirty,
    handleFieldChange,
    resetState,
    save
  }
}
