import { ExtraConfig } from '@main/Globals'

export type AudioSettingKey = keyof Pick<
  ExtraConfig,
  'audioVolume' | 'navVolume' | 'siriVolume' | 'callVolume' | 'audioTransferMode' | 'mediaSound'
>
