import { useState, useEffect, useRef, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { downloadDir } from '@tauri-apps/api/path'
import { useAppStore } from '../../store'
import { translations } from '../../lib/locales'
import { notify } from '../../lib/notify'
import { parseYtDlpJson } from '../../lib/ytdlp'
import { parseTime } from '../../lib/utils'
import { VideoMeta, DialogOptions, DialogOptionSetters } from '../../types'

interface UseAddDialogProps {
    addTask: (url: string, opts: any) => any
    initialUrl?: string
    previewLang?: string | null
    isOffline?: boolean
}

export function useAddDialog({ addTask, initialUrl, previewLang }: UseAddDialogProps) {
    const { settings } = useAppStore()
    const t = translations[(previewLang ?? settings.language) as keyof typeof translations].dialog

    const [isOpen, setIsOpen] = useState(false)
    const [url, setUrl] = useState('')

    // Grouped Option State
    // Always start with Video mode (Best) regardless of last used format
    const [format, setFormat] = useState('Best')
    const [path, setPath] = useState(
        settings.lastDownloadOptions?.path ||
        settings.downloadPath ||
        ''
    )
    const [rangeStart, setRangeStart] = useState('')
    const [rangeEnd, setRangeEnd] = useState('')
    const [sponsorBlock, setSponsorBlock] = useState(false)
    const [customFilename, setCustomFilename] = useState('')
    const [batchMode, setBatchMode] = useState(false)
    const [audioBitrate, setAudioBitrate] = useState('192') // kbps
    const [audioFormat, setAudioFormat] = useState('mp3')
    const [subtitles, setSubtitles] = useState(false)
    const [subtitleLang, setSubtitleLang] = useState('auto')
    const [subtitleFormat, setSubtitleFormat] = useState<string | undefined>(undefined)
    const [embedSubtitles, setEmbedSubtitles] = useState(true)
    const [isScheduled, setIsScheduled] = useState(false)
    const [scheduleTime, setScheduleTime] = useState('')
    const [videoCodec, setVideoCodec] = useState<'auto' | 'av1' | 'h264'>('auto')
    const [splitChapters, setSplitChapters] = useState(false)
    const [container, setContainer] = useState<string>(
        settings.lastDownloadOptions?.container ||
        settings.container ||
        'mp4'
    )
    const [audioNormalization, setAudioNormalization] = useState(settings.audioNormalization)
    const [isClipping, setIsClipping] = useState(false)

    // GIF Options State
    const [gifFps, setGifFps] = useState(15)
    const [gifScale, setGifScale] = useState(480)
    const [gifQuality, setGifQuality] = useState<'high' | 'fast'>('fast')

    // Construct Options Object to avoid prop drilling
    const options: DialogOptions = {
        format, container, path, customFilename,
        audioBitrate, audioFormat, audioNormalization,
        videoCodec,
        sponsorBlock, splitChapters,
        subtitles, subtitleLang, subtitleFormat, embedSubtitles,
        isScheduled, scheduleTime,
        batchMode,
        isClipping, rangeStart, rangeEnd,
        gifFps, gifScale, gifQuality
    }

    const setters: DialogOptionSetters = {
        setFormat, setContainer, setPath, setCustomFilename,
        setAudioBitrate, setAudioFormat, setAudioNormalization,
        setVideoCodec,
        setSponsorBlock, setSplitChapters,
        setSubtitles, setSubtitleLang, setSubtitleFormat, setEmbedSubtitles,
        setIsScheduled, setScheduleTime,
        setBatchMode,
        setIsClipping, setRangeStart, setRangeEnd,
        setGifFps, setGifScale, setGifQuality
    }

    // Auto-paste initial URL
    useEffect(() => {
        if (initialUrl) setUrl(initialUrl)
    }, [initialUrl])

    // Metadata State
    const [meta, setMeta] = useState<VideoMeta | null>(null)
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
                const { getYtDlpCommand } = await import('../../lib/ytdlp')
                const cmd = await getYtDlpCommand(['--dump-json', '--no-warnings', '--', url])
                const output = await cmd.execute()

                if (output.code === 0) {
                    const data = parseYtDlpJson(output.stdout)
                    setMeta(data)
                } else {
                    throw new Error(output.stderr)
                }
            } catch (e: any) {
                console.error("Metadata fetch failed", e)
                notify.error("Failed to fetch video info", { description: e?.message || "Check URL and connection" })
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

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen])

    // Auto-enable Trim for GIFs to prevent huge files
    useEffect(() => {
        if (format === 'gif') {
            setIsClipping(true)
        }
    }, [format])

    // Safety Guard: Mutually Exclusive clipping & sponsor block
    // Clipping relies on absolute timeline, SponsorBlock modifies it which breaks sync.
    useEffect(() => {
        if (isClipping) {
            setSponsorBlock(false)
        }
    }, [isClipping])

    // Safety Guard: Reset Codec when Container changes
    // This prevents incompatible codecs (e.g. VP9) remaining selected when switching to strict containers (e.g. MOV)
    useEffect(() => {
        setVideoCodec('auto')
    }, [container])


    // Compute Available Resolutions (Dynamic Formats)
    const availableResolutions = useMemo(() => {
        if (!meta?.formats) return undefined
        const heights = meta.formats.map((f: any) => f.height).filter((h: any) => typeof h === 'number' && h > 0)
        return [...new Set(heights)].sort((a, b) => b - a) as number[]
    }, [meta])

    // Compute Available Audio Bitrates
    const availableAudioBitrates = useMemo(() => {
        if (!meta?.formats) return undefined
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
    }, [meta])

    // Compute Available Video Codecs
    const availableVideoCodecs = useMemo(() => {
        if (!meta?.formats) return undefined
        const codecs = new Set<string>()

        meta.formats.forEach((f: any) => {
            if (!f.vcodec || f.vcodec === 'none') return

            const v = f.vcodec.toLowerCase()

            if (v.startsWith('avc1') || v.startsWith('h264')) codecs.add('h264')
            else if (v.startsWith('vp9')) codecs.add('vp9')
            else if (v.startsWith('av01')) codecs.add('av1')
            else if (v.startsWith('hev1') || v.startsWith('hvc1') || v.startsWith('hevc')) codecs.add('hevc')
        })

        return Array.from(codecs)
    }, [meta])

    // Compute Available Audio Codecs
    const availableAudioCodecs = useMemo(() => {
        if (!meta?.formats) return undefined
        const codecs = new Set<string>()

        meta.formats.forEach((f: any) => {
            if (!f.acodec || f.acodec === 'none') return

            const a = f.acodec.toLowerCase()
            if (a.startsWith('mp4a')) codecs.add('m4a')
            else if (a.includes('opus')) codecs.add('opus')
            else if (a.includes('vorbis')) codecs.add('ogg')
            else if (a.includes('flac')) codecs.add('flac')
            else if (a.includes('wav')) codecs.add('wav')
        })

        return Array.from(codecs)
    }, [meta])

    // Dynamic Subtitle Languages
    const availableLanguages = useMemo(() => {
        const list = []
        const m = meta as any

        // 1. Check Auto Captions
        if (m?.automatic_captions && Object.keys(m.automatic_captions).length > 0) {
            list.push({ id: 'auto', label: 'Auto (AI)' })
        }

        // 2. Check Manual Subtitles
        if (m?.subtitles && Object.keys(m.subtitles).length > 0) {
            // Extract distinct languages from manual subtitles
            const realLangs = Object.keys(m.subtitles).map(code => {
                const info = m.subtitles[code]
                const name = info && info[0] && info[0].name ? info[0].name : code.toUpperCase()
                return { id: code, label: name }
            })
            realLangs.sort((a, b) => a.label.localeCompare(b.label))
            list.push(...realLangs)

            // Add 'All' if we have manual subs
            list.push({ id: 'all', label: 'All' })
        }

        return list
    }, [meta])

    // Memoize Estimated Size Calculation to prevent re-renders in View
    const estimatedSize = useMemo(() => {
        if (!meta?.filesize_approx && !meta?.formats) return 0

        const total = meta.duration || 1
        let ratio = 1
        if (isClipping) {
            const s = parseTime(rangeStart)
            const e = rangeEnd ? parseTime(rangeEnd) : total
            const duration = Math.max(0, Math.min(e, total) - Math.max(0, s))
            ratio = duration / total
        }

        let baseSize = 0
        if (meta.formats) {
            const audioFormats = meta.formats.filter((f: any) => f.acodec !== 'none' && f.vcodec === 'none')
            const bestAudio = audioFormats.sort((a: any, b: any) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0]
            const audioSize = bestAudio?.filesize || bestAudio?.filesize_approx || 0

            if (format === 'audio') {
                const targetBitrate = parseInt(audioBitrate) || 128
                if (audioFormats.length > 0) {
                    const targetAudio = audioFormats.reduce((prev: any, curr: any) =>
                        (Math.abs((curr.abr || 0) - targetBitrate) < Math.abs((prev.abr || 0) - targetBitrate) ? curr : prev)
                    )
                    baseSize = targetAudio?.filesize || targetAudio?.filesize_approx || audioSize
                } else {
                    baseSize = audioSize
                }
            } else if (format === 'gif') {
                // GIF Logic: Estimate based on Resolution & FPS & Duration
                // Rule of thumb: 480p 15fps GIF is roughly 0.5MB per second?
                // Very rough, but better than 1.5x video size
                const h = gifScale || (meta as any).height || 480
                const fps = gifFps || 15
                // Base factor: 480p @ 15fps ~ 4Mbit/s ~ 0.5MB/s
                const baseFactor = (h / 480) * (fps / 15) * 0.5 * 1024 * 1024

                // We'll multiply this by duration (which is handled by ratio * total) later
                // So here we set baseSize as "Total Projected Size if Full Duration"
                baseSize = baseFactor * total
            } else if (format === 'Best') {
                const videoFormats = meta.formats.filter((f: any) => f.vcodec !== 'none')
                const bestVideo = videoFormats.sort((a: any, b: any) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0]
                baseSize = (bestVideo?.filesize || bestVideo?.filesize_approx || 0) + audioSize
            } else {
                const targetHeight = parseInt(format) || 0
                const videoFormats = meta.formats.filter((f: any) => f.height === targetHeight && f.vcodec !== 'none')
                if (videoFormats.length > 0) {
                    const bestVideo = videoFormats.sort((a: any, b: any) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0]
                    baseSize = (bestVideo?.filesize || bestVideo?.filesize_approx || 0) + audioSize
                } else {
                    baseSize = meta.filesize_approx || 0
                }
            }
        } else {
            baseSize = meta.filesize_approx || 0
        }

        return baseSize * ratio
    }, [meta, format, audioBitrate, isClipping, rangeStart, rangeEnd, gifScale, gifFps])

    const resetForm = () => {
        setUrl('')
        setMeta(null)
        setFormat('Best')
        setVideoCodec('auto')
        setContainer('mp4')
        setCustomFilename('')
        setRangeStart('')
        setRangeEnd('')
        setIsScheduled(false)
        setScheduleTime('')
        setGifFps(15)
        setGifScale(480)
        setGifQuality('fast')
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        let savePath = path

        // Always Ask Where to Save
        if (settings.alwaysAskPath && !path) {
            const selectedPath = await openDialog({ directory: true, title: 'Choose Download Location' })
            if (selectedPath) {
                savePath = selectedPath
            } else {
                return
            }
        } else if (!savePath) {
            savePath = await downloadDir()
        }

        const start = isClipping ? rangeStart : ''
        const end = isClipping ? rangeEnd : ''

        const urls = batchMode
            ? url.split('\n').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http'))
            : [url.trim()]

        for (const singleUrl of urls) {
            addTask(singleUrl, {
                path: savePath,
                format,
                container,
                customFilename: urls.length > 1 ? undefined : customFilename,
                rangeStart: isClipping ? start : undefined,
                rangeEnd: isClipping ? end : undefined,
                audioBitrate,
                audioFormat,

                removeSponsors: sponsorBlock,
                subtitles,
                subtitleLang: subtitles ? subtitleLang : undefined,
                subtitleFormat: subtitles ? subtitleFormat : undefined,
                embedSubtitles: subtitles ? embedSubtitles : false,
                videoCodec,
                forceTranscode: videoCodec !== 'auto' && availableVideoCodecs && !availableVideoCodecs.includes(videoCodec),
                splitChapters,
                scheduledTime: isScheduled && scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
                audioNormalization,
                gifFps: format === 'gif' ? gifFps : undefined,
                gifScale: format === 'gif' ? gifScale : undefined,
                gifQuality: format === 'gif' ? gifQuality : undefined
            })
        }

        if (!batchMode && urls.length === 1) {
            const { setSetting } = useAppStore.getState()
            setSetting('lastDownloadOptions', {
                format,
                container,
                audioBitrate,
                removeSponsors: sponsorBlock,
                subtitles,
                subtitleLang: subtitles ? subtitleLang : undefined,
                embedSubtitles: subtitles ? embedSubtitles : false,
                videoCodec,
                path: savePath
            })
        }

        setIsOpen(false)
        resetForm()
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
            notify.error("Clipboard access denied or empty");
        }
    }

    const quickDownload = async (targetUrl: string) => {
        if (!settings.quickDownloadEnabled || !settings.lastDownloadOptions) {
            return false
        }

        const lastOpts = settings.lastDownloadOptions
        const savePath = lastOpts.path || settings.downloadPath || await downloadDir()

        addTask(targetUrl, {
            ...lastOpts,
            path: savePath,
            customFilename: undefined
        })

        return true
    }

    // Disk Space Check
    const [diskFreeSpace, setDiskFreeSpace] = useState<number | null>(null)

    useEffect(() => {
        if (!isOpen) return

        const checkDisk = async () => {
            try {
                // Fetch stats for the target drive
                const res: any = await invoke('get_system_stats', { downloadPath: path || '.' })
                if (res && typeof res.disk_free === 'number') {
                    setDiskFreeSpace(res.disk_free)
                }
            } catch (e) {
                // Silent fail is fine, we just won't warn
            }
        }

        checkDisk()
    }, [path, isOpen])

    const isDiskFull = !!(estimatedSize > 0 && diskFreeSpace !== null && estimatedSize > diskFreeSpace)

    return {
        isOpen, setIsOpen,
        url, setUrl,
        options, setters, // Return grouped props
        meta, loadingMeta, errorMeta,
        availableResolutions, availableAudioBitrates, availableVideoCodecs, availableAudioCodecs, availableLanguages,
        handleSubmit, resetForm, browse, handlePaste, quickDownload,
        t,
        formatFileSize,
        estimatedSize, // Return calculated size
        settings,
        isDiskFull,
        diskFreeSpace
    }
}
