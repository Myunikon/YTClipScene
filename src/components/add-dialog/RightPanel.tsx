import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Settings, AlertCircle, Music, List, Calendar, Clock, MessageSquare, Subtitles, Scissors, ChevronDown,
    Monitor, Film, Cpu, TriangleAlert
} from 'lucide-react'

import { SelectDownloadType } from '../SelectDownloadType'
import { Switch } from '../Switch'
import { ClipSection } from './ClipSection'
import { CustomDateTimePicker } from '../CustomDateTimePicker'
import { isYouTubeUrl } from '../../lib/validators'
import { VideoMeta, DialogOptions, DialogOptionSetters } from '../../types'
import { cn } from '../../lib/utils'

// --- 1. KOMPONEN BANTUAN KECIL ---


// --- 2. KOMPONEN TAB TYPE ---
function DownloadTypeTabs({ mode, onChange, isLowPerf, t }: { mode: 'video' | 'audio' | 'gif', onChange: (m: 'video' | 'audio' | 'gif') => void, isLowPerf: boolean, t: any }) {
    const tabs = [
        { id: 'video' as const, label: t.tabs?.video || 'Video', icon: <Monitor className="w-4 h-4 z-10 relative" /> },
        { id: 'audio' as const, label: t.tabs?.audio || 'Audio', icon: <Music className="w-4 h-4 z-10 relative" /> },
        { id: 'gif' as const, label: t.tabs?.gif || 'GIF', icon: <Film className="w-4 h-4 z-10 relative" /> }
    ]

    return (
        <div className={cn("flex p-1 rounded-xl border mb-6 relative z-10", isLowPerf ? "bg-muted border-border" : "bg-secondary/50 dark:bg-black/20 border-border dark:border-white/5")}>
            {tabs.map(tab => {
                const isActive = mode === tab.id
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold relative transition-colors",
                            isActive
                                ? "text-white"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className={cn("absolute inset-0 rounded-lg shadow-lg",
                                    tab.id === 'video' ? "bg-violet-600" :
                                        tab.id === 'audio' ? "bg-blue-600" : "bg-pink-600"
                                )}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab.icon} {tab.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

interface RightPanelProps {
    url: string
    hasMeta: boolean
    meta: VideoMeta | null
    t: any

    // Grouped Props
    options: DialogOptions
    setters: DialogOptionSetters

    availableResolutions: number[] | undefined
    availableAudioBitrates: number[] | undefined
    availableVideoCodecs: string[] | undefined
    availableAudioCodecs: string[] | undefined
    availableLanguages: any[]

    isLowPerf?: boolean
}

export function RightPanel({
    url, hasMeta, meta, t,
    options, setters,
    availableResolutions,
    availableAudioBitrates,
    availableVideoCodecs,
    availableAudioCodecs,
    availableLanguages,

    isLowPerf = false
}: RightPanelProps) {

    if (!hasMeta) return null

    // Collapsible State for Enhancements
    const [showEnhancements, setShowEnhancements] = useState(false)

    // Derived Mode State
    const mode = options.format === 'audio' ? 'audio' : options.format === 'gif' ? 'gif' : 'video'

    const handleModeChange = (m: 'video' | 'audio' | 'gif') => {
        if (m === 'audio') setters.setFormat('audio')
        else if (m === 'gif') setters.setFormat('gif')
        else setters.setFormat('Best')
    }

    return (
        <div className="lg:flex-1 min-w-0 relative z-0 flex flex-col bg-transparent dark:bg-black/20 lg:overflow-hidden">
            <div className="lg:flex-1 lg:overflow-y-auto p-6 space-y-6 lg:min-w-[28rem]">

                {/* 1. Global Tabs with Bounce Animation */}
                <DownloadTypeTabs mode={mode} onChange={handleModeChange} isLowPerf={isLowPerf} t={t} />

                {/* 2. Content - Simple Fade Only */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-6"
                    >
                        <SelectDownloadType
                            options={options}
                            setters={setters}
                            availableResolutions={availableResolutions}
                            availableAudioBitrates={availableAudioBitrates}
                            availableVideoCodecs={availableVideoCodecs}
                            availableAudioCodecs={availableAudioCodecs}
                            isLowPerf={isLowPerf}
                        />

                        {!options.batchMode && (mode === 'video' || mode === 'gif' || mode === 'audio') && (
                            <div className={cn(
                                "pt-4 border-t",
                                mode === 'gif'
                                    ? "border-pink-300 dark:border-pink-500/30 bg-pink-100 dark:bg-pink-500/5 -mx-6 px-6 pb-4"
                                    : "border-border dark:border-white/5"
                            )}>
                                <h4 className={cn(
                                    "text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider",
                                    mode === 'gif'
                                        ? "text-pink-600 dark:text-pink-400"
                                        : "text-muted-foreground"
                                )}>
                                    <Scissors className={cn("w-3 h-3", mode === 'gif' ? "text-pink-600 dark:text-pink-400" : "text-orange-500 dark:text-orange-400")} />
                                    {mode === 'gif'
                                        ? (t.gif_maker?.trim_required || "✂️ Trim Required")
                                        : (t.clip_label || "Clip Video")}
                                    {mode === 'gif' && (
                                        <span className="ml-auto text-[10px] font-medium bg-pink-200 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                                            {t.gif_maker?.max_duration || "Max 30s"}
                                        </span>
                                    )}
                                </h4>

                                {mode === 'gif' && (
                                    <div className="text-xs text-pink-600 dark:text-pink-300/80 mb-3 leading-relaxed">
                                        {t.gif_maker?.trim_desc || "GIF format requires trimming. Select a short clip (max 30 seconds) for best results."}
                                    </div>
                                )}

                                <ClipSection
                                    options={options}
                                    setters={setters}
                                    duration={meta?.duration}
                                    t={t}
                                    maxDuration={mode === 'gif' ? 30 : undefined}
                                />
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setShowEnhancements(!showEnhancements)}
                                className="w-full flex items-center justify-between group py-2"
                            >
                                <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                                    <Settings className="w-3 h-3" /> {t.enhancements_label}
                                </h4>
                                <div className={cn("p-1 rounded-md transition-all", showEnhancements ? "bg-white/10 text-foreground rotate-180" : "text-muted-foreground group-hover:bg-white/5")}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            <AnimatePresence>
                                {showEnhancements && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-3">
                                            {options.format !== 'gif' && isYouTubeUrl(url) && (
                                                <>
                                                    <div
                                                        onClick={() => !options.isClipping && setters.setSponsorBlock(!options.sponsorBlock)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all min-h-[64px]",
                                                            options.sponsorBlock ? "bg-red-500/10 border-red-500/30" : "bg-transparent border-white/5",
                                                            options.isClipping ? "opacity-50 cursor-not-allowed border-dashed" : "cursor-pointer hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn("p-1.5 rounded-lg shrink-0", options.sponsorBlock ? "bg-red-500 text-white" : "bg-white/10 text-muted-foreground")}><AlertCircle className="w-4 h-4" /></div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-[0.93rem] leading-none truncate">{t.remove_sponsors}</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80 truncate">
                                                                    {options.isClipping ? (t.sponsor_clip_conflict || "Unavailable while cutting video") : t.remove_sponsors_desc}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Switch
                                                            checked={options.sponsorBlock}
                                                            onCheckedChange={setters.setSponsorBlock}
                                                            disabled={options.isClipping}
                                                            className="data-[state=checked]:bg-red-500 scale-90 shrink-0 ml-2"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {options.format !== 'gif' && (
                                                <div onClick={() => setters.setAudioNormalization(!options.audioNormalization)} className={cn("flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all min-h-[64px]", options.audioNormalization ? "bg-pink-500/10 border-pink-500/30" : "bg-transparent border-white/5 hover:bg-white/5")}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn("p-1.5 rounded-lg shrink-0", options.audioNormalization ? "bg-pink-500 text-white" : "bg-white/10 text-muted-foreground")}><Music className="w-4 h-4" /></div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-[0.93rem] leading-none truncate">{t.loudness_normalization || "Loudness Norm."}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5 opacity-80 truncate">{t.loudness_desc || "EBU R128 Standard"}</div>
                                                        </div>
                                                    </div>
                                                    <Switch checked={options.audioNormalization} onCheckedChange={setters.setAudioNormalization} className="data-[state=checked]:bg-pink-500 scale-90 shrink-0 ml-2" />
                                                </div>
                                            )}

                                            {options.format !== 'gif' && isYouTubeUrl(url) && (meta?.chapters && meta.chapters.length > 0) && (
                                                <div onClick={() => setters.setSplitChapters(!options.splitChapters)} className={cn("flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all min-h-[64px]", options.splitChapters ? "bg-blue-500/10 border-blue-500/30" : "bg-transparent border-white/5 hover:bg-white/5")}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn("p-1.5 rounded-lg shrink-0", options.splitChapters ? "bg-blue-500 text-white" : "bg-white/10 text-muted-foreground")}><List className="w-4 h-4" /></div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-[0.93rem] leading-none truncate">{t.split_chapters || 'Split Chapters'}</div>
                                                            {options.audioNormalization && options.splitChapters && (
                                                                <div className="text-[10px] text-cyan-400 mt-1">Sequential Mode: Will split after download</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Switch checked={options.splitChapters} onCheckedChange={setters.setSplitChapters} className="data-[state=checked]:bg-blue-500 scale-90 shrink-0 ml-2" />
                                                </div>
                                            )}

                                            {/* Video Codec Selection (Advanced) */}
                                            {options.format === 'video' && (
                                                <div className="p-3 rounded-xl border bg-transparent border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Cpu className="w-4 h-4 text-emerald-400" />
                                                        <span className="text-xs font-bold uppercase text-emerald-400">{t.video_codec || "Video Codec"}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['auto', 'h264', 'av1', 'vp9', 'hevc'].map((c) => {
                                                            const isAvailableOnServer = availableVideoCodecs?.includes(c) || c === 'auto';

                                                            // Safety Guard: Container Compatibility
                                                            let isCompatible = true
                                                            if (c !== 'auto') {
                                                                if (options.container === 'mov') {
                                                                    // Apple safe: H.264, HEVC (ProRes not implemented yet)
                                                                    isCompatible = ['h264', 'hevc'].includes(c)
                                                                } else if (options.container === 'webm') {
                                                                    // Web safe: VP9, AV1
                                                                    isCompatible = ['vp9', 'av1'].includes(c)
                                                                } else if (options.container === 'mp4') {
                                                                    // MP4 mostly H.264/HEVC. AV1 is new but getting there. VP9 is risky in MP4.
                                                                    isCompatible = ['h264', 'hevc', 'av1'].includes(c)
                                                                }
                                                            }

                                                            const isDisabled = !isAvailableOnServer || !isCompatible

                                                            return (
                                                                <button
                                                                    key={c}
                                                                    type="button"
                                                                    onClick={() => setters.setVideoCodec(c)}
                                                                    disabled={isDisabled}
                                                                    title={!isCompatible ? `Not supported in .${options.container} container` : !isAvailableOnServer ? "Not available for this video" : ""}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                                                                        options.videoCodec === c
                                                                            ? "bg-emerald-500 text-white border-emerald-400 shadow-sm ring-1 ring-emerald-400/50"
                                                                            : !isDisabled
                                                                                ? "bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                                                                                : "opacity-40 cursor-not-allowed bg-secondary/10 text-muted-foreground/50 border-transparent border-dashed"
                                                                    )}
                                                                >
                                                                    {c.toUpperCase()}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                    {options.videoCodec !== 'auto' && options.videoCodec !== 'h264' && (
                                                        <div className="flex items-start gap-2 text-[10px] text-yellow-500/80 bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                                                            <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                                            <span>{t.codec_warning || "Some codecs may not play on older devices. H264 is safest."}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Full width items */}
                                        <div className="space-y-3 mt-3">
                                            {/* Expandable Group: Schedule & Subtitles */}
                                            <div className="flex flex-col gap-0 border rounded-xl border-white/5 bg-transparent overflow-hidden transition-all">
                                                <div onClick={() => setters.setIsScheduled(!options.isScheduled)} className={cn("flex items-center justify-between p-3 cursor-pointer transition-all min-h-[64px]", options.isScheduled ? "bg-orange-500/10" : "hover:bg-white/5")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("p-1.5 rounded-lg", options.isScheduled ? "bg-orange-500 text-white" : "bg-white/10 text-muted-foreground")}><Calendar className="w-4 h-4" /></div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-[0.93rem] leading-none truncate">{t.schedule_download}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5 opacity-80 break-words line-clamp-1">{t.schedule_desc || "Start task automatically at a later time"}</div>
                                                        </div>
                                                    </div>
                                                    <Switch checked={options.isScheduled} onCheckedChange={setters.setIsScheduled} className="data-[state=checked]:bg-orange-500 scale-90" />
                                                </div>

                                                <AnimatePresence>
                                                    {options.isScheduled && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden bg-black/20 border-t border-white/5"
                                                        >
                                                            <div className="p-3 space-y-3">
                                                                <div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-400">
                                                                    <Clock className="w-3 h-3" /> {t.schedule_time}
                                                                </div>
                                                                <CustomDateTimePicker
                                                                    value={options.scheduleTime}
                                                                    onChange={setters.setScheduleTime}
                                                                    t={t}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {options.format !== 'audio' && options.format !== 'gif' && (
                                                <div className="flex flex-col gap-0 border rounded-xl border-white/5 bg-transparent overflow-hidden transition-all">
                                                    <div onClick={async () => {
                                                        const newVal = !options.subtitles;
                                                        setters.setSubtitles(newVal);
                                                        if (newVal) {
                                                            const { notify } = await import('../../lib/notify');
                                                            notify.info(t.subtitle_safe_mode_title || "Safe Mode Active", {
                                                                description: t.subtitle_safe_mode_desc || "Subtitle downloads are slowed down to prevent YouTube blocking (HTTP 429)."
                                                            });
                                                        }
                                                    }} className={cn("flex items-center justify-between p-3 cursor-pointer transition-all min-h-[64px]", options.subtitles ? "bg-purple-500/10" : "hover:bg-white/5")}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-1.5 rounded-lg", options.subtitles ? "bg-purple-500 text-white" : "bg-white/10 text-muted-foreground")}><MessageSquare className="w-4 h-4" /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-[0.93rem] leading-none truncate">{t.subtitles_title}</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5 opacity-80 break-words line-clamp-1">{meta?.hasSubtitles === false ? "Not available" : t.subtitles_desc || "Embed or download subtitles"}</div>
                                                            </div>
                                                        </div>
                                                        <Switch checked={options.subtitles} onCheckedChange={setters.setSubtitles} disabled={meta?.hasSubtitles === false} className="data-[state=checked]:bg-purple-500 scale-90" />
                                                    </div>

                                                    <AnimatePresence>
                                                        {options.subtitles && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden bg-black/20 border-t border-white/5"
                                                            >
                                                                <div className="p-3 space-y-3">
                                                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-purple-400">
                                                                        <MessageSquare className="w-3 h-3" /> {t.subtitle_settings}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {(availableLanguages || []).map((lang: any) => (
                                                                                <button
                                                                                    key={lang.id}
                                                                                    type="button"
                                                                                    onClick={() => setters.setSubtitleLang(lang.id)}
                                                                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                                                                        options.subtitleLang === lang.id
                                                                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm"
                                                                                            : "bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                                                                    )}
                                                                                >
                                                                                    {lang.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <label className="flex items-center gap-3 cursor-pointer group p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 -ml-2 transition-all">
                                                                            <div className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shadow-sm", options.embedSubtitles ? "bg-purple-500 border-purple-500 shadow-purple-500/20" : "border-white/20 bg-black/20")}>
                                                                                {options.embedSubtitles && <Subtitles className="w-4 h-4 text-white" />}
                                                                            </div>
                                                                            <input type="checkbox" checked={options.embedSubtitles} onChange={e => setters.setEmbedSubtitles(e.target.checked)} className="hidden" />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-medium text-foreground">{t.embed_subs}</span>
                                                                                <span className="text-[0.65rem] text-muted-foreground opacity-70">Save subtitle inside video file</span>
                                                                            </div>
                                                                        </label>

                                                                        {!options.embedSubtitles && (
                                                                            <div className="flex items-center gap-2 pl-1 animate-in slide-in-from-top-1">
                                                                                <span className="text-xs font-bold text-muted-foreground uppercase">Convert:</span>
                                                                                <div className="flex gap-1">
                                                                                    {[
                                                                                        { id: undefined, label: 'Original' },
                                                                                        { id: 'srt', label: 'SRT' },
                                                                                        { id: 'ass', label: 'ASS' },
                                                                                    ].map(fmt => (
                                                                                        <button
                                                                                            key={fmt.id || 'orig'}
                                                                                            type="button"
                                                                                            onClick={() => setters.setSubtitleFormat(fmt.id)}
                                                                                            className={cn("px-2 py-1 rounded text-xs font-medium border transition-colors",
                                                                                                options.subtitleFormat === fmt.id
                                                                                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                                                                                                    : "bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground"
                                                                                            )}
                                                                                        >
                                                                                            {fmt.label}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

