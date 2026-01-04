
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Download, Plus, Settings, HardDrive, AlertCircle, FileText, MessageSquare, Subtitles, Calendar, Clock } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { downloadDir } from '@tauri-apps/api/path'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { translations } from '../lib/locales'
import { SelectDownloadType } from './SelectDownloadType'
import { Switch } from './Switch'
import { parseYtDlpJson } from '../lib/ytdlp'

// Sub-components
import { VideoPreview } from './add-dialog/VideoPreview'
import { UrlInput } from './add-dialog/UrlInput'
import { ClipSection, parseTime } from './add-dialog/ClipSection'
import { CustomDateTimePicker } from './CustomDateTimePicker'

interface AddDialogProps {
    addTask: (url: string, opts: any) => any
    initialUrl?: string
    previewLang?: string | null
}

export type AddDialogHandle = {
    showModal: () => void
    close: () => void
}

export const AddDialog = forwardRef<AddDialogHandle, AddDialogProps>(({ addTask, initialUrl, previewLang }, ref) => {
    const { settings } = useAppStore()
    const t = translations[(previewLang ?? settings.language) as keyof typeof translations].dialog

    const [url, setUrl] = useState('')
    const [format, setFormat] = useState('Best')
    const [path, setPath] = useState('')
    const [rangeStart, setRangeStart] = useState('')
    const [rangeEnd, setRangeEnd] = useState('')
    const [sponsorBlock, setSponsorBlock] = useState(false)
    const [customFilename, setCustomFilename] = useState('')
    const [batchMode, setBatchMode] = useState(false)
    const [audioBitrate, setAudioBitrate] = useState('192') // kbps
    const [subtitles, setSubtitles] = useState(false)
    const [subtitleLang, setSubtitleLang] = useState('en')
    const [embedSubtitles, setEmbedSubtitles] = useState(true)
    const [isScheduled, setIsScheduled] = useState(false)
    const [scheduleTime, setScheduleTime] = useState('')
    const [videoCodec, setVideoCodec] = useState<'auto' | 'av1' | 'h264'>('auto')

    const [container, setContainer] = useState<string>(settings.container || 'mp4')
    
    // Auto-paste initial URL
    useEffect(() => {
        if(initialUrl) setUrl(initialUrl)
    }, [initialUrl])

    // Metadata State
    const [meta, setMeta] = useState<{ title: string, thumbnail: string, duration?: number, filesize_approx?: number, formats?: any[] } | null>(null)
    const [loadingMeta, setLoadingMeta] = useState(false)
    const [errorMeta, setErrorMeta] = useState(false)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Debounced Metadata Fetch
    useEffect(() => {
        if (!url || !url.startsWith('http')) {
            setMeta(null)
            setErrorMeta(false)
            return
        }

        if (debounceRef.current) clearTimeout(debounceRef.current)

        setLoadingMeta(true)
        setErrorMeta(false)

        debounceRef.current = setTimeout(async () => {
            try {
                // Use shared sidecar command factory
                const { getYtDlpCommand } = await import('../lib/ytdlp')
                const cmd = await getYtDlpCommand(['--dump-json', '--no-warnings', '--', url])
                const output = await cmd.execute()
                
                if (output.code === 0) {
                    const data = parseYtDlpJson(output.stdout)
                    setMeta({
                        title: data.title,
                        thumbnail: data.thumbnail,
                        duration: data.duration,
                        filesize_approx: data.filesize_approx || data.filesize,
                        formats: data.formats
                    })
                } else {
                    throw new Error(output.stderr)
                }
            } catch (e) {
                console.error("Metadata fetch failed", e)
                setErrorMeta(true)
                setMeta(null)
            } finally {
                setLoadingMeta(false)
            }
        }, 1000)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [url])

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    const [isOpen, setIsOpen] = useState(false)

    useImperativeHandle(ref, () => ({
        showModal: () => setIsOpen(true),
        close: () => setIsOpen(false)
    }))

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen])

    const [isClipping, setIsClipping] = useState(false)

    // Compute Available Resolutions (Dynamic Formats)
    const availableResolutions = meta?.formats ? (() => {
        const heights = meta.formats.map((f: any) => f.height).filter((h: any) => typeof h === 'number' && h > 0)
        return [...new Set(heights)].sort((a, b) => b - a) as number[]
    })() : undefined

    // Compute Available Audio Bitrates
    const availableAudioBitrates = meta?.formats ? (() => {
        const bitrates = meta.formats
            .filter((f: any) => f.acodec !== 'none' && f.abr)
            .map((f: any) => Math.round(f.abr))
        
        // Group into common buckets to avoid weird numbers like 127kbps
        const buckets = [64, 128, 192, 256, 320]
        const valid = bitrates.reduce((acc: number[], cur: number) => {
            // Find closest bucket
            const closest = buckets.reduce((prev, curr) => Math.abs(curr - cur) < Math.abs(prev - cur) ? curr : prev)
            if (!acc.includes(closest)) acc.push(closest)
            return acc
        }, [])
        
        return valid.sort((a: number, b: number) => b - a)
    })() : undefined

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        let savePath = path
        
        // Always Ask Where to Save: Show folder picker if enabled and no path manually selected
        if (settings.alwaysAskPath && !path) {
            const selectedPath = await openDialog({ directory: true, title: 'Choose Download Location' })
            if (selectedPath) {
                savePath = selectedPath
            } else {
                // User cancelled the dialog - don't proceed
                return
            }
        } else if (!savePath) {
            savePath = await downloadDir()
        }

        const start = isClipping ? rangeStart : ''
        const end = isClipping ? rangeEnd : ''
        
        // Parse URLs (batch mode: split by newlines)
        const urls = batchMode 
            ? url.split('\n').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http'))
            : [url.trim()]
        
        // Add each URL as a task
        for (const singleUrl of urls) {
            addTask(singleUrl, { 
                path: savePath,
                format,
                container,
                customFilename: urls.length > 1 ? undefined : customFilename, // Only use custom filename for single downloads
                rangeStart: isClipping ? start : undefined,
                rangeEnd: isClipping ? end : undefined,
                audioBitrate,
                
                // Add new options to task object
                removeSponsors: sponsorBlock,
                subtitles,
                subtitleLang: subtitles ? subtitleLang : undefined,
                embedSubtitles: subtitles ? embedSubtitles : false,
                videoCodec,
                scheduledTime: isScheduled && scheduleTime ? new Date(scheduleTime).toISOString() : undefined
            })
        }

        setIsOpen(false)
        resetForm()
    }

    const resetForm = () => {
        setUrl('')
        setMeta(null)
        setFormat('Best')
        setVideoCodec('auto')
        setContainer('mp4')
        setCustomFilename('')
        setRangeStart('')
        setRangeEnd('')
        setIsClipping(false)
        setIsScheduled(false)
        setScheduleTime('')
    }

    const browse = async () => {
        const p = await openDialog({ directory: true })
        if (p) setPath(p)
    }

    const handlePaste = async () => {
        try {
            const text = await readText();
            if (text) {
                setUrl(text);
                return;
            }
        } catch (e) {
            console.warn('Tauri clipboard failed, trying Web API', e);
        }
        
        try {
            const text = await navigator.clipboard.readText();
            if (text) setUrl(text);
        } catch (e) {
            console.error('All clipboard paste attempts failed', e);
        }
    }
    
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        className="glass-strong relative z-10 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
                    >
                        {/* Header / Preview */}
                        <VideoPreview loading={loadingMeta} meta={meta} error={errorMeta} t={t} />

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-background/40 backdrop-blur-md">
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-lg shadow-lg shadow-primary/20">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                                        {t.title}
                                    </h3>
                                </div>

                                <UrlInput 
                                    url={url} 
                                    onChange={setUrl} 
                                    onPaste={handlePaste} 
                                    t={t} 
                                    batchMode={batchMode}
                                    onBatchModeChange={setBatchMode}
                                />

                                {/* Custom Filename */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                        <FileText className="w-3 h-3 text-primary" />
                                        {t.filename_label}
                                    </label>
                                    <input 
                                        className="w-full p-3.5 rounded-xl bg-background dark:bg-black/20 border border-input dark:border-white/10 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 font-medium text-foreground"
                                        placeholder={meta?.title ? meta.title.replace(/[\\/:*?"<>|]/g, '_') : t.filename_placeholder}
                                        value={customFilename}
                                        onChange={e => setCustomFilename(e.target.value)}
                                    />
                                </div>

                                <SelectDownloadType
                                    format={format} setFormat={setFormat}
                                    container={container} setContainer={setContainer}
                                    availableResolutions={availableResolutions}
                                    availableAudioBitrates={availableAudioBitrates}
                                    audioBitrate={audioBitrate} setAudioBitrate={setAudioBitrate}
                                    codec={videoCodec} setCodec={setVideoCodec as any}
                                />

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t.folder_label}</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 p-3.5 rounded-xl bg-background dark:bg-black/20 border border-input dark:border-white/10 text-xs truncate font-mono text-muted-foreground" readOnly value={path || 'Downloads'} />
                                        <button type="button" onClick={browse} className="px-4 border border-input dark:border-white/10 bg-background dark:bg-white/5 rounded-xl hover:bg-secondary dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                                            <span className="mb-1 block text-lg font-bold">...</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t border-white/5">
                                    <div>
                                        <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                            <Settings className="w-3 h-3" /> {t.enhancements_label}
                                        </h4>
                                        
                                        {/* Enhancements Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* SponsorBlock Card */}
                                            <button 
                                                type="button"
                                                onClick={() => setSponsorBlock(!sponsorBlock)}
                                                className={`relative overflow-hidden group p-4 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-28 ${
                                                    sponsorBlock 
                                                        ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/50 shadow-lg shadow-red-500/10' 
                                                        : 'bg-card dark:bg-secondary/10 border-border dark:border-white/5 hover:border-primary/50 dark:hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={`p-2 rounded-lg ${sponsorBlock ? 'bg-red-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                                                        <AlertCircle className="w-4 h-4" />
                                                    </div>
                                                    <Switch checked={sponsorBlock} onCheckedChange={setSponsorBlock} className="data-[state=checked]:bg-red-500" />
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-sm ${sponsorBlock ? 'text-red-200' : 'text-foreground'}`}>{t.remove_sponsors}</div>
                                                    <div className="text-[10px] text-muted-foreground/60 leading-tight mt-1">
                                                        {t.remove_sponsors_desc}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Subtitles Card */}
                                            <button 
                                                type="button"
                                                onClick={() => setSubtitles(!subtitles)}
                                                className={`relative overflow-hidden group p-4 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-28 ${
                                                    subtitles
                                                        ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10' 
                                                        : 'bg-secondary/10 border-white/5 hover:bg-secondary/20 hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={`p-2 rounded-lg ${subtitles ? 'bg-purple-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                                                        <MessageSquare className="w-4 h-4" />
                                                    </div>
                                                    <Switch checked={subtitles} onCheckedChange={setSubtitles} className="data-[state=checked]:bg-purple-500" />
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-sm ${subtitles ? 'text-purple-200' : 'text-foreground'}`}>{t.subtitles_title}</div>
                                                    <div className="text-[10px] text-muted-foreground/60 leading-tight mt-1">
                                                        {t.subtitles_desc}
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            {/* Schedule Card Full Width */}
                                            <button 
                                                type="button"
                                                onClick={() => setIsScheduled(!isScheduled)}
                                                className={`col-span-1 sm:col-span-2 relative overflow-hidden group p-4 rounded-2xl border transition-all duration-300 text-left flex items-center gap-4 ${
                                                    isScheduled 
                                                        ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10' 
                                                        : 'bg-secondary/10 border-white/5 hover:bg-secondary/20 hover:border-white/10'
                                                }`}
                                            >
                                                <div className={`p-2.5 rounded-lg shrink-0 ${isScheduled ? 'bg-orange-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`font-bold text-sm ${isScheduled ? 'text-orange-200' : 'text-foreground'}`}>{t.schedule_download}</div>
                                                    <div className="text-[10px] text-muted-foreground/60 leading-tight">
                                                        {t.schedule_desc}
                                                    </div>
                                                </div>
                                                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} className="data-[state=checked]:bg-orange-500" />
                                            </button>
                                        </div>

                                        {/* Expandable Options for Subtitles & Scheduler */}
                                        <AnimatePresence>
                                            {(subtitles || isScheduled) && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-4 p-4 rounded-xl bg-muted/30 dark:bg-black/20 border border-border/50 dark:border-white/5 space-y-4">
                                                        {subtitles && (
                                                            <div className="space-y-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                                                                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-purple-400">
                                                                    <MessageSquare className="w-3 h-3" /> {t.subtitle_settings}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {[
                                                                            { id: 'en', label: 'English' },
                                                                            { id: 'id', label: 'Indonesian' },
                                                                            { id: 'auto', label: 'Auto' },
                                                                            { id: 'all', label: 'All' }
                                                                        ].map(lang => (
                                                                            <button
                                                                                key={lang.id}
                                                                                type="button"
                                                                                onClick={() => setSubtitleLang(lang.id)}
                                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                                                    subtitleLang === lang.id
                                                                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                                                                                        : 'bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground'
                                                                                }`}
                                                                            >
                                                                                {lang.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <label className="flex items-center gap-2.5 cursor-pointer group p-2 hover:bg-white/5 rounded-lg -ml-2 transition-colors">
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${embedSubtitles ? 'bg-purple-500 border-purple-500' : 'border-muted-foreground/30 bg-transparent'}`}>
                                                                            {embedSubtitles && <Subtitles className="w-3 h-3 text-white" />}
                                                                        </div>
                                                                        <input type="checkbox" checked={embedSubtitles} onChange={e => setEmbedSubtitles(e.target.checked)} className="hidden" />
                                                                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t.embed_subs}</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isScheduled && (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-orange-400">
                                                                    <Clock className="w-3 h-3" /> {t.schedule_time}
                                                                </div>
                                                                    <CustomDateTimePicker 
                                                                        value={scheduleTime} 
                                                                        onChange={setScheduleTime} 
                                                                        t={t}
                                                                    />
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        
                                    </div>

                                    <ClipSection 
                                        isClipping={isClipping} setIsClipping={setIsClipping}
                                        duration={meta?.duration}
                                        rangeStart={rangeStart} setRangeStart={setRangeStart}
                                        rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
                                        t={t}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-6 border-t border-white/10 bg-black/20 backdrop-blur-md shrink-0 gap-4 z-20">
                                <div className="flex-1 min-w-0">
                                    {(meta?.filesize_approx || meta?.formats) && (
                                        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Size</span>
                                            <div className="flex items-center gap-2 text-sm font-mono font-medium text-foreground">
                                                <HardDrive className="w-3.5 h-3.5 text-primary" />
                                                {(() => {
                                                    const total = meta.duration || 1
                                                    let ratio = 1
                                                    if (isClipping) {
                                                        const s = parseTime(rangeStart)
                                                        const e = rangeEnd ? parseTime(rangeEnd) : total
                                                        const duration = Math.max(0, Math.min(e, total) - Math.max(0, s))
                                                        ratio = duration / total
                                                    }
                                                    
                                                    // Calculate size based on selected format
                                                    let baseSize = 0
                                                    
                                                    if (meta.formats) {
                                                        const audioFormats = meta.formats.filter((f: any) => f.acodec !== 'none' && f.vcodec === 'none')
                                                        const bestAudio = audioFormats.sort((a: any, b: any) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0]
                                                        const audioSize = bestAudio?.filesize || bestAudio?.filesize_approx || 0

                                                        if (format === 'audio') {
                                                            // Audio Only Logic (Dynamic Bitrate)
                                                            const targetBitrate = parseInt(audioBitrate) || 128
                                                            if (audioFormats.length > 0) {
                                                                const targetAudio = audioFormats.reduce((prev: any, curr: any) => 
                                                                    (Math.abs((curr.abr || 0) - targetBitrate) < Math.abs((prev.abr || 0) - targetBitrate) ? curr : prev)
                                                                )
                                                                baseSize = targetAudio?.filesize || targetAudio?.filesize_approx || audioSize
                                                            } else {
                                                                baseSize = audioSize
                                                            }
                                                        } else if (format === 'Best') {
                                                            // Best Video + Best Audio logic
                                                            const videoFormats = meta.formats.filter((f: any) => f.vcodec !== 'none') // Allow audio-only as fallback? No, Best usually implies video.
                                                            const bestVideo = videoFormats.sort((a: any, b: any) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0]
                                                            baseSize = (bestVideo?.filesize || bestVideo?.filesize_approx || 0) + audioSize
                                                        } else {
                                                            // Specific Resolution Logic
                                                            const targetHeight = parseInt(format) || 0
                                                            const videoFormats = meta.formats.filter((f: any) => 
                                                                f.height === targetHeight && f.vcodec !== 'none'
                                                            )
                                                            
                                                            if (videoFormats.length > 0) {
                                                                const bestVideo = videoFormats.sort((a: any, b: any) => 
                                                                    (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0)
                                                                )[0]
                                                                baseSize = (bestVideo?.filesize || bestVideo?.filesize_approx || 0) + audioSize
                                                            } else {
                                                                // Fallback if specific resolution not found (shouldn't happen with valid props)
                                                                baseSize = meta.filesize_approx || 0
                                                            }
                                                        } 
                                                    } else {
                                                        baseSize = meta.filesize_approx || 0
                                                    }
                                                    
                                                    const estimatedSize = baseSize * ratio
                                                    return formatFileSize(estimatedSize || 0)
                                                })()}
                                                {isClipping && <span className="text-orange-500 text-[10px] font-bold px-1.5 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">TRIMMED</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsOpen(false)} className="px-6 py-3 hover:bg-secondary/50 rounded-xl font-medium transition-colors text-sm text-muted-foreground hover:text-foreground">{t.cancel}</button>
                                    <button 
                                        type="submit" 
                                        disabled={!url || (isClipping && !!rangeStart && !!rangeEnd && parseTime(rangeStart) >= parseTime(rangeEnd))} 
                                        className="relative overflow-hidden group px-8 py-3 bg-gradient-to-br from-primary to-blue-600 text-white rounded-xl shadow-lg shadow-primary/25 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 transform active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                        <Download className="w-4 h-4" />
                                        {t.download}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
})
AddDialog.displayName = 'AddDialog'
