import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface CustomDateTimePickerProps {
    value: string // ISO string or empty
    onChange: (value: string) => void
    t: any
}

export function CustomDateTimePicker({ value, onChange, t }: CustomDateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    
    // Mode state: 'date' or 'time'
    const [mode, setMode] = useState<'date' | 'time'>('date')
    const hoursRef = useRef<HTMLDivElement>(null)
    const minutesRef = useRef<HTMLDivElement>(null)

    // Parse current value or default to now
    const dateValue = value ? new Date(value) : new Date()
    
    // View state for calendar (separate from selected value)
    const [viewDate, setViewDate] = useState(dateValue)

    // Update position on open - try to spawn ABOVE, fallback to BELOW
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const dropdownHeight = mode === 'time' ? 220 : 260 // Approximate height
            
            // Check if there's enough space above
            const spaceAbove = rect.top
            const shouldSpawnAbove = spaceAbove > dropdownHeight + 16
            
            if (shouldSpawnAbove) {
                setCoords({
                    top: rect.top + window.scrollY - dropdownHeight - 8,
                    left: rect.left + window.scrollX,
                    width: rect.width
                })
            } else {
                // Spawn below if not enough space above
                setCoords({
                    top: rect.bottom + window.scrollY + 8,
                    left: rect.left + window.scrollX,
                    width: rect.width
                })
            }
        }
    }, [isOpen, mode])

    // Scroll to time when switching to time mode
    // Only run on mode switch or open
    useEffect(() => {
        if (mode === 'time' && isOpen) {
            // Simple timeout to wait for render
            setTimeout(() => {
                if (hoursRef.current) {
                    const h = dateValue.getHours()
                    hoursRef.current.scrollTop = h * 24 // h-6 = 24px
                }
                if (minutesRef.current) {
                    const m = dateValue.getMinutes()
                    minutesRef.current.scrollTop = m * 24 // h-6 = 24px
                }
            }, 10)
        }
    }, [mode, isOpen])

    // Close on click outside (modified for portal)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Small delay to let internal clicks register first
            setTimeout(() => {
                const dropdown = document.getElementById('custom-date-picker-dropdown')
                const isInsideContainer = containerRef.current?.contains(event.target as Node)
                const isInsideDropdown = dropdown?.contains(event.target as Node)
                
                if (!isInsideContainer && !isInsideDropdown) {
                    setIsOpen(false)
                }
            }, 0)
        }
        
        if (isOpen) {
             document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Helper to format as YYYY-MM-DDTHH:mm
    const toLocalISO = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

    const daysInMonth = getDaysInMonth(viewDate)
    const firstDay = getFirstDayOfMonth(viewDate)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const blanks = Array.from({ length: firstDay }, (_, i) => i)

    const handleDateSelect = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, dateValue.getHours(), dateValue.getMinutes())
        onChange(toLocalISO(newDate))
    }

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate)
        newDate.setMonth(newDate.getMonth() + delta)
        setViewDate(newDate)
    }

    const isSelected = (day: number) => {
        return value && 
               dateValue.getDate() === day && 
               dateValue.getMonth() === viewDate.getMonth() && 
               dateValue.getFullYear() === viewDate.getFullYear()
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() && 
               viewDate.getMonth() === today.getMonth() && 
               viewDate.getFullYear() === today.getFullYear()
    }

    const isDisabled = (day: number) => {
        const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return checkDate < today
    }
    
    // Time Wheel Helpers
    const handleTimeChange = (type: 'hour' | 'minute', val: string) => {
        let num = parseInt(val)
        if (isNaN(num)) return

        const newDate = new Date(dateValue)
        if (type === 'hour') {
            num = Math.min(23, Math.max(0, num))
            newDate.setHours(num)
        } else {
             num = Math.min(59, Math.max(0, num))
            newDate.setMinutes(num)
        }
        onChange(toLocalISO(newDate))
    }

    const handleScroll = (type: 'hour' | 'minute', e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement
        const scrollTop = target.scrollTop
        const index = Math.round(scrollTop / 24) // h-6 = 24px
        
        if (type === 'hour') {
            const current = dateValue.getHours()
            if (index !== current && index >= 0 && index < 24) {
                const newDate = new Date(dateValue)
                newDate.setHours(index)
                onChange(toLocalISO(newDate))
            }
        } else {
            const current = dateValue.getMinutes()
            if (index !== current && index >= 0 && index < 60) {
                const newDate = new Date(dateValue)
                newDate.setMinutes(index)
                onChange(toLocalISO(newDate))
            }
        }
    }


    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer group select-none",
                    isOpen 
                        ? "bg-background dark:bg-black/60 border-orange-500 ring-1 ring-orange-500 dark:border-orange-500/50 dark:ring-orange-500/50" 
                        : "bg-background dark:bg-black/40 border-input dark:border-white/10 hover:bg-secondary dark:hover:bg-black/50 hover:border-accent dark:hover:border-white/20"
                )}
            >
                <div className="text-sm font-mono text-foreground font-medium flex items-center gap-2">
                    {value ? (
                        <>
                           <span className={cn("transition-colors", mode === 'date' && isOpen ? "text-orange-400" : "")}>{dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                           <span className="opacity-50">|</span>
                           <span className={cn("transition-colors", mode === 'time' && isOpen ? "text-orange-400" : "")}>{dateValue.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground/50">{t?.pick_date || "Pick a date..."}</span>
                    )}
                </div>
                <CalendarIcon className={cn("w-4 h-4 transition-colors", isOpen ? "text-orange-400" : "text-muted-foreground group-hover:text-white")} />
            </div>

            {/* Portal Dropdown */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        id="custom-date-picker-dropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ 
                            position: 'absolute',
                            top: coords.top, 
                            left: coords.left, 
                            width: Math.max(coords.width, 220),
                            maxWidth: '220px',
                            zIndex: 99990
                        }}
                        className="bg-popover dark:bg-[#0F0F0F] border border-border dark:border-white/10 rounded-lg shadow-2xl p-0 overflow-hidden flex flex-col"
                    >
                        {/* Header Tabs */}
                        <div className="flex bg-accent/50 dark:bg-white/5 border-b border-border dark:border-white/5">
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode('date'); }}
                                className={cn("flex-1 py-1.5 text-[9px] font-bold uppercase transition-colors hover:bg-accent dark:hover:bg-white/5", mode === 'date' ? "text-orange-600 dark:text-orange-400 bg-accent dark:bg-white/5" : "text-muted-foreground")}
                            >
                                {t?.calendar || "Calendar"}
                            </button>
                            <div className="w-[1px] bg-border dark:bg-white/5" />
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode('time'); }}
                                className={cn("flex-1 py-1.5 text-[9px] font-bold uppercase transition-colors hover:bg-white/5", mode === 'time' ? "text-orange-400 bg-white/5" : "text-muted-foreground")}
                            >
                                {t?.time || "Time"}
                            </button>
                        </div>

                        {mode === 'date' ? (
                            <>
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between p-2">
                                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                    <span className="font-bold text-xs">
                                        {viewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="px-2 pb-2">
                                    <div className="grid grid-cols-7 mb-1">
                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                            <div key={d} className="text-center text-[9px] uppercase font-bold text-muted-foreground">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5">
                                        {blanks.map(b => <div key={`b-${b}`} />)}
                                        {days.map(d => {
                                            const disabled = isDisabled(d)
                                            return (
                                                <button
                                                    key={d}
                                                    disabled={disabled}
                                                    onClick={() => !disabled && handleDateSelect(d)}
                                                    className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center text-[11px] transition-all",
                                                        disabled 
                                                            ? "text-muted-foreground/30 cursor-not-allowed" 
                                                            : "hover:bg-accent dark:hover:bg-white/10",
                                                        !disabled && isSelected(d) && "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20",
                                                        !disabled && !isSelected(d) && isToday(d) && "border border-orange-500/50 text-orange-600 dark:text-orange-400"
                                                    )}
                                                >
                                                    {d}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="p-1 border-t border-border dark:border-white/5">
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode('time'); }} 
                                        className="w-full py-1 bg-white/5 rounded hover:bg-white/10 text-[9px] font-bold text-muted-foreground hover:text-white transition-colors"
                                    >
                                        {t?.set_time_next || "Set Time Next"} &rarr;
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Time Picker Wheel */
                            <div className="flex flex-col bg-accent/20 dark:bg-black/20">
                                <div className="h-[160px] flex text-xs relative">
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-6 bg-accent dark:bg-white/5 pointer-events-none border-y border-border dark:border-white/10" />
                                    
                                    {/* Hours */}
                                    <div 
                                        className="flex-1 overflow-y-auto no-scrollbar text-center py-[67px]" 
                                        ref={hoursRef}
                                        onScroll={(e) => handleScroll('hour', e)}
                                    >
                                        {Array.from({length: 24}).map((_, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => handleTimeChange('hour', i.toString())}
                                                className={cn(
                                                    "h-6 flex items-center justify-center cursor-pointer transition-all",
                                                    dateValue.getHours() === i ? "text-orange-400 font-bold text-base scale-110" : "text-muted-foreground/50 hover:text-white"
                                                )}
                                            >
                                                {i.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex items-center justify-center text-muted-foreground z-10">:</div>

                                    {/* Minutes */}
                                    <div 
                                        className="flex-1 overflow-y-auto no-scrollbar text-center py-[67px]" 
                                        ref={minutesRef}
                                        onScroll={(e) => handleScroll('minute', e)}
                                    >
                                        {Array.from({length: 60}).map((_, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => handleTimeChange('minute', i.toString())}
                                                className={cn(
                                                    "h-6 flex items-center justify-center cursor-pointer transition-all",
                                                    dateValue.getMinutes() === i ? "text-orange-400 font-bold text-base scale-110" : "text-muted-foreground/50 hover:text-white"
                                                )}
                                            >
                                                {i.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-2 border-t border-border dark:border-white/5 bg-background dark:bg-black/40">
                                    <button 
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded text-xs font-bold transition-colors shadow-lg shadow-orange-500/20"
                                    >
                                        {t?.done || "Done"}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}
