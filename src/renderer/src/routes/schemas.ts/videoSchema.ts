import { SettingsNode } from '../types'

export const videoSchema: SettingsNode = {
  type: 'route',
  route: 'video',
  label: 'Video',
  children: [
    {
      type: 'route',
      route: 'resolution',
      label: 'Resolution',
      children: [
        {
          type: 'number',
          label: 'Resolution',
          path: 'video.resolution'
        }
      ]
    },
    {
      type: 'route',
      route: 'fps',
      label: 'FPS',
      children: [
        {
          type: 'number',
          label: 'FPS',
          path: 'video.fps'
        }
      ]
    }
  ]
}
