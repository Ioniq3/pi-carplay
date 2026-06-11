import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import { IconButton, MenuItem, Select, Slider, Switch, TextField } from '@mui/material'
import { useLiviStore } from '@renderer/store/store'
import { themeColors } from '@renderer/themeColors'
import type { Config } from '@shared/types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsNode } from '../../../../routes'
import type { SelectOption } from '../../../../routes/types'
import { extractBtMac, withGhostOption } from './ghostOption'
import NumberSpinner from './numberSpinner/numberSpinner'
import { getCachedOptions, resolveOptions } from './selectOptionsCache'

type Props<T> = {
  node: SettingsNode<Config>
  value: T
  onChange: (v: T) => void
  savedLabel?: string
  onLabelChange?: (label: string) => void
}

const clampInt = (n: number, min: number, max: number, step = 1) => {
  const snapped = step > 1 ? min + Math.round((n - min) / step) * step : Math.round(n)
  return Math.min(max, Math.max(min, snapped))
}

const defaultColorForPath = (path?: string): string => {
  switch (path) {
    case 'primaryColorDark':
      return themeColors.primaryColorDark
    case 'primaryColorLight':
      return themeColors.primaryColorLight
    case 'highlightColorDark':
      return themeColors.highlightColorDark
    case 'highlightColorLight':
      return themeColors.highlightColorLight
    case 'backgroundColorDark':
      return themeColors.dark
    case 'backgroundColorLight':
      return themeColors.light
    default:
      return themeColors.highlightColorDark
  }
}

const marks = [
  { value: 0, label: '0%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' }
]

export const SettingsFieldControl = <T,>({
  node,
  value,
  onChange,
  savedLabel,
  onLabelChange
}: Props<T>) => {
  switch (node.type) {
    case 'string':
      return (
        <TextField
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value as T)}
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              borderWidth: '1px'
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'primary.main'
            }
          }}
        />
      )

    case 'number': {
      const min = node.min ?? 0
      const max = node.max ?? Number.MAX_SAFE_INTEGER
      const step = node.step ?? 1

      return (
        <NumberSpinner
          size="medium"
          value={typeof value === 'number' && Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => {
            // ignore "in-progress" values
            if (typeof v !== 'number' || !Number.isFinite(v)) return

            const next = clampInt(v, min, max, step)
            onChange(next as T)
          }}
        />
      )
    }

    case 'checkbox':
      return (
        <Switch
          checked={Boolean(value)}
          disabled={node.disabled === true}
          onChange={(_, v) => onChange(v as T)}
        />
      )

    case 'slider':
      return (
        <Slider
          value={Math.round((Number(value ?? 1.0) || 1.0) * 100)}
          max={100}
          step={5}
          marks={marks}
          valueLabelDisplay="off"
          onChange={(_, v) => onChange(((v as number) / 100) as T)}
          sx={{
            width: 'calc(100% - 48px)',
            mt: 1.5,
            ml: 2,
            mr: 2,
            minWidth: 0,
            '& .MuiSlider-valueLabel': { zIndex: 2 }
          }}
        />
      )

    case 'select':
      return (
        <DynamicSelect
          node={node}
          value={value as unknown as string | number}
          onChange={onChange as (v: unknown) => void}
          savedLabel={savedLabel}
          onLabelChange={onLabelChange}
        />
      )

    case 'color': {
      const hasCustom = value != null && String(value).trim() !== ''
      const color = hasCustom ? String(value) : defaultColorForPath(node.path)

      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TextField
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value as T)}
            variant="outlined"
            sx={{
              width: 72,
              minWidth: 72,

              '& .MuiInputBase-root': {
                boxSizing: 'border-box',
                height: 'auto',
                minHeight: 0,
                padding: '0.35em',
                display: 'flex',
                alignItems: 'center'
              },

              '& input[type="color"]': {
                boxSizing: 'border-box',
                width: '100%',
                height: '1.6em',
                padding: 0,
                border: 0,
                cursor: 'pointer'
              }
            }}
          />

          <IconButton
            size="small"
            disabled={!hasCustom}
            onClick={() => onChange(null as unknown as T)}
          >
            <RestartAltOutlinedIcon fontSize="small" />
          </IconButton>
        </div>
      )
    }

    default:
      return null
  }
}

type DynamicSelectProps = {
  node: Extract<SettingsNode<Config>, { type: 'select' }>
  value: string | number
  onChange: (v: unknown) => void
  savedLabel?: string
  onLabelChange?: (label: string) => void
}

function DynamicSelect({ node, value, onChange, savedLabel, onLabelChange }: DynamicSelectProps) {
  const { t } = useTranslation()
  const audioDevicesRevision = useLiviStore((s) => s.audioDevicesRevision)
  const [options, setOptions] = useState<SelectOption[]>(
    () => getCachedOptions(node) ?? node.options
  )

  useEffect(() => {
    if (!node.loadOptions) return
    let alive = true
    void resolveOptions(node, { force: true }).then((opts) => {
      if (!alive) return
      setOptions(opts)
      // Migrate stored id to live id when MAC matches but profile suffix changed
      const valueMac = extractBtMac(value)
      if (valueMac) {
        const liveMatch = opts.find(
          (o) => !o.offline && extractBtMac(o.value) === valueMac && o.value !== value
        )
        if (liveMatch) onChange(liveMatch.value)
      }
      if (onLabelChange && value !== '' && value !== undefined && value !== null && !savedLabel) {
        const match = opts.find((o) => o.value === value)
        if (match) {
          const live = match.labelKey ? t(match.labelKey, match.label) : match.label
          if (live) onLabelChange(live)
        }
      }
    })
    return () => {
      alive = false
    }
  }, [node, audioDevicesRevision])

  const formatOffline = (name: string): string => t('settings.audioDeviceOffline', { name })
  const renderedOptions = withGhostOption(options, value, savedLabel, formatOffline)
  const inList = renderedOptions.some((o) => o.value === value)

  const handlePick = (next: string | number): void => {
    onChange(next)

    // Offline BT entry → trigger BlueZ Connect
    const pickedOption = renderedOptions.find((o) => o.value === next)
    if (pickedOption?.offline && typeof next === 'string') {
      const mac = extractBtMac(next)
      if (mac) {
        const ipc = window.projection?.ipc
        if (ipc && typeof ipc.connectBluetoothPairedDevice === 'function') {
          void ipc.connectBluetoothPairedDevice(mac).catch(() => {})
        }
      }
    }

    if (!onLabelChange) return
    const pickedLive = options.find((o) => o.value === next)
    const sourceOption = pickedLive ?? pickedOption
    if (!sourceOption) return
    const liveLabel = sourceOption.labelKey
      ? t(sourceOption.labelKey, sourceOption.label)
      : sourceOption.label
    onLabelChange(liveLabel)
  }

  const labelFor = (o: SelectOption): string => {
    const raw = o.labelKey ? t(o.labelKey, o.label) : o.label
    return o.offline ? t('settings.audioDeviceOffline', { name: raw }) : raw
  }

  const selectedValue = inList ? value : ''
  const selectedOption = renderedOptions.find((o) => o.value === selectedValue)

  return (
    <Select
      size="small"
      variant="outlined"
      value={selectedValue}
      displayEmpty
      renderValue={() => (selectedOption ? labelFor(selectedOption) : '')}
      sx={{
        minWidth: 200,
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
          borderWidth: '1px'
        }
      }}
      onChange={(e) => handlePick(e.target.value as string | number)}
    >
      {renderedOptions.map((o) => {
        return (
          <MenuItem key={String(o.value)} value={o.value}>
            {labelFor(o)}
          </MenuItem>
        )
      })}
    </Select>
  )
}
