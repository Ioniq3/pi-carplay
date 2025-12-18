import { ExtraConfig } from '@main/Globals'

export type DeviceAndSourcesSettingKey = keyof Pick<ExtraConfig, 'camera' | 'micType'>
