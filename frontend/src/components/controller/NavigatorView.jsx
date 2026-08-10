import { GridCanvas } from '../maze/GridCanvas'
import { Dpad } from './Dpad'
import { Compass, Map } from 'lucide-react'

export function NavigatorView({ roleData, summary, status, onSendInput }) {
  const maze = roleData?.maze
  const hazards = roleData?.hazards || []
  const ghosts = roleData?.ghosts || []
  const keys = roleData?.keys || []
  const goal = roleData?.goal || null
  const assignedRoles = roleData?.assignedRoles || ['navigator']

  const roleTitle = assignedRoles.map((r) => r.toUpperCase()).join(' + ')

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-2 sm:p-4 text-slate-100 h-[100dvh] sm:h-auto overflow-hidden">
      {/* HUD Header */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-400" />
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Your Role</span>
            <span className="text-sm font-bold text-teal-300">{roleTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-teal-950/60 border border-teal-800/50 px-2.5 py-1 rounded-lg">
          <Map className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs font-bold text-teal-200">Macro View</span>
        </div>
      </div>

      {/* Navigator Map (Static Maze Cells + Mover Pos + Reached Breadcrumb Path + Hazards/Ghosts/Keys if merged) */}
      <div className="flex flex-col items-center flex-1 min-h-0 justify-center my-1 sm:my-2">
        <GridCanvas keysCollected={summary?.keysCollected}
          width={maze?.width || 15}
          height={maze?.height || 15}
          cells={maze?.cells}
          playerPos={maze?.playerPos || roleData?.playerPos}
          reached={maze?.reached || roleData?.reached}
          hazards={hazards}
          ghosts={ghosts}
          keys={keys}
          goal={goal}
          pendingReset={roleData?.pendingReset}
          fogRadius={null}
          mode="navigator"
          accentColor="#3b82f6"
        />
      </div>

      {/* D-Pad Navigation Controls */}
      {(onSendInput || assignedRoles.includes('mover')) && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1.5 sm:p-3 shadow-xl flex flex-col items-center shrink-0 my-1">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Navigation Controls</span>
          <Dpad
            disabled={status !== 'playing'}
            onMove={(dir) => onSendInput?.({ action: 'move', dir })}
          />
        </div>
      )}
    </div>
  )
}
