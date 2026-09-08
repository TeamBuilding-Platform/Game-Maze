const DELTAS = {
  n: [-1, 0],
  e: [0, 1],
  s: [1, 0],
  w: [0, -1],
}

export function applyPredictedMove(position, direction, width, height) {
  const delta = DELTAS[direction]
  if (!position || !delta) return position

  return {
    row: Math.max(0, Math.min(height - 1, position.row + delta[0])),
    col: Math.max(0, Math.min(width - 1, position.col + delta[1])),
  }
}

export function getNextInputSequence(currentSequence, acknowledgedSequence) {
  const current = Number.isSafeInteger(currentSequence) && currentSequence >= 0
    ? currentSequence
    : 0
  const acknowledged = Number.isSafeInteger(acknowledgedSequence) && acknowledgedSequence >= 0
    ? acknowledgedSequence
    : 0

  return Math.max(current, acknowledged) + 1
}

export function reconcilePredictedPosition(authoritativePosition, pendingMoves, acknowledgedSequence, width, height) {
  const remainingMoves = pendingMoves.filter(({ sequence }) => sequence > acknowledgedSequence)
  const predictedPosition = remainingMoves.reduce(
    (position, { direction }) => applyPredictedMove(position, direction, width, height),
    authoritativePosition
  )

  return { remainingMoves, predictedPosition }
}
