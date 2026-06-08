import assert from 'node:assert/strict'

import {
  buildWebSocketUrl,
  getEffectiveWebSocketProtocol,
  getProtocolFromAddress,
  isValidHostAddress,
  normalizeHost
} from '../src/utils/urlUtils.js'

const normalizeCases = [
  ['192.168.31.146', '192.168.31.146'],
  ['ws://192.168.31.146/ws', '192.168.31.146'],
  ['http://fmo.example.net:40088/ws', 'fmo.example.net:40088'],
  ['wss://fmo.example.net/events', 'fmo.example.net'],
  ['https://fmo.example.net:443/events?token=abc', 'fmo.example.net:443'],
  ['fmo.example.net：40088', 'fmo.example.net:40088'],
  ['my_fmo_gateway.local', 'my_fmo_gateway.local']
]

for (const [input, expected] of normalizeCases) {
  assert.equal(normalizeHost(input), expected, `normalizeHost(${input})`)
}

const validHosts = [
  'fmo.local',
  '192.168.31.146',
  'fmo.example.net',
  'fmo.example.net:40088',
  'http://fmo.example.net:40088/ws',
  'ws://fmo.example.net:40088/events',
  'fmo-gateway_1.local'
]

for (const input of validHosts) {
  assert.equal(isValidHostAddress(input), true, `expected valid host: ${input}`)
}

const invalidHosts = ['', 'fmo host.local', 'fmo@example.net', 'fmo.example.net:70000']

for (const input of invalidHosts) {
  assert.equal(isValidHostAddress(input), false, `expected invalid host: ${input}`)
}

const protocolCases = [
  ['http://fmo.example.net/ws', 'wss', 'ws'],
  ['ws://fmo.example.net/ws', 'wss', 'ws'],
  ['https://fmo.example.net/ws', 'ws', 'wss'],
  ['wss://fmo.example.net/ws', 'ws', 'wss'],
  ['fmo.example.net', 'wss', 'wss'],
  ['fmo.example.net', 'ws', 'ws']
]

for (const [input, fallback, expected] of protocolCases) {
  assert.equal(
    getProtocolFromAddress(input, fallback),
    expected,
    `getProtocolFromAddress(${input})`
  )
}

assert.equal(getEffectiveWebSocketProtocol('fmo.example.net', 'https'), 'wss')
assert.equal(getEffectiveWebSocketProtocol('fmo.example.net', 'http'), 'ws')
assert.equal(
  buildWebSocketUrl('http://fmo.example.net:40088/ws', 'ws'),
  'ws://fmo.example.net:40088/ws'
)
assert.equal(
  buildWebSocketUrl('https://fmo.example.net/events', 'wss', '/events'),
  'wss://fmo.example.net/events'
)

console.log('urlUtils tests passed')
