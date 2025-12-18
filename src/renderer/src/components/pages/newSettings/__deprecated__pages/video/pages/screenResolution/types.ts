import { ExtraConfig } from '@main/Globals'

export type ScreenResolutionSettingKey = keyof Pick<ExtraConfig, 'width' | 'height'>
