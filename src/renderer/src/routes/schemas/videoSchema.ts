import type { Config } from '@shared/types'
import {
  AREA_STEP,
  MAX_DPI,
  MAX_FPS,
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_DPI,
  MIN_FPS,
  MIN_HEIGHT,
  MIN_WIDTH,
  SAFE_AREA_MAX_HEIGHT,
  SAFE_AREA_MAX_WIDTH,
  SAFE_AREA_MIN
} from '../../components/pages/settings/constants'
import { SettingsNode } from '../types'

export const videoSchema: SettingsNode<Config> = {
  type: 'route',
  route: 'video',
  label: 'Video',
  labelKey: 'settings.video',
  path: '',
  children: [
    {
      type: 'route',
      label: 'Main Video',
      labelKey: 'settings.mainVideo',
      route: 'mainVideo',
      path: '',
      children: [
        {
          type: 'number',
          label: 'Width',
          labelKey: 'settings.projectionWidth',
          path: 'projectionWidth',
          min: MIN_WIDTH,
          max: MAX_WIDTH,
          step: 1,
          displayValue: true,
          page: {
            title: 'Main Video Width',
            labelTitle: 'settings.projectionWidth',
            description: 'Main stream width in px',
            labelDescription: 'settings.projectionWidthDescription'
          }
        },
        {
          type: 'number',
          label: 'Height',
          labelKey: 'settings.projectionHeight',
          path: 'projectionHeight',
          min: MIN_HEIGHT,
          max: MAX_HEIGHT,
          step: 1,
          displayValue: true,
          page: {
            title: 'Main Video Height',
            labelTitle: 'settings.projectionHeight',
            description: 'Main stream height in px',
            labelDescription: 'settings.projectionHeightDescription'
          }
        },
        {
          type: 'number',
          label: 'FPS',
          labelKey: 'settings.projectionFps',
          path: 'projectionFps',
          min: MIN_FPS,
          max: MAX_FPS,
          step: 1,
          displayValue: true,
          page: {
            title: 'Main Video FPS',
            labelTitle: 'settings.projectionFps',
            description: 'Main stream FPS',
            labelDescription: 'settings.projectionFpsDescription'
          }
        },
        {
          type: 'number',
          label: 'DPI',
          labelKey: 'settings.projectionDpi',
          path: 'projectionDpi',
          min: MIN_DPI,
          max: MAX_DPI,
          step: 1,
          displayValue: true,
          page: {
            title: 'Main Video DPI',
            labelTitle: 'settings.projectionDpi',
            description: 'Main stream DPI (0 = auto)',
            labelDescription: 'settings.projectionDpiDescription'
          }
        },
        {
          type: 'route',
          label: 'View Area',
          labelKey: 'settings.viewArea',
          route: 'viewArea',
          path: '',
          children: [
            {
              type: 'number',
              label: 'Top',
              labelKey: 'settings.top',
              path: 'projectionViewAreaTop',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen View Area Top',
                labelTitle: 'settings.top',
                description: 'Top inset in px',
                labelDescription: 'settings.viewAreaTopDescription'
              }
            },
            {
              type: 'number',
              label: 'Bottom',
              labelKey: 'settings.bottom',
              path: 'projectionViewAreaBottom',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen View Area Bottom',
                labelTitle: 'settings.bottom',
                description: 'Bottom inset in px',
                labelDescription: 'settings.viewAreaBottomDescription'
              }
            },
            {
              type: 'number',
              label: 'Left',
              labelKey: 'settings.left',
              path: 'projectionViewAreaLeft',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen View Area Left',
                labelTitle: 'settings.left',
                description: 'Left inset in px',
                labelDescription: 'settings.viewAreaLeftDescription'
              }
            },
            {
              type: 'number',
              label: 'Right',
              labelKey: 'settings.right',
              path: 'projectionViewAreaRight',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen View Area Right',
                labelTitle: 'settings.right',
                description: 'Right inset in px',
                labelDescription: 'settings.viewAreaRightDescription'
              }
            }
          ]
        },
        {
          type: 'route',
          label: 'Safe Area',
          labelKey: 'settings.safeArea',
          route: 'safeArea',
          path: '',
          children: [
            {
              type: 'number',
              label: 'Top',
              labelKey: 'settings.top',
              path: 'projectionSafeAreaTop',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen Safe Area Top',
                labelTitle: 'settings.top',
                description: 'Top inset in px',
                labelDescription: 'settings.safeAreaTopDescription'
              }
            },
            {
              type: 'number',
              label: 'Bottom',
              labelKey: 'settings.bottom',
              path: 'projectionSafeAreaBottom',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen Safe Area Bottom',
                labelTitle: 'settings.bottom',
                description: 'Bottom inset in px',
                labelDescription: 'settings.safeAreaBottomDescription'
              }
            },
            {
              type: 'number',
              label: 'Left',
              labelKey: 'settings.left',
              path: 'projectionSafeAreaLeft',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen Safe Area Left',
                labelTitle: 'settings.left',
                description: 'Left inset in px',
                labelDescription: 'settings.safeAreaLeftDescription'
              }
            },
            {
              type: 'number',
              label: 'Right',
              labelKey: 'settings.right',
              path: 'projectionSafeAreaRight',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Main Screen Safe Area Right',
                labelTitle: 'settings.right',
                description: 'Right inset in px',
                labelDescription: 'settings.safeAreaRightDescription'
              }
            },
            {
              type: 'checkbox',
              label: 'Draw Outside',
              labelKey: 'settings.drawOutside',
              path: 'projectionSafeAreaDrawOutside'
            }
          ]
        }
      ]
    },
    {
      type: 'route',
      label: 'Cluster Video',
      labelKey: 'settings.clusterVideo',
      route: 'clusterVideo',
      path: '',
      children: [
        {
          type: 'number',
          label: 'Width',
          labelKey: 'settings.clusterWidth',
          path: 'clusterWidth',
          min: MIN_WIDTH,
          max: MAX_WIDTH,
          step: 1,
          displayValue: true,
          page: {
            title: 'Cluster Video Width',
            labelTitle: 'settings.clusterWidth',
            description: 'Cluster screen width in px',
            labelDescription: 'settings.clusterScreenWidthDescription'
          }
        },
        {
          type: 'number',
          label: 'Height',
          labelKey: 'settings.clusterHeight',
          path: 'clusterHeight',
          min: MIN_HEIGHT,
          max: MAX_HEIGHT,
          step: 1,
          displayValue: true,
          page: {
            title: 'Cluster Video Height',
            labelTitle: 'settings.clusterHeight',
            description: 'Cluster screen height in px',
            labelDescription: 'settings.clusterScreenHeightDescription'
          }
        },
        {
          type: 'number',
          label: 'FPS',
          labelKey: 'settings.clusterFps',
          path: 'clusterFps',
          min: MIN_FPS,
          max: MAX_FPS,
          step: 1,
          displayValue: true,
          page: {
            title: 'Cluster Video FPS',
            labelTitle: 'settings.clusterFps',
            description: 'Cluster screen FPS',
            labelDescription: 'settings.clusterScreenFpsDescription'
          }
        },
        {
          type: 'number',
          label: 'DPI',
          labelKey: 'settings.clusterDpi',
          path: 'clusterDpi',
          min: MIN_DPI,
          max: MAX_DPI,
          step: 1,
          displayValue: true,
          page: {
            title: 'Cluster Video DPI',
            labelTitle: 'settings.clusterDpi',
            description: 'Cluster screen DPI (0 = auto)',
            labelDescription: 'settings.clusterScreenDpiDescription'
          }
        },
        {
          type: 'route',
          label: 'View Area',
          labelKey: 'settings.viewArea',
          route: 'viewArea',
          path: '',
          children: [
            {
              type: 'number',
              label: 'Top',
              labelKey: 'settings.top',
              path: 'clusterViewAreaTop',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen View Area Top',
                labelTitle: 'settings.top',
                description: 'Top inset in px',
                labelDescription: 'settings.clusterViewAreaTopDescription'
              }
            },
            {
              type: 'number',
              label: 'Bottom',
              labelKey: 'settings.bottom',
              path: 'clusterViewAreaBottom',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen View Area Bottom',
                labelTitle: 'settings.bottom',
                description: 'Bottom inset in px',
                labelDescription: 'settings.clusterViewAreaBottomDescription'
              }
            },
            {
              type: 'number',
              label: 'Left',
              labelKey: 'settings.left',
              path: 'clusterViewAreaLeft',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen View Area Left',
                labelTitle: 'settings.left',
                description: 'Left inset in px',
                labelDescription: 'settings.clusterViewAreaLeftDescription'
              }
            },
            {
              type: 'number',
              label: 'Right',
              labelKey: 'settings.right',
              path: 'clusterViewAreaRight',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen View Area Right',
                labelTitle: 'settings.right',
                description: 'Right inset in px',
                labelDescription: 'settings.clusterViewAreaRightDescription'
              }
            }
          ]
        },
        {
          type: 'route',
          label: 'Safe Area',
          labelKey: 'settings.safeArea',
          route: 'safeArea',
          path: '',
          children: [
            {
              type: 'number',
              label: 'Top',
              labelKey: 'settings.top',
              path: 'clusterSafeAreaTop',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen Safe Area Top',
                labelTitle: 'settings.top',
                description: 'Top inset in px',
                labelDescription: 'settings.clusterSafeAreaTopDescription'
              }
            },
            {
              type: 'number',
              label: 'Bottom',
              labelKey: 'settings.bottom',
              path: 'clusterSafeAreaBottom',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_HEIGHT,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen Safe Area Bottom',
                labelTitle: 'settings.bottom',
                description: 'Bottom inset in px',
                labelDescription: 'settings.clusterSafeAreaBottomDescription'
              }
            },
            {
              type: 'number',
              label: 'Left',
              labelKey: 'settings.left',
              path: 'clusterSafeAreaLeft',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen Safe Area Left',
                labelTitle: 'settings.left',
                description: 'Left inset in px',
                labelDescription: 'settings.clusterSafeAreaLeftDescription'
              }
            },
            {
              type: 'number',
              label: 'Right',
              labelKey: 'settings.right',
              path: 'clusterSafeAreaRight',
              min: SAFE_AREA_MIN,
              max: SAFE_AREA_MAX_WIDTH,
              step: AREA_STEP,
              displayValue: true,
              page: {
                title: 'Cluster Screen Safe Area Right',
                labelTitle: 'settings.right',
                description: 'Right inset in px',
                labelDescription: 'settings.clusterSafeAreaRightDescription'
              }
            }
          ]
        }
      ]
    }
  ]
}
