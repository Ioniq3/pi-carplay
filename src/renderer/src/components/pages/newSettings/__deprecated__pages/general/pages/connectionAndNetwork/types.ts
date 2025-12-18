import { ExtraConfig } from '@main/Globals'

export type ConnectionAndNetworkSettingKey = keyof Pick<
  ExtraConfig,
  'carName' | 'autoConn' | 'wifiType' | 'wifiChannel'
>
