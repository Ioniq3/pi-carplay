import { About, General, KeyBindings, Video } from '../../components/pages/newSettings/pages'
import { RouteProps } from '../types'
import { settingsPaths } from './paths'
import { ConnectionAndNetwork } from '../../components/pages/newSettings/pages/connectionAndNetwork'
import { CarName } from '../../components/pages/newSettings/pages/carName'
import { WifiType } from '../../components/pages/newSettings/pages/wifiType'
import { WifiChannel } from '../../components/pages/newSettings/pages/wifiChannel'
import { DeviceAndSources } from '../../components/pages/newSettings/pages/deviceAndSources'
import { Camera } from '../../components/pages/newSettings/pages/camera'
import { MicType } from '../../components/pages/newSettings/pages/micType'
import { AudioDelay } from '../../components/pages/newSettings/pages/audioDelay'
import { DongleParams } from '../../components/pages/newSettings/pages/dongleParams'
import { IBoxVersion } from '../../components/pages/newSettings/pages/iBoxVersion'
import { PhoneWorkMode } from '../../components/pages/newSettings/pages/phoneWorkMode'
import { PacketMax } from '../../components/pages/newSettings/pages/packetMax'
import { AndroidAuto } from '../../components/pages/newSettings/pages/androidAuto'
import { Dpi } from '../../components/pages/newSettings/pages/dpi'
import { Format } from '../../components/pages/newSettings/pages/format'
import { ScreenResolution } from '../../components/pages/newSettings/pages/screenResolution'
import { Fps } from '../../components/pages/newSettings/pages/fps'
import { Audio } from '../../components/pages/newSettings/pages/audio'

export const settingsSubRoutes: RouteProps[] = [
  {
    path: settingsPaths.general,
    component: General,
    title: 'General',
    level: 1
  },
  {
    path: settingsPaths.video,
    component: Video,
    title: 'Video',
    level: 1
  },
  {
    path: settingsPaths.audio,
    component: Audio,
    title: 'Audio',
    level: 1
  },
  // Other first level
  {
    path: settingsPaths.connectionAndNetwork,
    component: ConnectionAndNetwork,
    title: 'Connection and Network',
    level: 2
  },
  {
    path: settingsPaths.deviceAndSources,
    component: DeviceAndSources,
    title: 'Device and Sources',
    level: 2
  },
  {
    path: settingsPaths.dongleParams,
    component: DongleParams,
    title: 'Advanced Dongle params',
    level: 2
  },
  {
    path: settingsPaths.keybindings,
    component: KeyBindings,
    title: 'Keybindings',
    level: 2
  },
  {
    path: settingsPaths.about,
    component: About,
    title: 'About',
    level: 2
  },
  {
    path: settingsPaths.streamResolution,
    component: ScreenResolution,
    title: 'Stream Resolution',
    level: 2
  },
  {
    path: settingsPaths.fps,
    component: Fps,
    title: 'FPS',
    level: 2
  },

  // Other second level
  {
    path: settingsPaths.carname,
    component: CarName,
    title: 'Car Name',
    level: 3
  },
  {
    path: settingsPaths.wifitype,
    component: WifiType,
    title: 'WiFi Type',
    level: 3
  },
  {
    path: settingsPaths.wifiChannel,
    component: WifiChannel,
    title: 'WiFi Channel',
    level: 3
  },
  {
    path: settingsPaths.camera,
    component: Camera,
    title: 'Camera',
    level: 3
  },
  {
    path: settingsPaths.micType,
    component: MicType,
    title: 'Mic Type',
    level: 3
  },
  {
    path: settingsPaths.audioDelay,
    component: AudioDelay,
    title: 'AudioDelay',
    level: 3
  },
  {
    path: settingsPaths.iBoxVersion,
    component: IBoxVersion,
    title: 'IBoxVersion',
    level: 3
  },
  {
    path: settingsPaths.phoneWorkMode,
    component: PhoneWorkMode,
    title: 'PhoneWorkMode',
    level: 3
  },
  {
    path: settingsPaths.packetMax,
    component: PacketMax,
    title: 'PacketMax',
    level: 3
  },
  {
    path: settingsPaths.androidAuto,
    component: AndroidAuto,
    title: 'AndroidAuto',
    level: 3
  },
  {
    path: settingsPaths.dpi,
    component: Dpi,
    title: 'DPI',
    level: 3
  },
  {
    path: settingsPaths.format,
    component: Format,
    title: 'Format',
    level: 3
  }
  // // Other third level
]
