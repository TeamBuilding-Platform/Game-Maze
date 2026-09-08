import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

const BASE_SIZE = 248
const FIT_PADDING_BOTTOM = 12
const FIT_PADDING_RIGHT = 24
const MIN_SCALE = 0.55
const BTN_STYLE = "w-[76px] h-[76px] rounded-3xl bg-slate-800/90 active:bg-blue-600 border border-slate-700/80 shadow-lg flex items-center justify-center text-slate-100 active:scale-95 transition-all touch-none disabled:opacity-40 select-none cursor-pointer disabled:cursor-not-allowed"

export function Dpad({ onMove, disabled = false }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function handleKeyDown(event) {
      if (disabled) return
      if (['ArrowUp', 'KeyW'].includes(event.code)) {
        event.preventDefault()
        onMove('n')
      } else if (['ArrowRight', 'KeyD'].includes(event.code)) {
        event.preventDefault()
        onMove('e')
      } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
        event.preventDefault()
        onMove('s')
      } else if (['ArrowLeft', 'KeyA'].includes(event.code)) {
        event.preventDefault()
        onMove('w')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onMove, disabled])

  useEffect(() => {
    function checkFit() {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      const spaceToBottom = viewportHeight - rect.top - FIT_PADDING_BOTTOM
      const spaceToRight = viewportWidth - FIT_PADDING_RIGHT

      let fitScale = 1
      if (spaceToBottom < BASE_SIZE && spaceToBottom > 0) {
        fitScale = Math.min(fitScale, spaceToBottom / BASE_SIZE)
      }
      if (spaceToRight < BASE_SIZE && spaceToRight > 0) {
        fitScale = Math.min(fitScale, spaceToRight / BASE_SIZE)
      }

      const clamped = Math.max(MIN_SCALE, Math.min(1.0, fitScale))
      setScale((prev) => (Math.abs(prev - clamped) > 0.01 ? clamped : prev))
    }

    checkFit()

    window.addEventListener('resize', checkFit)
    window.addEventListener('orientationchange', checkFit)

    let observer
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => checkFit())
      if (containerRef.current.parentElement) {
        observer.observe(containerRef.current.parentElement)
      }
      observer.observe(document.body)
    }

    const raf = requestAnimationFrame(checkFit)

    return () => {
      window.removeEventListener('resize', checkFit)
      window.removeEventListener('orientationchange', checkFit)
      if (observer) observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: `${BASE_SIZE * scale}px`,
        height: `${BASE_SIZE * scale}px`,
      }}
      className="relative mx-auto my-1 flex items-center justify-center select-none shrink-0 transition-all duration-150"
    >
      <div
        style={{
          width: `${BASE_SIZE}px`,
          height: `${BASE_SIZE}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative flex items-center justify-center shrink-0"
      >
        {/* Up / North */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('n')}
          className={`${BTN_STYLE} absolute top-0 left-1/2 -translate-x-1/2`}
          aria-label="Move North"
        >
          <ArrowUp className="w-10 h-10" />
        </button>

        {/* Right / East */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('e')}
          className={`${BTN_STYLE} absolute right-0 top-1/2 -translate-y-1/2`}
          aria-label="Move East"
        >
          <ArrowRight className="w-10 h-10" />
        </button>

        {/* Down / South */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('s')}
          className={`${BTN_STYLE} absolute bottom-0 left-1/2 -translate-x-1/2`}
          aria-label="Move South"
        >
          <ArrowDown className="w-10 h-10" />
        </button>

        {/* Left / West */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('w')}
          className={`${BTN_STYLE} absolute left-0 top-1/2 -translate-y-1/2`}
          aria-label="Move West"
        >
          <ArrowLeft className="w-10 h-10" />
        </button>

        {/* Center Dpad Hub */}
        <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center text-xs font-bold text-slate-500">
          D-PAD
        </div>
      </div>
    </div>
  )
}
