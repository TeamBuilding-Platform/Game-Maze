import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

export function Dpad({ onMove, disabled = false }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)
  const unscaledDpadSizePx = 208
  const viewportPaddingBottomPx = 12
  const viewportPaddingRightPx = 24
  const minimumScale = 0.45

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

      const spaceToBottom = viewportHeight - rect.top - viewportPaddingBottomPx
      const spaceToRight = viewportWidth - viewportPaddingRightPx

      let fitScale = 1
      if (spaceToBottom < unscaledDpadSizePx && spaceToBottom > 0) {
        fitScale = Math.min(fitScale, spaceToBottom / unscaledDpadSizePx)
      }
      if (spaceToRight < unscaledDpadSizePx && spaceToRight > 0) {
        fitScale = Math.min(fitScale, spaceToRight / unscaledDpadSizePx)
      }

      const clamped = Math.max(minimumScale, Math.min(1.0, fitScale))
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

  const btnStyle = "w-16 h-16 rounded-2xl bg-slate-800/90 active:bg-blue-600 border border-slate-700/80 shadow-lg flex items-center justify-center text-slate-100 active:scale-95 transition-all touch-none disabled:opacity-40 select-none cursor-pointer disabled:cursor-not-allowed"

  return (
    <div
      ref={containerRef}
      style={{
        width: `${baseSize * scale}px`,
        height: `${baseSize * scale}px`,
      }}
      className="relative mx-auto my-1 flex items-center justify-center select-none shrink-0 transition-all duration-150"
    >
      <div
        style={{
          width: `${baseSize}px`,
          height: `${baseSize}px`,
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
          className={`${btnStyle} absolute top-0 left-1/2 -translate-x-1/2`}
          aria-label="Move North"
        >
          <ArrowUp className="w-8 h-8" />
        </button>

        {/* Right / East */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('e')}
          className={`${btnStyle} absolute right-0 top-1/2 -translate-y-1/2`}
          aria-label="Move East"
        >
          <ArrowRight className="w-8 h-8" />
        </button>

        {/* Down / South */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('s')}
          className={`${btnStyle} absolute bottom-0 left-1/2 -translate-x-1/2`}
          aria-label="Move South"
        >
          <ArrowDown className="w-8 h-8" />
        </button>

        {/* Left / West */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMove('w')}
          className={`${btnStyle} absolute left-0 top-1/2 -translate-y-1/2`}
          aria-label="Move West"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        {/* Center Dpad Hub */}
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center text-xs font-bold text-slate-500">
          D-PAD
        </div>
      </div>
    </div>
  )
}
