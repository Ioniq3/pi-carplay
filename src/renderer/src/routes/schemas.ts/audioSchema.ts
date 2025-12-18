import { SettingsNode } from '../types'

export const audioSchema: SettingsNode = {
  type: 'route',
  route: 'audio',
  label: 'Audio',
  children: [
    { type: 'route', route: 'music', label: 'Music', children: [] },
    { type: 'route', route: 'navigation', label: 'Navigation', children: [] },
    { type: 'route', route: 'siri', label: 'Siri', children: [] },
    { type: 'route', route: 'phonecall', label: 'Phonecall', children: [] },
    { type: 'route', route: 'audiobuffering', label: 'Audio Buffering', children: [] },
    { type: 'route', route: 'samplingfrequency', label: 'Sampling Frequency', children: [] },
    { type: 'route', route: 'callquality', label: 'Call Quality', children: [] },
    { type: 'route', route: 'audio', label: 'Audio', children: [] }
  ]
}
