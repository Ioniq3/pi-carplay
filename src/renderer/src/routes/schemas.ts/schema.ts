import { generateRoutes } from '../../utils/generateRoutes'
import { generalSchema } from './generalSchema'
import { audioSchema } from './audioSchema'
import { videoSchema } from './videoSchema'
import { appearanceSchema } from './appearanceSchema'
import { SettingsNode } from '../types'

export const settingsSchema: SettingsNode = {
  type: 'route',
  route: 'new-settings',
  label: 'Settings',
  children: [generalSchema, audioSchema, videoSchema, appearanceSchema]
}

export const settingsRoutes = generateRoutes(settingsSchema)
