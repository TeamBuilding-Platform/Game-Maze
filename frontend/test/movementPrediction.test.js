import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPredictedMove,
  getNextInputSequence,
  reconcilePredictedPosition,
  shouldBlockMoverInput,
} from '../src/components/controller/movementPrediction.js'

test('predicted movement responds immediately and remains inside maze bounds', () => {
  assert.deepEqual(applyPredictedMove({ row: 2, col: 2 }, 'e', 8, 8), { row: 2, col: 3 })
  assert.deepEqual(applyPredictedMove({ row: 0, col: 0 }, 'n', 8, 8), { row: 0, col: 0 })
})

test('reconciliation removes acknowledged inputs and reapplies newer pending moves', () => {
  const result = reconcilePredictedPosition(
    { row: 1, col: 1 },
    [
      { sequence: 1, direction: 'e' },
      { sequence: 2, direction: 's' },
      { sequence: 3, direction: 'e' },
    ],
    2,
    8,
    8
  )

  assert.deepEqual(result.remainingMoves, [{ sequence: 3, direction: 'e' }])
  assert.deepEqual(result.predictedPosition, { row: 1, col: 2 })
})

test('input sequence continues beyond a retained acknowledgement after remount', () => {
  const firstSequenceAfterRemount = getNextInputSequence(0, 20)
  const followingSequence = getNextInputSequence(firstSequenceAfterRemount, 20)

  assert.equal(firstSequenceAfterRemount, 21)
  assert.equal(followingSequence, 22)
})

test('mover input is blocked while victory or reset feedback is active', () => {
  assert.equal(shouldBlockMoverInput('playing', null, false), false)
  assert.equal(shouldBlockMoverInput('playing', { cause: 'victory' }, true), true)
  assert.equal(shouldBlockMoverInput('playing', { cause: 'skull' }, false), true)
  assert.equal(shouldBlockMoverInput('follow_up', null, false), true)
})
