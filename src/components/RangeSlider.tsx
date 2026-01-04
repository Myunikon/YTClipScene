import { useRef, useState, useEffect } from 'react'
import { cn } from '../lib/utils'

interface RangeSliderProps {
    duration: number // in seconds
    start: number
    end: number
    onChange: (start: number, end: number) => void
    disabled?: boolean
}

export function RangeSlider({ duration, start, end, onChange, disabled }: RangeSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

    // Calculate percentage positions
    const safeStart = Math.min(start, end)
    const safeEnd = Math.max(start, end)

    const startPct = duration > 0 ? Math.min(100, Math.max(0, (safeStart / duration) * 100)) : 0
    const endPct = duration > 0 ? Math.min(100, Math.max(0, (safeEnd / duration) * 100)) : 100

    // Global Pointer Move/Up handlers to handle dragging even when cursor leaves the element
    useEffect(() => {
        if (!dragging) return

        const handlePointerMove = (e: PointerEvent) => {
            if (!trackRef.current) return
            const rect = trackRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = Math.min(1, Math.max(0, x / rect.width))
            const val = Math.round(pct * duration)

            if (dragging === 'start') {
                const newStart = Math.min(val, safeEnd - 1) // Prevent crossing specific logic if needed, or just let it clamp
                // Ensure we don't push past the end
                onChange(Math.min(newStart, safeEnd), safeEnd)
            } else {
                 const newEnd = Math.max(val, safeStart + 1)
                 onChange(safeStart, Math.max(newEnd, safeStart))
            }
        }

        const handlePointerUp = () => {
            setDragging(null)
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [dragging, duration, safeStart, safeEnd, onChange])


    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600)
        const m = Math.floor((s % 3600) / 60)
        const sec = Math.floor(s % 60)
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <div className={cn("w-full py-6 select-none relative", disabled && "opacity-50 pointer-events-none")}>
            <div ref={trackRef} className="h-1.5 bg-white/10 rounded-full relative w-full touch-none">
                {/* Active Range Bar */}
                <div 
                    className="absolute h-full bg-primary rounded-full opacity-50"
                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                />

                {/* Thumb Start */}
                <div
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing z-20 flex items-center justify-center transition-transform hover:scale-110",
                        dragging === 'start' && "scale-110 ring-4 ring-primary/20"
                    )}
                    style={{ left: `${startPct}%` }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        setDragging('start')
                    }}
                >
                    <div className={cn(
                        "absolute -top-8 text-[10px] font-mono font-bold bg-white text-black px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity",
                        dragging === 'start' ? "opacity-100" : "opacity-0 hover:opacity-100"
                    )}>
                        {formatTime(start)}
                    </div>
                </div>

                {/* Thumb End */}
                <div
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing z-20 flex items-center justify-center transition-transform hover:scale-110",
                        dragging === 'end' && "scale-110 ring-4 ring-primary/20"
                    )}
                    style={{ left: `${endPct}%` }}
                    onPointerDown={(e) => {
                        e.preventDefault()
                        setDragging('end')
                    }}
                >
                    <div className={cn(
                        "absolute -top-8 text-[10px] font-mono font-bold bg-white text-black px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity",
                        dragging === 'end' ? "opacity-100" : "opacity-0 hover:opacity-100"
                    )}>
                        {formatTime(end)}
                    </div>
                </div>
            </div>
        </div>
    )
}
