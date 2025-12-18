import { ExtraConfig } from '@main/Globals'

export type DongleParamSettingKey = keyof Pick<
  ExtraConfig,
  'iBoxVersion' | 'phoneWorkMode' | 'packetMax'
>
//  | 'dpi' | 'format'
