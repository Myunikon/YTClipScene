import { Scissors } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RangeSlider } from '../RangeSlider'
import { Switch } from '../Switch'
import { cn } from '../../lib/utils'
import { translations } from '../../lib/locales'

interface ClipSectionProps {
    isClipping: boolean
    setIsClipping: (v: boolean) => void
    duration?: number
    rangeStart: string
    setRangeStart: (v: string) => void
    rangeEnd: string
    setRangeEnd: (v: string) => void
    t: typeof translations['en']['dialog']
}

// Helpers
const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const parseTime = (str: string) => {
    if (!str) return 0
    const parts = str.split(':').map(Number).reverse()
    let seconds = 0
    if (parts[0]) seconds += parts[0]
    if (parts[1]) seconds += parts[1] * 60
    if (parts[2]) seconds += parts[2] * 3600
    return seconds
}

export function ClipSection({ 
    isClipping, setIsClipping, duration, 
    rangeStart, setRangeStart, rangeEnd, setRangeEnd, 
    t 
}: ClipSectionProps) {
    return (
        <div className="space-y-3">
            <div 
                className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                    isClipping 
                        ? "bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10" 
                        : "bg-secondary/10 border-white/5 hover:bg-secondary/20 hover:border-white/10"
                )} 
                onClick={() => setIsClipping(!isClipping)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isClipping ? "bg-orange-500 text-white" : "bg-white/5 text-muted-foreground"
                    )}>
                        <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                        <div className={cn(
                            "font-bold text-sm",
                            isClipping ? "text-orange-200" : "text-foreground"
                        )}>{t.trim_video}</div>
                        <div className="text-[10px] text-muted-foreground/60 leading-tight">
                            Cut specific portion of the video
                        </div>
                    </div>
                </div>
                <Switch checked={isClipping} onCheckedChange={setIsClipping} className={isClipping ? "data-[state=checked]:bg-orange-500" : ""} />
            </div>

            <AnimatePresence>
                {isClipping && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-8 pb-4 px-2 space-y-6">
                            {duration ? (
                                <div className="mx-4">
                                    <RangeSlider 
                                        duration={duration} 
                                        start={rangeStart ? parseTime(rangeStart) : 0} 
                                        end={rangeEnd ? parseTime(rangeEnd) : duration}
                                        onChange={(s, e) => {
                                            setRangeStart(formatTime(s))
                                            setRangeEnd(formatTime(e))
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground text-center py-2 bg-secondary/20 rounded-lg">
                                    {t.metadata_required}
                                </div>
                            )}

                            <div className={cn("flex items-center gap-2 transition-colors", 
                                (rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) ? "text-red-500" : ""
                            )}>
                                <input 
                                    className={cn(
                                        "w-full p-2.5 border rounded-lg bg-secondary/20 text-sm text-center font-mono focus:ring-2 outline-none transition-all",
                                        (rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) 
                                        ? "border-red-500 focus:ring-red-500/20 text-red-500 placeholder:text-red-300" 
                                        : "placeholder:text-muted-foreground/30 focus:ring-primary/10"
                                    )}
                                    placeholder="00:00" 
                                    value={rangeStart} 
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9:]/g, '')
                                        setRangeStart(val)
                                    }}
                                    onBlur={() => {
                                        const s = parseTime(rangeStart)
                                        const e = parseTime(rangeEnd)
                                        if (s > 0 && e > 0 && s > e) {
                                            setRangeStart(formatTime(e))
                                            setRangeEnd(formatTime(s))
                                        }
                                    }}
                                />
                                <span className="text-muted-foreground/50 text-xs font-bold">TO</span>
                                <input 
                                    className={cn(
                                        "w-full p-2.5 border rounded-lg bg-secondary/20 text-sm text-center font-mono focus:ring-2 outline-none transition-all",
                                        (rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) 
                                        ? "border-red-500 focus:ring-red-500/20 text-red-500 placeholder:text-red-300" 
                                        : "placeholder:text-muted-foreground/30 focus:ring-primary/10"
                                    )}
                                    placeholder={duration ? formatTime(duration) : "00:10"} 
                                    value={rangeEnd} 
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9:]/g, '')
                                        setRangeEnd(val)
                                    }}
                                    onBlur={() => {
                                        const s = parseTime(rangeStart)
                                        const e = parseTime(rangeEnd)
                                        if (s > 0 && e > 0 && s > e) {
                                            setRangeStart(formatTime(e))
                                            setRangeEnd(formatTime(s))
                                        }
                                    }}
                                />
                            </div>
                            {(rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) && (
                                <p className="text-[10px] text-red-500 font-bold mt-2 text-center animate-in slide-in-from-top-1">
                                    {t.time_error}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
