import { NAV_MSG, NavigationChannel } from '../NavigationChannel'
import { fieldLenDelim, fieldVarint } from '../protoEnc'

describe('NavigationChannel — start/stop', () => {
  test('START_INDICATION emits nav-start', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-start', cb)
    ch.handleMessage(NAV_MSG.START_INDICATION, Buffer.alloc(0))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('STOP_INDICATION emits nav-stop', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-stop', cb)
    ch.handleMessage(NAV_MSG.STOP_INDICATION, Buffer.alloc(0))
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

describe('NavigationChannel — STATUS', () => {
  test.each([
    [1, 'active'],
    [2, 'inactive'],
    [3, 'rerouting'],
    [0, 'unavailable'],
    [99, 'unavailable']
  ])('status field=%s → %s', (raw, expected) => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-status', cb)
    ch.handleMessage(NAV_MSG.STATUS, fieldVarint(1, raw))
    expect(cb).toHaveBeenCalledWith({ state: expected })
  })

  test('STATUS without field 1 falls back to unavailable', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-status', cb)
    ch.handleMessage(NAV_MSG.STATUS, Buffer.alloc(0))
    expect(cb).toHaveBeenCalledWith({ state: 'unavailable' })
  })
})

describe('NavigationChannel — TURN_EVENT', () => {
  test.each([
    [1, 'depart'],
    [2, 'name-change'],
    [3, 'slight-turn'],
    [4, 'turn'],
    [5, 'sharp-turn'],
    [6, 'u-turn'],
    [7, 'on-ramp'],
    [8, 'off-ramp'],
    [9, 'fork'],
    [10, 'merge'],
    [11, 'roundabout-enter'],
    [12, 'roundabout-exit'],
    [13, 'roundabout-enter-and-exit'],
    [14, 'straight'],
    [16, 'ferry-boat'],
    [17, 'ferry-train'],
    [19, 'destination'],
    [99, 'unknown']
  ])('NextTurnEnum %s → %s', (raw, expected) => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-turn', cb)
    ch.handleMessage(NAV_MSG.TURN_EVENT, fieldVarint(3, raw))
    expect(cb.mock.calls[0][0].event).toBe(expected)
  })

  test.each([
    [1, 'left'],
    [2, 'right'],
    [3, 'unspecified'],
    [99, 'unspecified']
  ])('TurnSide %s → %s', (raw, expected) => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-turn', cb)
    ch.handleMessage(NAV_MSG.TURN_EVENT, fieldVarint(2, raw))
    expect(cb.mock.calls[0][0].turnSide).toBe(expected)
  })

  test('decodes road, image, turn number and angle', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-turn', cb)

    const img = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const payload = Buffer.concat([
      fieldLenDelim(1, Buffer.from('Main St')),
      fieldVarint(2, 2), // right
      fieldVarint(3, 4), // turn
      fieldLenDelim(4, img),
      fieldVarint(5, 3), // turnNumber
      fieldVarint(6, 90) // turnAngle
    ])
    ch.handleMessage(NAV_MSG.TURN_EVENT, payload)

    const t = cb.mock.calls[0][0]
    expect(t).toMatchObject({
      road: 'Main St',
      turnSide: 'right',
      event: 'turn',
      turnNumber: 3,
      turnAngle: 90
    })
    expect((t.image as Buffer).equals(img)).toBe(true)
  })
})

describe('NavigationChannel — DISTANCE_EVENT', () => {
  test('decodes distance + time + optional display fields', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-distance', cb)

    const payload = Buffer.concat([
      fieldVarint(1, 500),
      fieldVarint(2, 30),
      fieldVarint(3, 1500),
      fieldVarint(4, 2)
    ])
    ch.handleMessage(NAV_MSG.DISTANCE_EVENT, payload)

    expect(cb).toHaveBeenCalledWith({
      distanceMeters: 500,
      timeToTurnSeconds: 30,
      displayDistanceE3: 1500,
      displayUnit: 2
    })
  })

  test('display fields stay undefined when omitted', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-distance', cb)
    ch.handleMessage(NAV_MSG.DISTANCE_EVENT, Buffer.concat([fieldVarint(1, 0), fieldVarint(2, 0)]))
    expect(cb.mock.calls[0][0]).toEqual({
      distanceMeters: 0,
      timeToTurnSeconds: 0,
      displayDistanceE3: undefined,
      displayUnit: undefined
    })
  })
})

describe('NavigationChannel — STATE (modern)', () => {
  test('decodes the first step maneuver/road/cue + destination address', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-state', cb)

    // NavigationStep { maneuver=1{type=1=8}, road=2{name=1}, cue=4{alternate_text=1} }
    const step = Buffer.concat([
      fieldLenDelim(1, fieldVarint(1, 8)), // TURN_NORMAL_RIGHT
      fieldLenDelim(2, fieldLenDelim(1, Buffer.from('Jarrestraße'))),
      fieldLenDelim(4, fieldLenDelim(1, Buffer.from('Richtung Maacksgasse')))
    ])
    const dest = fieldLenDelim(1, Buffer.from('Harburger Ring 24, Harburg'))
    ch.handleMessage(NAV_MSG.STATE, Buffer.concat([fieldLenDelim(1, step), fieldLenDelim(2, dest)]))

    expect(cb).toHaveBeenCalledWith({
      maneuverType: 8,
      roadName: 'Jarrestraße',
      cue: 'Richtung Maacksgasse',
      destinationAddress: 'Harburger Ring 24, Harburg'
    })
  })
})

describe('NavigationChannel — CURRENT_POSITION (modern)', () => {
  test('decodes step distance + destination distance + ETA + current road', () => {
    const ch = new NavigationChannel()
    const cb = vi.fn()
    ch.on('nav-position', cb)

    // NavigationStepDistance { distance=1{meters=345, display="350", units=1}, time=2=102 }
    const stepDistance = Buffer.concat([
      fieldLenDelim(
        1,
        Buffer.concat([
          fieldVarint(1, 345),
          fieldLenDelim(2, Buffer.from('350')),
          fieldVarint(3, 1)
        ])
      ),
      fieldVarint(2, 102)
    ])
    // NavigationDestinationDistance { distance=1{meters=18185,display="18",units=2}, eta=2, tta=3 }
    const destDistance = Buffer.concat([
      fieldLenDelim(
        1,
        Buffer.concat([
          fieldVarint(1, 18185),
          fieldLenDelim(2, Buffer.from('18')),
          fieldVarint(3, 2)
        ])
      ),
      fieldLenDelim(2, Buffer.from('21:58')),
      fieldVarint(3, 1599)
    ])
    ch.handleMessage(
      NAV_MSG.CURRENT_POSITION,
      Buffer.concat([
        fieldLenDelim(1, stepDistance),
        fieldLenDelim(2, destDistance),
        fieldLenDelim(3, fieldLenDelim(1, Buffer.from('Current Rd')))
      ])
    )

    expect(cb).toHaveBeenCalledWith({
      stepDistanceMeters: 345,
      stepDistanceDisplay: '350',
      timeToStepSeconds: 102,
      destinationMeters: 18185,
      destinationDisplay: '18',
      destinationUnits: 2,
      etaText: '21:58',
      timeToArrivalSeconds: 1599,
      currentRoadName: 'Current Rd'
    })
  })
})

describe('NavigationChannel — passthrough', () => {
  test('unknown msgId is logged but does not throw', () => {
    const ch = new NavigationChannel()
    expect(() => ch.handleMessage(0xdead, Buffer.from([1]))).not.toThrow()
  })
})
