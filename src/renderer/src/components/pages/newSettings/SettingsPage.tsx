import { useCarplayStore } from '@store/store'
import { SettingsLayout } from '../../layouts'
import { SettingsNodeRenderer } from './SettingsNodeRenderer'
import { useSmartSettingsFromSchema } from './hooks/useSmartSettingsFromSchema'
import { settingsSchema } from '../../../routes/schemas.ts/schema'
import { useNavigate, useParams } from 'react-router-dom'
import { StackItem } from './components'
import { getNodeByPath, getValueByPath } from './utils'
import { Typography } from '@mui/material'

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { '*': splat } = useParams()

  const path = splat ? splat.split('/') : []

  const node = getNodeByPath(settingsSchema, path)
  const settings = useCarplayStore((s) => s.settings)

  const { state, isDirty, handleFieldChange, save } = useSmartSettingsFromSchema(
    settingsSchema,
    settings
  )

  console.log('state', state)

  if (!node) return null

  if (node.page) {
    return (
      <SettingsLayout onSave={save} isDirty={false}>
        <node.page
          value={getValueByPath(state, node.path)}
          onChange={(v) => handleFieldChange(node.path, v)}
        />
      </SettingsLayout>
    )
  }

  const children = node.children ?? []

  return (
    <SettingsLayout onSave={save} isDirty={isDirty}>
      {children.map((child) => {
        if (child.type === 'route') {
          return (
            <StackItem key={child.route} withForwardIcon onClick={() => navigate(child.route)}>
              <Typography>{child.label}</Typography>
            </StackItem>
          )
        }

        return (
          <SettingsNodeRenderer
            key={child.path}
            node={child}
            state={state}
            onChange={handleFieldChange}
          />
        )
      })}
    </SettingsLayout>
  )
}
