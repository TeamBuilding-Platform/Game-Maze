import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  ClientRole,
  ErrorCode,
  GameMode,
  GameStatus,
  MazeRole,
  MessageType,
  PROTOCOL_VERSION,
} from '../src/protocol.js'

const require = createRequire(import.meta.url)
const backendProtocol = require('../../src/protocol.js')

test('frontend wire protocol stays aligned with the backend', () => {
  assert.equal(PROTOCOL_VERSION, backendProtocol.PROTOCOL_VERSION)
  assert.deepEqual(MessageType, backendProtocol.MessageType)
  assert.deepEqual(GameStatus, backendProtocol.GameStatus)
  assert.deepEqual(GameMode, backendProtocol.GameMode)
  assert.deepEqual(ClientRole, backendProtocol.ClientRole)
  assert.deepEqual(ErrorCode, backendProtocol.ErrorCode)
})

test('frontend maze roles contain every backend role', () => {
  for (const [name, value] of Object.entries(backendProtocol.MazeRole)) {
    assert.equal(MazeRole[name], value)
  }
  assert.equal(MazeRole.TRAINER, 'trainer')
})
