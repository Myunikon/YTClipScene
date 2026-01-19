import { translations } from './lib/locales'

// Standard yt-dlp Format Object
export interface YtFormat {
    format_id: string
    format_note?: string
    ext: string
    acodec?: string
    vcodec?: string
    url: string
    width?: number
    height?: number
    filesize?: number
    filesize_approx?: number
    fps?: number
    abr?: number // Audio Bitrate
    tbr?: number // Total Bitrate
}

// Subtitle Track Info
export interface YtSubtitle {
    ext: string
    url: string
    name?: string
}

// Extracted Metadata
export interface VideoMeta {
    id?: string
    title: string
    thumbnail: string
    duration?: number
    uploader?: string
    description?: string
    view_count?: number
    upload_date?: string
    formats?: YtFormat[]
    subtitles?: Record<string, YtSubtitle[]>
    automatic_captions?: Record<string, YtSubtitle[]>
    hasSubtitles?: boolean
    filesize_approx?: number
    chapters?: any[]
    is_live?: boolean
}

// Type for Translations (Inferred from English locale)
export type AppTranslations = typeof translations['en']

// Grouped Dialog Options State
export interface DialogOptions {
    format: string
    container: string
    path: string
    customFilename: string
    // Audio
    audioBitrate: string
    audioFormat: string
    audioNormalization: boolean
    // Video
    videoCodec: 'auto' | 'av1' | 'h264' | 'hevc' | 'vp9'
    // Enhancements
    sponsorBlock: boolean
    splitChapters: boolean
    // Subtitles
    subtitles: boolean
    subtitleLang: string
    subtitleFormat: string | undefined
    embedSubtitles: boolean
    // Scheduling
    isScheduled: boolean
    scheduleTime: string
    // Batch
    batchMode: boolean
    // Clipping
    isClipping: boolean
    rangeStart: string
    rangeEnd: string
    // GIF Options
    gifFps: number
    gifScale: number // Represents height (e.g. 480)
    gifQuality: 'high' | 'fast'
}

// Setters corresponding to DialogOptions (for Context or Prop Grouping)
export interface DialogOptionSetters {
    setFormat: (v: string) => void
    setContainer: (v: string) => void
    setPath: (v: string) => void
    setCustomFilename: (v: string) => void
    setAudioBitrate: (v: string) => void
    setAudioFormat: (v: string) => void
    setAudioNormalization: (v: boolean) => void
    setVideoCodec: (v: any) => void
    setSponsorBlock: (v: boolean) => void
    setSplitChapters: (v: boolean) => void
    setSubtitles: (v: boolean) => void
    setSubtitleLang: (v: string) => void
    setSubtitleFormat: (v: string | undefined) => void
    setEmbedSubtitles: (v: boolean) => void
    setIsScheduled: (v: boolean) => void
    setScheduleTime: (v: string) => void
    setBatchMode: (v: boolean) => void
    setIsClipping: (v: boolean) => void
    setRangeStart: (v: string) => void
    setRangeEnd: (v: string) => void
    setGifFps: (v: number) => void
    setGifScale: (v: number) => void
    setGifQuality: (v: 'high' | 'fast') => void
}
