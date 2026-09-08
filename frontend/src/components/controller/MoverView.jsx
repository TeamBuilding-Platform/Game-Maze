import { useEffect, useRef, useState } from 'react'
import { GridCanvas } from '../maze/GridCanvas'
import { Dpad } from './Dpad'
import { Shield, Key, Heart } from 'lucide-react'
import {
  applyPredictedMove,
  getNextInputSequence,
  reconcilePredictedPosition,
  shouldBlockMoverInput,
} from './movementPrediction'

export function MoverView({
  roleData,
  summary,
  onSendInput,
  status,
  inputCooldownMs = 250,
  lastProcessedInputSeq = null,
}) {
  const lives = summary?.livesRemaining ?? summary?.lives ?? 3
  const keysCollected = summary?.keysCollected ?? 0
  const assignedRoles = roleData?.assignedRoles || ['mover']
  const mazeWidth = roleData?.maze?.width || 15
  const mazeHeight = roleData?.maze?.height || 15
  const authoritativePlayerPos = roleData?.maze?.playerPos || roleData?.playerPos
  const isMovementBlocked = shouldBlockMoverInput(
    status,
    roleData?.pendingReset,
    roleData?.maze?.reached
  )
  const inputSequenceRef = useRef(0)
  const cooldownTimerRef = useRef(null)
  const pendingMovesRef = useRef([])
  const [predictedPlayerPos, setPredictedPlayerPos] = useState(authoritativePlayerPos)
  const [isInputCoolingDown, setIsInputCoolingDown] = useState(false)

  const roleTitle = assignedRoles.map((r) => r.toUpperCase()).join(' + ')

  useEffect(() => {
    if (isMovementBlocked) {
      pendingMovesRef.current = []
      setPredictedPlayerPos(authoritativePlayerPos)
      return
    }

    const acknowledgedSequence = Number.isSafeInteger(lastProcessedInputSeq)
      ? lastProcessedInputSeq
      : -1
    const reconciliation = reconcilePredictedPosition(
      authoritativePlayerPos,
      pendingMovesRef.current,
      acknowledgedSequence,
      mazeWidth,
      mazeHeight
    )
    pendingMovesRef.current = reconciliation.remainingMoves
    setPredictedPlayerPos(reconciliation.predictedPosition)
  }, [authoritativePlayerPos, isMovementBlocked, lastProcessedInputSeq, mazeWidth, mazeHeight])

  useEffect(() => () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
  }, [])

  function handleMove(direction) {
    if (isInputCoolingDown || isMovementBlocked) return

    setIsInputCoolingDown(true)
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    cooldownTimerRef.current = setTimeout(() => {
      cooldownTimerRef.current = null
      setIsInputCoolingDown(false)
    }, inputCooldownMs)

    const sequence = getNextInputSequence(inputSequenceRef.current, lastProcessedInputSeq)
    inputSequenceRef.current = sequence
    pendingMovesRef.current.push({ sequence, direction })
    setPredictedPlayerPos((position) => applyPredictedMove(
      position || authoritativePlayerPos,
      direction,
      mazeWidth,
      mazeHeight
    ))
    onSendInput({ action: 'move', dir: direction, clientInputSeq: sequence })
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-2 sm:p-4 text-slate-100 h-[calc(100dvh-42px)] sm:h-auto overflow-hidden">
      {/* HUD Header */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Your Role</span>
            <span className="text-sm font-bold text-blue-300">{roleTitle}</span>
          </div>
        </div>

        {/* Lives are hidden while infinite-life playtesting is enabled. */}
        <div className="flex items-center gap-4">
          {!summary?.infiniteLives && (
            <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/50 px-2.5 py-1 rounded-lg">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span className="text-sm font-bold text-rose-200" aria-label={`${lives} lives`}>
                {lives}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-lg">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-200">{keysCollected} / 3</span>
          </div>
        </div>
      </div>

      {/* Mover Maze View */}
      <div className="flex flex-col items-center flex-1 min-h-0 justify-center my-2 sm:my-4">
        <GridCanvas keysCollected={summary?.keysCollected}
          width={mazeWidth}
          height={mazeHeight}
          cells={roleData?.maze?.cells}
          playerPos={predictedPlayerPos || authoritativePlayerPos}
          keys={roleData?.keys}
          goal={roleData?.goal}
          hazards={roleData?.hazards}
          ghosts={roleData?.ghosts}
          lifePickups={roleData?.maze?.lifePickups}
          reached={roleData?.maze?.reached}
          pendingReset={roleData?.pendingReset}
          fogRadius={null}
          mode="mover"
          accentColor="#3b82f6"
        />
      </div>

      {/* D-Pad Navigation Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2 sm:p-4 shadow-xl flex flex-col items-center shrink-0">
        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Navigation Controls</span>
        <Dpad
          disabled={isMovementBlocked || isInputCoolingDown}
          onMove={handleMove}
        />
      </div>
    </div>
  )
}
