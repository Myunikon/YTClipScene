import { Scissors } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RangeSlider } from '../RangeSlider'
import { Switch } from '../Switch'
import { cn, formatTime, parseTime } from '../../lib/utils'
import { DialogOptions, DialogOptionSetters } from '../../types'

interface ClipSectionProps {
    duration?: number
    maxDuration?: number // For GIF mode - max clip length
    t: any

    // Grouped Props
    options: DialogOptions
    setters: DialogOptionSetters
}

export function ClipSection({
    duration, maxDuration, t,
    options, setters
}: ClipSectionProps) {
    const { isClipping, rangeStart, rangeEnd, format } = options
    const { setIsClipping, setRangeStart, setRangeEnd } = setters

    // For GIF mode (when maxDuration is set), clipping is mandatory
    const isMandatory = !!maxDuration
    const effectiveIsClipping = isMandatory || isClipping

    return (
        <div className="space-y-3">
            {/* Toggle - Hidden/Disabled for GIF mode since it's mandatory */}
            {!isMandatory && (
                <div
                    className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all min-h-[64px]",
                        effectiveIsClipping
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-transparent border-white/5 hover:bg-white/5"
                    )}
                    onClick={() => setIsClipping(!isClipping)}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-1.5 rounded-lg",
                            effectiveIsClipping ? "bg-orange-500 text-white" : "bg-white/10 text-muted-foreground"
                        )}>
                            <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-[0.93rem] leading-none">
                                {format === 'audio' ? (t.trim_audio || "Trim Audio") : t.trim_video}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                {t.trim_desc || "Cut specific portion of the video"}
                            </div>
                        </div>
                    </div>
                    <Switch checked={effectiveIsClipping} onCheckedChange={setIsClipping} className={effectiveIsClipping ? "data-[state=checked]:bg-orange-500 scale-90" : "scale-90"} />
                </div>
            )}

            <AnimatePresence>
                {effectiveIsClipping && (
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
                                <div className="text-xs text-muted-foreground text-center py-2 bg-muted/50 dark:bg-secondary/20 rounded-lg border border-border/50">
                                    {t.metadata_required}
                                </div>
                            )}

                            <div className={cn("flex items-center gap-2 transition-colors",
                                (rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) ? "text-red-500" : ""
                            )}>
                                <input
                                    className={cn(
                                        "w-full p-2.5 border rounded-lg bg-white dark:bg-secondary/20 text-sm text-center font-mono focus:ring-2 outline-none transition-all shadow-sm",
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
                                        let s = parseTime(rangeStart)
                                        let e = parseTime(rangeEnd)

                                        // 1. Clamp values to video duration if known
                                        if (duration) {
                                            if (s > duration) s = 0 // Reset invalid start
                                            if (e > duration) e = duration // Clamp absolute end
                                        }

                                        // 2. Prevent negatives
                                        if (s < 0) s = 0
                                        if (e < 0) e = 0 // Should not happen with regex but safe to keep

                                        // 3. Ensure Logical Order (Start < End)
                                        // If they define a range where s >= e, we try to be smart
                                        if (s >= e) {
                                            if (e === 0 && duration) {
                                                // If End is 0 (likely uninitialized or cleared), set it to duration
                                                e = duration
                                            } else {
                                                // Otherwise swap them, assuming user entered values in wrong boxes
                                                const temp = s
                                                s = e
                                                e = temp
                                            }
                                        }

                                        setRangeStart(formatTime(s))
                                        setRangeEnd(formatTime(e))
                                    }}
                                />
                                <span className="text-muted-foreground/50 text-xs font-bold">{t.clip?.to || "TO"}</span>
                                <input
                                    className={cn(
                                        "w-full p-2.5 border rounded-lg bg-white dark:bg-secondary/20 text-sm text-center font-mono focus:ring-2 outline-none transition-all shadow-sm",
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
                                        let s = parseTime(rangeStart)
                                        let e = parseTime(rangeEnd)

                                        if (duration) {
                                            if (e > duration) e = duration
                                            if (s > duration) s = 0
                                        }

                                        if (s < 0) s = 0
                                        if (e < 0) e = 0

                                        if (s >= e) {
                                            const temp = s
                                            s = e
                                            e = temp
                                        }

                                        setRangeStart(formatTime(s))
                                        setRangeEnd(formatTime(e))
                                    }}
                                />
                            </div>
                            {(rangeStart && rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd)) && (
                                <p className="text-xs text-red-500 font-bold mt-2 text-center animate-in slide-in-from-top-1">
                                    {t.time_error}
                                </p>
                            )}
                            {/* Duration exceeded warning for GIF */}
                            {maxDuration && rangeStart && rangeEnd && (parseTime(rangeEnd) - parseTime(rangeStart)) > maxDuration && (
                                <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mt-2 text-center animate-in slide-in-from-top-1">
                                    ⚠️ {t.gif_maker?.too_long?.replace('{max}', String(maxDuration)).replace('{current}', String(Math.round(parseTime(rangeEnd) - parseTime(rangeStart)))) || `Clip is too long! Max ${maxDuration}s for GIF. Current: ${Math.round(parseTime(rangeEnd) - parseTime(rangeStart))}s`}
                                </p>
                            )}
                            {/* Show current clip duration */}
                            {rangeStart && rangeEnd && parseTime(rangeEnd) > parseTime(rangeStart) && (
                                <p className={cn(
                                    "text-xs font-medium mt-2 text-center",
                                    maxDuration && (parseTime(rangeEnd) - parseTime(rangeStart)) > maxDuration
                                        ? "text-pink-600 dark:text-pink-400"
                                        : "text-muted-foreground"
                                )}>
                                    {maxDuration
                                        ? (t.clip?.duration_max?.replace('{current}', String(Math.round(parseTime(rangeEnd) - parseTime(rangeStart)))).replace('{max}', String(maxDuration)) || `Clip duration: ${Math.round(parseTime(rangeEnd) - parseTime(rangeStart))}s / ${maxDuration}s max`)
                                        : (t.clip?.duration?.replace('{current}', String(Math.round(parseTime(rangeEnd) - parseTime(rangeStart)))) || `Clip duration: ${Math.round(parseTime(rangeEnd) - parseTime(rangeStart))}s`)
                                    }
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
