import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearReconnectState,
  loadReconnectState,
  saveReconnectState,
  storageKey,
} from '../src/reconnectStorage.js'

function makeSessionStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('reconnect state is isolated by session and can be cleared', () => {
  globalThis.sessionStorage = makeSessionStorage()
  const state = {
    playerId: 'player-1',
    reconnectToken: 'token-1',
    name: 'Alex',
    isTrainer: false,
  }

  saveReconnectState('TEAM2026', state)

  assert.equal(storageKey('TEAM2026'), 'teambuilding.reconnect.TEAM2026')
  assert.deepEqual(loadReconnectState('TEAM2026'), state)
  assert.equal(loadReconnectState('OTHER'), null)

  clearReconnectState('TEAM2026')
  assert.equal(loadReconnectState('TEAM2026'), null)
})

test('storage failures are treated as unavailable reconnect state', () => {
  globalThis.sessionStorage = {
    getItem() { throw new Error('unavailable') },
    setItem() { throw new Error('unavailable') },
    removeItem() { throw new Error('unavailable') },
  }

  assert.doesNotThrow(() => saveReconnectState('TEAM2026', {}))
  assert.equal(loadReconnectState('TEAM2026'), null)
  assert.doesNotThrow(() => clearReconnectState('TEAM2026'))
})
