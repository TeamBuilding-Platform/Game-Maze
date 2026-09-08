import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPredictedMove, reconcilePredictedPosition } from '../src/components/controller/movementPrediction.js'

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
