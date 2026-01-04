import { AppSettings } from '../store/slices/types'
import { Command } from '@tauri-apps/plugin-shell'

export interface YtDlpOptions {
    path?: string
    rangeStart?: number | string
    rangeEnd?: number | string
    format?: string
    container?: string
}

export async function buildYtDlpArgs(
    url: string, 
    options: YtDlpOptions, 
    settings: AppSettings, 
    finalFilename: string
): Promise<string[]> {
    const args: string[] = [
        '-o', finalFilename, // Full path included in finalFilename
        '--newline', 
        '--no-colors',
        '--no-playlist',
        // CONCURRENT FRAGMENTS (Speed Boost)
        '-N', String(settings.concurrentFragments || 4),
        '--continue', // Force resume support
        // ANTI-THROTTLE: Emulate Android client which often has fewer speed restrictions
        '--extractor-args', 'youtube:player_client=android',
        '--socket-timeout', '30', // Refresh link if connection hangs/throttles for 30s
    ]

    const fmt = options.format || settings.resolution
    const container = options.container || settings.container || 'mp4'

    if (fmt === 'audio') {
        args.push('-x', '--audio-format', 'mp3')
        // Audio quality: 0 = best, 10 = worst. Convert kbps to quality level
        // 320K = ~0, 256K = ~1, 192K = ~2, 128K = ~5, 64K = ~9
        const bitrate = (options as any).audioBitrate || '192'
        const qualityMap: Record<string, string> = {
            '320': '0', '256': '1', '192': '2', '160': '3', '128': '5', '96': '7', '64': '9'
        }
        args.push('--audio-quality', qualityMap[bitrate] || '2')
    } else {
        let h = ''
        if (fmt !== 'Best' && fmt !== 'audio') {
            // If explicit resolution (360, 720, 1080, etc)
            h = `[height<=${fmt}]`
        }

        // Codec Logic
        const codec = (options as any).videoCodec || 'auto'
        let formatString = ''

        if (codec === 'h264') {
            // Force AVC/H.264 (Maximum Compatibility)
            formatString = `bestvideo${h}[vcodec^=avc]+bestaudio[ext=m4a]/best${h}[ext=mp4]/best`
        } else if (codec === 'av1') {
            // Prefer AV1 (High Efficiency)
            formatString = `bestvideo${h}[vcodec^=av01]+bestaudio/bestvideo${h}[vcodec^=vp9]+bestaudio/best`
        } else if (codec === 'vp9') {
            // Prefer VP9
            formatString = `bestvideo${h}[vcodec^=vp9]+bestaudio/best`
        } else {
            // Auto / Best (Default)
            formatString = `bestvideo${h}+bestaudio/best${h}/best`
        }

        args.push('-f', formatString)
        
        // MAGIC REMUX: Ensure output is always the desired container (mp4/mkv)
        args.push('--merge-output-format', container) 
    }

    // Clipping support using yt-dlp's native download-sections
    if (options.rangeStart || options.rangeEnd) {
        // Robustness: Sanitize input to prevent argument injection
        // Only allow numbers, dots, and colons (00:00:00 format or 123.45)
        const sanitizeTime = (t: string | number) => String(t).replace(/[^0-9:.]/g, '')

        const start = options.rangeStart ? sanitizeTime(options.rangeStart) : '0'
        const end = options.rangeEnd ? sanitizeTime(options.rangeEnd) : 'inf'
        
        args.push('--download-sections', `*${start}-${end}`)
        args.push('--force-keyframes-at-cuts') // Clean cuts

        // FIX: Incorrect Duration Metadata
        // Force ffmpeg downloader for smarter header rewriting
        args.push('--downloader', 'ffmpeg')
        
        // Ensure timestamps are reset to 0, metadata is cleaned, and moov atom is moved to front
        // -map_metadata 0 ensures metadata from the first input is mapped correctly (or dropped/reset if needed in this context to avoid stale duration)
        args.push('--postprocessor-args', 'ffmpeg:-movflags +faststart -avoid_negative_ts make_zero -map_metadata 0')
    }

    // Subtitle download support
    if ((options as any).subtitles) {
        const lang = (options as any).subtitleLang || 'en'
        const embedSubs = (options as any).embedSubtitles
        
        if (lang === 'all') {
            args.push('--write-subs', '--all-subs')
        } else if (lang === 'auto') {
            args.push('--write-auto-subs', '--sub-langs', 'en')
        } else {
            args.push('--write-subs', '--sub-langs', lang)
        }
        
        if (embedSubs && fmt !== 'audio') {
            args.push('--embed-subs')
        }
    }

    // SponsorBlock: Check BOTH per-task option (from dialog) and global setting
    const useSponsorBlockNow = (options as any).removeSponsors || settings.useSponsorBlock
    if (useSponsorBlockNow && settings.sponsorSegments.length > 0) {
        args.push('--sponsorblock-remove', settings.sponsorSegments.join(','))
    }

    if (settings.proxy) {
        // SECURITY: Prevent argument injection in proxy field
        if (settings.proxy.startsWith('-')) {
             throw new Error("Invalid Proxy: Cannot start with '-'")
        }
        args.push('--proxy', settings.proxy)
    }
    
    // Cookie Source logic (System Browser)
    if (settings.cookieSource === 'browser') {
        const targetBrowser = settings.browserType || 'chrome';
        args.push('--cookies-from-browser', targetBrowser)
    } else if (settings.cookieSource === 'txt' && settings.cookiePath) {
        args.push('--cookies', settings.cookiePath)
    }

    // Custom User-Agent (to avoid shadowbans)
    if (settings.userAgent && settings.userAgent.trim()) {
        const ua = settings.userAgent.trim()
        // SECURITY: Prevent argument injection in User-Agent
        if (ua.startsWith('-') || ua.includes('\n')) {
             console.warn("Invalid User-Agent detected (starts with - or contains newline), ignoring.")
        } else {
             args.push('--user-agent', ua)
        }
    }

    // Speed Limit (e.g. "5M", "500K")
    if (settings.speedLimit && settings.speedLimit.trim()) {
        const limit = settings.speedLimit.trim()
        // SECURITY: Prevent argument injection
        if (!limit.startsWith('-')) {
            args.push('--limit-rate', limit)
        }
    }

    // Embed Metadata (artist, title, etc. into file)
    // CRITICAL FIX: Disable metadata embedding for clips.
    // yt-dlp sees the original video duration (e.g. 20 min) and writes it to the file tags,
    // causing players to show "20:00" duration for a 10s clip.
    const isClipping = !!(options.rangeStart || options.rangeEnd)
    if (settings.embedMetadata && !isClipping) {
        args.push('--embed-metadata')
    }

    // Embed Thumbnail (cover art into file)
    // Embed Thumbnail (cover art into file)
    // FIX: Also disable thumbnail embedding for clips to prevent metadata/duration corruption
    if (settings.embedThumbnail && !isClipping) {
        args.push('--embed-thumbnail')
    }

    // URL must be LAST, after all options
    args.push('--', url)
    
    return args
}

export function parseMetadata(lines: string[]) {
    let streamUrls: string[] = []
    let needsMerging = false
    let meta: any = null

    for (const line of lines) {
        try {
            const json = JSON.parse(line)
            
            // Extract Stream URLs
            if (json.requested_formats) {
                streamUrls = json.requested_formats.map((f:any) => f.url)
                if (json.requested_formats.length > 1) needsMerging = true
            } else if (json.url) {
                streamUrls = [json.url]
            }

            // Extract Metadata using the best available object
            if (json.title && json.id) meta = json
        } catch (e) { }
    }

    if (!meta) meta = { title: 'Unknown_Video', ext: 'mp4', id: 'unknown' }

    return { streamUrls, needsMerging, meta }
}

export function sanitizeFilename(template: string, meta: any): string {
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').replace(/\.\./g, '').trim()
    
    let finalName = template
    finalName = finalName.replace(/{title}/g, meta.title || '')
    finalName = finalName.replace(/{ext}/g, meta.ext || 'mp4')
    finalName = finalName.replace(/{id}/g, meta.id || '')
    finalName = finalName.replace(/{uploader}/g, meta.uploader || 'Unknown')
    finalName = finalName.replace(/{width}/g, meta.width ? String(meta.width) : '')
    finalName = finalName.replace(/{height}/g, meta.height ? String(meta.height) : '')
    
    finalName = sanitize(finalName)
    if (!finalName.endsWith(`.${meta.ext}`)) {
        if(!finalName) finalName = sanitize(meta.title) + '.' + (meta.ext || 'mp4')
    }
    
    return finalName
}

// Sidecar-based Command Factory
export async function getYtDlpCommand(args: string[]) {
    // binDir is ignored in sidecar mode as Tauri handles paths
    return Command.sidecar('binaries/yt-dlp', args)
}

// Helper to get binary paths
export async function getBinaryPaths() {
    // STRICT PATH: C:\Users\ACER ID\AppData\Roaming\clipscene\binaries
    // Requested by user.
    const binDir = "C:\\Users\\ACER ID\\AppData\\Roaming\\clipscene\\binaries"
    
 
    
    return {
        binDir,
        // For Sidecar mode, these paths are less relevant for execution 
        // but might be used by UI checkers. 
        // We can't easily get the absolute path of a bundled sidecar at runtime in v2 
        // without resolving it via the sidecar API which abstracts it.
        // Returning dummy or expected locations.
        ytdlp: 'Managed by Sidecar',
        ffmpeg: 'Managed by Sidecar',
        ffprobe: 'Managed by Sidecar'
    }
}

export function parseYtDlpJson(stdout: string) {
    const lines = stdout.split('\n')
    let parsedData = null
    
    // Try parsing each line from bottom up (JSON is usually last)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        if (!line || !line.startsWith('{')) continue
        
        try {
            parsedData = JSON.parse(line)
            if (parsedData.title) break // Found it
        } catch (e) {
            // Not valid JSON
        }
    }

    if (parsedData) {
        // Robust Extraction Logic
        
        // 1. Thumbnail Fallback
        if (!parsedData.thumbnail && parsedData.thumbnails && Array.isArray(parsedData.thumbnails) && parsedData.thumbnails.length > 0) {
            // Pick the last one (usually highest quality in yt-dlp output)
            parsedData.thumbnail = parsedData.thumbnails[parsedData.thumbnails.length - 1].url
        }

        // 2. Playlist/Entries Fallback
        if (!parsedData.title && parsedData.entries && Array.isArray(parsedData.entries) && parsedData.entries.length > 0) {
            const firstEntry = parsedData.entries[0]
            parsedData.title = parsedData.title || firstEntry.title
            
            if (!parsedData.thumbnail) {
                parsedData.thumbnail = firstEntry.thumbnail
                if (!parsedData.thumbnail && firstEntry.thumbnails && Array.isArray(firstEntry.thumbnails)) {
                     parsedData.thumbnail = firstEntry.thumbnails[firstEntry.thumbnails.length - 1].url
                }
            }
        }
        
        return parsedData
    }
    
    // Fallback: Try finding substring if single line messed up
    const firstBrace = stdout.indexOf('{')
    if (firstBrace !== -1) {
        try {
            const potentialJson = stdout.substring(firstBrace)
            const data = JSON.parse(potentialJson)
            // Apply same robustness
             if (!data.thumbnail && data.thumbnails && Array.isArray(data.thumbnails)) {
                data.thumbnail = data.thumbnails[data.thumbnails.length - 1].url
            }
            return data
        } catch (e) { /* ignore */ }
    }
    
    throw new Error("Invalid JSON output from yt-dlp")
}
// Clear local cache command
export async function clearCache() {
    try {
        const cmd = await getYtDlpCommand(['--rm-cache-dir'])
        const output = await cmd.execute()
        if (output.code !== 0) throw new Error(output.stderr)
        return true
    } catch (e) {
        throw e
    }
}
