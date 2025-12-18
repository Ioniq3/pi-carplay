import { About } from '../../components/pages/newSettings/pages/about'
import { SettingsNode } from '../types'

export const generalSchema: SettingsNode = {
  route: 'general',
  label: 'General',
  type: 'route',
  children: [
    {
      type: 'checkbox',
      label: 'Fullscreen',
      path: 'kiosk'
    },
    {
      type: 'route',
      route: 'connections',
      label: 'Connections',
      children: [
        {
          type: 'route',
          route: 'car-name',
          label: 'Car name',
          children: [
            {
              type: 'page',
              label: 'Car name',
              path: 'carName'
            }
          ]
        },
        {
          type: 'checkbox',
          label: 'Auto Connect',
          path: 'autoConn'
        },
        {
          type: 'route',
          route: 'wifi',
          label: 'Wi-Fi',
          children: [
            {
              type: 'number',
              path: 'wifiType',
              label: 'Wi-Fi number'
            },
            {
              type: 'number',
              path: 'wifiChannel',
              label: 'Wi-Fi channel'
            }
          ]
        }
      ]
    },
    {
      type: 'route',
      label: 'Devices & Sources',
      route: 'deviceandsources',
      children: [
        {
          type: 'route',
          route: 'camera',
          label: 'Camera',
          children: []
        },
        {
          type: 'route',
          route: 'micType',
          label: 'Mic type',
          children: []
        }
      ]
    },
    {
      type: 'route',
      label: 'Advanced Dongle Parameters',
      route: 'main.dongle',
      children: [
        {
          type: 'route',
          route: 'iBoxVersion',
          label: 'iBox Version',
          children: []
        },
        {
          type: 'route',
          route: 'phoneWorkMode',
          label: 'Phone Work Mode',
          children: []
        },
        {
          type: 'route',
          route: 'packetMax',
          label: 'Packet Max',
          children: []
        },
        {
          type: 'route',
          route: 'androidauto',
          label: 'Android Auto',
          children: [
            {
              type: 'route',
              route: 'dpi',
              label: 'DPI',
              children: []
            },
            {
              type: 'route',
              route: 'format',
              label: 'Format',
              children: []
            }
          ]
        }
      ]
    },
    {
      type: 'route',
      label: 'Car specific Audio Delay',
      route: 'audiodelay',
      children: []
    },
    {
      type: 'route',
      label: 'Keybindings',
      route: 'keybindings',
      children: []
    },
    {
      type: 'route',
      label: 'About',
      route: 'about',
      children: [
        {
          type: 'custom',
          label: 'About',
          component: About
        }
      ]
    }
  ]
}
