import { ExtraConfig } from '@main/Globals'

export type MusicSettingKey = keyof Pick<ExtraConfig, 'audioVolume'>
