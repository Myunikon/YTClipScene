import { Zap, Monitor, Music, Film, Smartphone, Sparkles, FileVideo2, Star } from 'lucide-react'
import { translations } from '../lib/locales'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

import { DialogOptions, DialogOptionSetters } from '../types'

interface SelectDownloadTypeProps {
    options: DialogOptions
    setters: DialogOptionSetters
    availableResolutions?: number[]
    availableAudioBitrates?: number[]
    availableVideoCodecs?: string[]
    availableAudioCodecs?: string[]
    isLowPerf?: boolean
}

export function SelectDownloadType({
    options, setters,
    availableResolutions, availableAudioBitrates,
    isLowPerf = false
}: SelectDownloadTypeProps) {
    const { format, container, audioBitrate, audioFormat } = options
    const { setFormat, setContainer, setAudioBitrate, setAudioFormat } = setters

    // Default values fallback not needed as hook provides defaults
    const { settings } = useAppStore()
    const t = translations[settings.language].dialog

    //  Inferred mode for internal render logic (but now controlled by parent)
    const mode = format === 'audio' ? 'audio' : format === 'gif' ? 'gif' : 'video'

    // Use dynamic bitrates if available, otherwise static list
    const audioFormats = (availableAudioBitrates && availableAudioBitrates.length > 0)
        ? [
            { value: '320', label: 'Best Available', desc: t.quality_profiles.highest_quality }, // Add Best option dynamically
            ...availableAudioBitrates.map(rate => {
                let desc = t.quality_profiles.standard
                if (rate >= 256) desc = t.quality_profiles.highest_quality
                if (rate <= 64) desc = t.quality_profiles.data_saver // Reusing data saver for low quality

                return { value: rate.toString(), label: `${rate} kbps`, desc }
            })
        ]
        : [
            { value: '320', label: 'Best (320k)', desc: t.quality_profiles.highest_quality },
            { value: '256', label: '256 kbps', desc: t.quality_profiles.highest_quality },
            { value: '192', label: '192 kbps', desc: t.quality_profiles.standard },
            { value: '128', label: '128 kbps', desc: t.quality_profiles.data_saver },
        ]

    const videoFormats = (availableResolutions && availableResolutions.length > 0)
        ? [
            { value: 'Best', label: t.formats.best, icon: Sparkles, desc: t.quality_profiles.highest_quality },
            ...availableResolutions
                .filter(h => h >= 144) // Filter out very low resolutions (< 144p)
                .map(h => {
                    let label = `${h}p`
                    let icon = Smartphone
                    let desc = t.quality_profiles.standard

                    if (h >= 2160) { label = '4K'; icon = Monitor; desc = t.quality_profiles.ultra_hd }
                    else if (h === 1440) { label = '2K'; icon = Monitor; desc = t.quality_profiles.qhd }
                    else if (h === 1080) { label = '1080p'; icon = Film; desc = t.quality_profiles.full_hd }
                    else if (h === 720) { label = '720p'; icon = Film; desc = t.quality_profiles.hd }
                    else if (h < 480) { icon = Smartphone; desc = t.quality_profiles.data_saver }

                    return { value: `${h}p`, label, icon, desc }
                })
        ]
        : [
            { value: 'Best', label: t.formats.best, icon: Sparkles, desc: t.quality_profiles.highest_quality },
            { value: '1080p', label: '1080p', icon: Film, desc: t.quality_profiles.full_hd },
            { value: '720p', label: '720p', icon: Film, desc: t.quality_profiles.hd },
            { value: '480p', label: '480p', icon: Smartphone, desc: t.quality_profiles.standard },
        ]

    return (
        <div className="space-y-4 p-1">
            {mode === 'gif' ? (
                <div className="space-y-4">
                    {/* 1. Resolution Card */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.gif_options?.res_title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {options.gifScale === 0 ? t.gif_options?.res_desc :  // Hack: 0 is original
                                        options.gifScale === 480 ? t.gif_options?.res_desc :
                                            t.gif_options?.res_desc}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {[
                                { val: 480, label: "High (480p)" },
                                { val: 320, label: "Medium (320p)" },
                                { val: 240, label: "Low (240p)" },
                            ].map(s => (
                                <button
                                    key={s.val}
                                    type="button"
                                    onClick={() => setters.setGifScale(s.val)}
                                    className={cn(
                                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                                        options.gifScale === s.val
                                            ? isLowPerf ? "bg-blue-600 text-white" : "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/20 text-foreground shadow-sm"
                                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Warning for user education */}
                        <div className="text-[10px] text-yellow-500/80 bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10 flex items-center gap-2">
                            <span className="shrink-0">⚠️</span>
                            <span>GIFs are limited to 480p to prevent huge file sizes and crashes.</span>
                        </div>
                    </div>

                    {/* 2. FPS Card */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Film className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.gif_options?.fps_title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {t.gif_options?.fps_desc}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {[
                                { val: 30, label: t.gif_options?.fps_smooth },
                                { val: 15, label: t.gif_options?.fps_standard },
                                { val: 10, label: t.gif_options?.fps_lite },
                            ].map(f => (
                                <button
                                    key={f.val}
                                    type="button"
                                    onClick={() => setters.setGifFps(f.val)}
                                    className={cn(
                                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                                        options.gifFps === f.val
                                            ? isLowPerf ? "bg-blue-600 text-white" : "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/20 text-foreground shadow-sm"
                                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Quality Card */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.gif_options?.quality_title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {options.gifQuality === 'high' ? "Uses Palette Generation (Sharp colors)" : "Standard dithering (Fast render)"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {[
                                { id: 'high', label: t.gif_options?.quality_high, recommended: true },
                                { id: 'fast', label: t.gif_options?.quality_fast, recommended: false },
                            ].map(q => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => setters.setGifQuality(q.id as any)}
                                    className={cn(
                                        "relative flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                                        options.gifQuality === q.id
                                            ? isLowPerf ? "bg-blue-600 text-white" : "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/20 text-foreground shadow-sm"
                                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    {q.recommended && (
                                        <div className="absolute -top-1 -right-1">
                                            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                        </div>
                                    )}
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : mode === 'audio' ? (
                <div className="space-y-4">
                    {/* 1. Audio Quality Card (Top) */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.audio_extraction.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    Higher bitrate means clearer sound details.
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {audioFormats.map((f) => {
                                const isSelected = audioBitrate === f.value
                                const isBest = f.value === '320' || f.label.includes('Best')
                                return (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setAudioBitrate && setAudioBitrate(f.value)}
                                        className={cn(
                                            "relative flex items-center p-3 rounded-xl border text-left gap-3 transition-all",
                                            isSelected
                                                ? isLowPerf ? "bg-blue-50 dark:bg-blue-950 border-blue-500" : "bg-primary/10 dark:bg-white/5 border-primary/50 dark:border-white/20 ring-1 ring-primary/30 dark:ring-white/20"
                                                : isLowPerf ? "bg-card border-border hover:bg-muted" : "bg-black/20 border-white/5 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            isSelected ? "bg-primary/20 text-primary dark:text-white" : isLowPerf ? "bg-muted text-muted-foreground" : "bg-white/5 text-muted-foreground"
                                        )}>
                                            <Music className="w-4 h-4" />
                                        </div>

                                        <div>
                                            <div className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                                {f.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium opacity-80">
                                                {f.desc}
                                            </div>
                                        </div>
                                        {isBest && (
                                            <div className="absolute top-2 right-2">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 2. Audio Format Card */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Music className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">Audio Format</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {audioFormat === 'mp3' ? "Universal (Music/Podcast)" :
                                        audioFormat === 'm4a' ? "Efficient (Apple/Mobile)" :
                                            audioFormat === 'flac' ? "Lossless (Audiophile)" :
                                                audioFormat === 'wav' ? "Uncompressed (Editing)" :
                                                    "Select Format"}
                                </div>
                            </div>
                        </div>

                        <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1")}>
                            {['mp3', 'm4a', 'flac', 'wav'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setAudioFormat && setAudioFormat(c)}
                                    className={cn(
                                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                                        audioFormat === c
                                            ? isLowPerf ? "bg-blue-600 text-white" : "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/20 text-foreground shadow-sm"
                                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 1. Video Quality Card (Moved to Top) */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.video_quality?.title || "Video Quality"}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {t.video_quality?.desc || "Higher quality means larger file size."}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {videoFormats.map((f) => {
                                const isSelected = format === f.value

                                return (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setFormat(f.value)}
                                        className={cn(
                                            "relative flex items-center justify-center p-2 rounded-xl border text-center h-[50px] transition-all",
                                            isSelected
                                                ? isLowPerf ? "bg-primary/10 border-primary" : "bg-primary/10 dark:bg-white/5 border-primary/50 dark:border-white/20 text-foreground shadow-sm ring-1 ring-primary/30 dark:ring-white/20"
                                                : isLowPerf ? "bg-card border-border hover:bg-muted" : "bg-black/20 border-white/5 hover:bg-white/5"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary dark:bg-white shadow-sm" />
                                        )}

                                        <div className={cn("font-bold text-xs leading-tight", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                            {f.label}
                                        </div>
                                        {f.value === 'Best' && (
                                            <div className="absolute -top-1 -right-1">
                                                <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 2. Output Format Card */}
                    <div className="p-3 rounded-xl border bg-transparent border-white/10 space-y-3 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white/10 text-muted-foreground shrink-0">
                                <FileVideo2 className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-[0.93rem] leading-none">{t.output_format?.title || "Output Format"}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                                    {container === 'mp4' ? t.output_format?.desc_mp4 :
                                        container === 'mkv' ? t.output_format?.desc_mkv :
                                            container === 'webm' ? t.output_format?.desc_webm :
                                                container === 'mov' ? t.output_format?.desc_mov :
                                                    t.output_format?.desc_default}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {['mp4', 'mkv', 'webm', 'mov'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setContainer(c)}
                                    className={cn(
                                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                                        container === c
                                            ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/20 text-foreground shadow-sm"
                                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
