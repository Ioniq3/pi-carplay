import { ExtraConfig } from '@main/Globals'

export type VideoSettingKey = keyof Pick<ExtraConfig, 'width' | 'height'>
