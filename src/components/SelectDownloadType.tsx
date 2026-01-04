import { useState, useEffect } from 'react'
import { Zap, Monitor, Music, Film, Smartphone, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { translations } from '../lib/locales'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

interface SelectDownloadTypeProps {
    format: string
    setFormat: (fmt: string) => void
    container: string
    setContainer: (fmt: string) => void
    availableResolutions?: number[]
    availableAudioBitrates?: number[]
    audioBitrate?: string
    setAudioBitrate?: (bitrate: string) => void
    codec?: string
    setCodec?: (codec: string) => void
}

export function SelectDownloadType({ 
    format, setFormat, 
    container, setContainer, 
    availableResolutions, 
    availableAudioBitrates,
    audioBitrate = '192', setAudioBitrate,
    codec = 'auto', setCodec
}: SelectDownloadTypeProps) {
    const { settings } = useAppStore()
    const t = translations[settings.language].dialog

    const [mode, setMode] = useState<'video' | 'audio'>('video')
    
    // Sync mode with current format
    useEffect(() => {
        if (format === 'audio') setMode('audio')
        else setMode('video')
    }, [format]) 
    
    const handleTabChange = (m: 'video' | 'audio') => {
        setMode(m)
        if (m === 'audio') {
            setFormat('audio') 
        } else {
            if (format === 'audio') setFormat('Best') 
        }
    }

    const videoFormats = (availableResolutions && availableResolutions.length > 0)
        ? [
            { value: 'Best', label: t.formats.best, icon: Sparkles, desc: t.quality_profiles.highest_quality },
            ...availableResolutions.map(h => {
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

    // Use dynamic bitrates if available, otherwise static list
    const audioFormats = (availableAudioBitrates && availableAudioBitrates.length > 0)
        ? availableAudioBitrates.map(rate => {
            let desc = t.quality_profiles.standard
            if (rate >= 256) desc = t.quality_profiles.highest_quality
            if (rate <= 64) desc = t.quality_profiles.data_saver // Reusing data saver for low quality
            
            return { value: rate.toString(), label: `${rate} kbps`, desc}
        })
        : [
            { value: '320', label: '320 kbps', desc: t.quality_profiles.highest_quality },
            { value: '256', label: '256 kbps', desc: t.quality_profiles.highest_quality },
            { value: '192', label: '192 kbps', desc: t.quality_profiles.standard },
            { value: '128', label: '128 kbps', desc: t.quality_profiles.data_saver },
        ]

    return (
        <div className="space-y-4">
            
            {/* Format Type Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                <button
                    type="button"
                    onClick={() => handleTabChange('video')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10",
                        mode === 'video' 
                            ? "text-primary-foreground shadow-lg shadow-primary/20" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {mode === 'video' && (
                        <motion.div 
                            layoutId="active-tab"
                            className="absolute inset-0 bg-primary rounded-lg -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <Monitor className="w-4 h-4" /> Video
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('audio')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10",
                        mode === 'audio' 
                            ? "text-white shadow-lg shadow-blue-600/20" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                     {mode === 'audio' && (
                        <motion.div 
                            layoutId="active-tab"
                            className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <Music className="w-4 h-4" /> Audio
                </button>
            </div>

            <AnimatePresence mode="wait">
                {mode === 'video' ? (
                    <motion.div
                        key="video"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold uppercase text-muted-foreground tracking-wider">{t.labels.quality_profile}</label>
                            
                            {/* Container Selector - Now Inline */}
                            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                                <span className="text-xs uppercase font-bold text-muted-foreground pl-2 pr-1">{t.labels.fmt}</span>
                                {['mp4', 'mkv', 'webm'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setContainer(c)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors",
                                            container === c 
                                                ? "bg-white/10 text-white shadow-sm" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                        )}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {videoFormats.map((f) => {
                                const Icon = f.icon
                                const isSelected = format === f.value
                                
                                return (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setFormat(f.value)}
                                        className={cn(
                                            "relative group flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 h-[84px]",
                                            isSelected 
                                                ? "bg-white/5 border-primary/50 ring-1 ring-primary/50" 
                                                : "bg-transparent border-white/10 hover:bg-white/5 hover:scale-[1.02]"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary" />
                                        )}
                                        
                                        <Icon className={cn("w-5 h-5 mb-auto", isSelected ? "text-primary" : "text-muted-foreground")} />
                                        
                                        <div>
                                            <div className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                                {f.label}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/60 font-medium">
                                                {f.desc}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Codec Selector */}
                        <div className="pt-2">
                            <label className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-2 block">{(t.labels as any).codec || "Codec Preference"}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'auto', label: 'Auto (Best)', desc: 'Highest Quality' },
                                    { id: 'h264', label: 'H.264', desc: 'Max Compatibility' },
                                    { id: 'av1', label: 'AV1 / VP9', desc: 'Max Efficiency' }
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCodec && setCodec(c.id)}
                                        className={cn(
                                            "flex flex-col items-center p-2 rounded-lg border transition-all duration-200 text-center",
                                            codec === c.id
                                                ? "bg-white/5 border-primary/50 ring-1 ring-primary/50 text-foreground" 
                                                : "bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground"
                                        )}
                                    >
                                        <div className="font-bold text-xs mb-0.5">{c.label}</div>
                                        <div className="text-[9px] opacity-70">{c.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                ) : (
                    <motion.div
                        key="audio"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 mb-4 flex items-start gap-4">
                            <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="font-bold text-base text-blue-200 mb-1">{t.audio_extraction.title}</div>
                                <div className="text-xs text-muted-foreground/80 leading-relaxed">
                                    {availableAudioBitrates && availableAudioBitrates.length > 0 
                                        ? t.audio_extraction.desc_auto 
                                        : t.audio_extraction.desc_manual}
                                </div>
                            </div>
                        </div>

                        <label className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-2 block">{t.labels.bitrate_quality}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {audioFormats.map((f) => {
                                const isSelected = audioBitrate === f.value
                                return (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setAudioBitrate && setAudioBitrate(f.value)}
                                        className={cn(
                                            "relative flex items-center p-3 rounded-xl border text-left transition-all duration-200 gap-3",
                                            isSelected 
                                                ? "bg-white/5 border-blue-500/50 ring-1 ring-blue-500/50" 
                                                : "bg-transparent border-white/10 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-muted-foreground"
                                        )}>
                                            <Music className="w-4 h-4" />
                                        </div>
                                        
                                        <div>
                                            <div className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                                {f.label}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/60 font-medium">
                                                {f.desc}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
