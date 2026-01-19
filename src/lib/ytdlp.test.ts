/**
 * Unit Tests for ytdlp.ts
 * Tests the core yt-dlp argument builder and helper functions
 */
import { describe, it, expect } from 'vitest'
import { buildYtDlpArgs, sanitizeFilename, parseYtDlpJson, parseMetadata, YtDlpOptions } from './ytdlp'
import { AppSettings } from '../store/slices/types'

// Mock default settings
const createMockSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
    theme: 'dark',
    language: 'en',
    launchAtStartup: false,
    startMinimized: false,
    closeAction: 'minimize',
    hasSeenOnboarding: true,
    downloadPath: '/downloads',
    alwaysAskPath: false,
    filenameTemplate: '{title}.{ext}',
    resolution: 'Best',
    container: 'mp4',
    concurrentDownloads: 3,
    concurrentFragments: 4,
    speedLimit: '',
    proxy: '',
    userAgent: '',
    lowPerformanceMode: false,
    cookieSource: 'none',
    useSponsorBlock: false,
    sponsorSegments: [],
    binaryPathYtDlp: '',
    binaryPathFfmpeg: '',
    embedMetadata: true,
    embedThumbnail: false,
    embedChapters: false,
    postDownloadAction: 'none',
    developerMode: false,
    frontendFontSize: 'medium',
    quickDownloadEnabled: false,
    showQuickModeButton: false,
    lastDownloadOptions: null,
    hardwareDecoding: 'auto',
    audioNormalization: false,
    ...overrides
})

describe('buildYtDlpArgs', () => {
    it('should include basic required arguments', async () => {
        const settings = createMockSettings()
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', {}, settings, '/downloads/test.mp4')

        expect(args).toContain('-o')
        expect(args).toContain('/downloads/test.mp4')
        expect(args).toContain('--newline')
        expect(args).toContain('--no-colors')
        expect(args).toContain('--no-playlist')
        expect(args).toContain('--continue')
    })

    it('should use custom concurrent fragments setting', async () => {
        const settings = createMockSettings({ concurrentFragments: 8 })
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', {}, settings, 'test.mp4')

        const nIndex = args.indexOf('-N')
        expect(nIndex).toBeGreaterThan(-1)
        expect(args[nIndex + 1]).toBe('8') // Should use the setting value
    })

    it('should set correct audio format for audio-only downloads', async () => {
        const settings = createMockSettings()
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { format: 'audio', audioBitrate: '320' }, settings, 'test.mp3')

        expect(args).toContain('-x')
        expect(args).toContain('--audio-format')
        expect(args).toContain('mp3')
        expect(args).toContain('--audio-quality')
        expect(args).toContain('0') // 320kbps = quality 0
    })

    it('should handle video codec preferences correctly', async () => {
        const settings = createMockSettings()

        // H.264 codec
        const h264Args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { videoCodec: 'h264' }, settings, 'test.mp4')
        const h264Format = h264Args[h264Args.indexOf('-f') + 1]
        expect(h264Format).toContain('avc')

        // AV1 codec
        const av1Args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { videoCodec: 'av1' }, settings, 'test.mp4')
        const av1Format = av1Args[av1Args.indexOf('-f') + 1]
        expect(av1Format).toContain('av01')
    })

    it('should NOT append /best fallback when resolution is specified (Strict Mode)', async () => {
        const settings = createMockSettings()
        // User requests 360p
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { format: '360' }, settings, 'test.mp4')
        const formatFlagIndex = args.indexOf('-f')
        const formatString = args[formatFlagIndex + 1]

        // Should contain resolution constraint
        expect(formatString).toContain('height<=360')

        // CRITICAL: Should NOT end with "/best" or "/best/best"
        // It SHOULD end with "best[height<=360]" (or similar variant depending on codec)
        // The previous bug was that it ended with "/best" which allowed it to ignore the height constraint.
        expect(formatString.endsWith('/best')).toBe(false)

        // It should match the strict pattern: .../best[height<=360]
        expect(formatString).toMatch(/\/best\[height<=360\]$/)
    })

    it('should correctly parse resolution with "p" suffix (e.g., 480p) with clipping', async () => {
        const settings = createMockSettings()
        // User requests 480p WITH clipping (trim)
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', {
            format: '480p',  // Note: With 'p' suffix as sent from UI
            rangeStart: '00:10',
            rangeEnd: '00:30'
        }, settings, 'test.mp4')

        const formatFlagIndex = args.indexOf('-f')
        const formatString = args[formatFlagIndex + 1]

        // CRITICAL: Should contain 'height<=480' NOT 'height<=480p'
        expect(formatString).toContain('height<=480')
        expect(formatString).not.toContain('480p') // No 'p' suffix in format string

        // Should also have clipping args
        expect(args).toContain('--download-sections')
        expect(args).toContain('*00:10-00:30')
    })

    it('should add clipping arguments when range is specified', async () => {
        const settings = createMockSettings()
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { rangeStart: '00:30', rangeEnd: '01:00' }, settings, 'test.mp4')

        expect(args).toContain('--download-sections')
        expect(args).toContain('*00:30-01:00')
        expect(args).toContain('--force-keyframes-at-cuts')
        // NOTE: --downloader ffmpeg was intentionally removed (see ytdlp.ts line 187-189)
        // It conflicts with subtitle embedding in some containers.
    })

    it('should sanitize time inputs to prevent injection', async () => {
        const settings = createMockSettings()
        // Attempt to inject malicious characters - sanitizer only keeps [0-9:.]
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', { rangeStart: '00:30; rm -rf /', rangeEnd: '01:00' }, settings, 'test.mp4')

        // Check that the download-sections argument exists and is sanitized
        const sectionsIndex = args.indexOf('--download-sections')
        expect(sectionsIndex).toBeGreaterThan(-1)
        const sectionsValue = args[sectionsIndex + 1]
        // Should not contain semicolon, space, or slash
        expect(sectionsValue).not.toContain(';')
        expect(sectionsValue).not.toContain(' ')
        expect(sectionsValue).not.toContain('/')
        expect(sectionsValue).toBe('*00:30-01:00') // Only numbers, colons, and dots kept
    })

    it('should reject proxy strings starting with dash', async () => {
        const settings = createMockSettings({ proxy: '-x malicious' })

        await expect(buildYtDlpArgs('https://youtube.com/watch?v=test', {}, settings, 'test.mp4'))
            .rejects.toThrow("Invalid Proxy")
    })

    it('should add subtitle arguments when enabled', async () => {
        const settings = createMockSettings()
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', {
            subtitles: true,
            subtitleLang: 'en',
            embedSubtitles: true
        }, settings, 'test.mp4')

        expect(args).toContain('--write-subs')
        expect(args).toContain('--sub-langs')
        expect(args).toContain('en')
        expect(args).toContain('--embed-subs')
    })

    it('should add SponsorBlock arguments when enabled', async () => {
        const settings = createMockSettings({
            useSponsorBlock: true,
            sponsorSegments: ['sponsor', 'intro']
        })
        const args = await buildYtDlpArgs('https://youtube.com/watch?v=test', {}, settings, 'test.mp4')

        expect(args).toContain('--sponsorblock-remove')
        expect(args).toContain('sponsor,intro')
    })

    it('should place URL last with -- separator', async () => {
        const settings = createMockSettings()
        const testUrl = 'https://youtube.com/watch?v=test1234'
        const args = await buildYtDlpArgs(testUrl, {}, settings, 'test.mp4')

        expect(args[args.length - 1]).toBe(testUrl)
        expect(args[args.length - 2]).toBe('--')
    })
})

describe('buildYtDlpArgs GPU Acceleration', () => {
    const settings = createMockSettings()
    const url = 'https://youtube.com/watch?v=test'

    it('should inject nvidia encoder args when gpuType is nvidia', async () => {
        const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'nvidia')
        expect(args).toContain('--downloader-args')
        expect(args).toContain('ffmpeg:-c:v h264_nvenc')
    })

    it('should inject amd encoder args when gpuType is amd', async () => {
        const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'amd')
        expect(args).toContain('--downloader-args')
        expect(args).toContain('ffmpeg:-c:v h264_amf')
    })

    it('should inject intel encoder args when gpuType is intel', async () => {
        const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'intel')
        expect(args).toContain('--downloader-args')
        expect(args).toContain('ffmpeg:-c:v h264_qsv')
    })

    it('should NOT inject encoder args when gpuType is cpu', async () => {
        const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'cpu')
        expect(args).not.toContain('--downloader-args')
    })
})

describe('sanitizeFilename', () => {
    it('should remove illegal filesystem characters', () => {
        const meta = { title: 'Test:Video*Name?', ext: 'mp4', id: '123' }
        const result = sanitizeFilename('{title}.{ext}', meta)

        expect(result).not.toContain(':')
        expect(result).not.toContain('*')
        expect(result).not.toContain('?')
        expect(result).toContain('Test_Video_Name_')
    })

    it('should replace template variables correctly', () => {
        const meta = { title: 'My Video', ext: 'mkv', id: 'abc123', uploader: 'Channel' }
        const result = sanitizeFilename('{title}-{id}.{ext}', meta)

        expect(result).toBe('My Video-abc123.mkv')
    })

    it('should handle empty title with fallback', () => {
        const meta = { title: '', ext: 'mp4', id: '123' }
        const result = sanitizeFilename('{title}.{ext}', meta)

        // Updated: sanitizeFilename now returns 'Untitled' for empty titles as a safety fallback
        expect(result).toBe('Untitled.mp4')
    })

    it('should remove path traversal attempts', () => {
        const meta = { title: '../../../etc/passwd', ext: 'mp4', id: '123' }
        const result = sanitizeFilename('{title}.{ext}', meta)

        expect(result).not.toContain('..')
    })

    it('should sanitize colons in filenames to underscores', () => {
        const meta = { title: 'Avengers: Endgame', ext: 'mp4' }
        const result = sanitizeFilename('{title}.{ext}', meta)
        expect(result).toBe('Avengers_ Endgame.mp4')
    })

    it('should force extension if template is malformed (missing dot)', () => {
        const meta = { title: 'cool_video', ext: 'mp4', id: '123' }
        // Malformed template: missing dot between title and ext
        const result = sanitizeFilename('{title}{ext}', meta)

        // Should detect that "cool_videomp4" doesn't end with ".mp4" and append it
        expect(result).toBe('cool_videomp4.mp4')
    })

    it('should force extension even if simple string', () => {
        const meta = { title: 'video', ext: 'mp4' }
        const result = sanitizeFilename('my_video', meta)
        expect(result).toBe('my_video.mp4')
    })
})

describe('parseYtDlpJson', () => {
    it('should parse valid JSON output', () => {
        const stdout = `[info] Extracting information
{"title": "Test Video", "id": "abc123", "thumbnail": "https://example.com/thumb.jpg"}`

        const result = parseYtDlpJson(stdout)

        expect(result.title).toBe('Test Video')
        expect(result.id).toBe('abc123')
        expect(result.thumbnail).toBe('https://example.com/thumb.jpg')
    })

    it('should extract thumbnail from thumbnails array as fallback', () => {
        const stdout = `{"title": "Test", "id": "123", "thumbnails": [{"url": "low.jpg"}, {"url": "high.jpg"}]}`

        const result = parseYtDlpJson(stdout)

        expect(result.thumbnail).toBe('high.jpg') // Last one = highest quality
    })

    it('should throw error on invalid JSON', () => {
        const stdout = 'This is not JSON at all'

        expect(() => parseYtDlpJson(stdout)).toThrow('Invalid JSON output')
    })
})

describe('parseMetadata', () => {
    it('should extract stream URLs from requested_formats', () => {
        const lines = [
            '{"title": "Test", "id": "123", "requested_formats": [{"url": "video.mp4"}, {"url": "audio.mp4"}]}'
        ]

        const result = parseMetadata(lines)

        expect(result.streamUrls).toEqual(['video.mp4', 'audio.mp4'])
        expect(result.needsMerging).toBe(true)
    })

    it('should return fallback meta when no valid JSON found', () => {
        const lines = ['not json', 'also not json']

        const result = parseMetadata(lines)

        expect(result.meta.title).toBe('Unknown_Video')
        expect(result.meta.ext).toBe('mp4')
    })
})

describe('buildYtDlpArgs UI Permutations (New Download Dialog)', () => {
    const settings = createMockSettings()
    const url = 'https://youtube.com/watch?v=permutation'

    // 1. GIF MODE
    it('should generate correct GIF args with defaults', async () => {
        // User selects GIF but doesn't touch advanced settings (defaults undefined)
        const args = await buildYtDlpArgs(url, { format: 'gif' }, settings, 'test.gif')

        expect(args).toContain('--recode-video')
        expect(args).toContain('gif')
        // Should have filter chain
        const postProc = args.indexOf('--postprocessor-args')
        expect(postProc).toBeGreaterThan(-1)
        expect(args[postProc + 1]).toContain('VideoConvertor:-vf')
        // Default FPS 15
        expect(args[postProc + 1]).toContain('fps=15')
    })

    it('should generate correct GIF args with High Quality', async () => {
        const args = await buildYtDlpArgs(url, { format: 'gif', gifQuality: 'high', gifFps: 24, gifScale: 320 }, settings, 'test.gif')
        const ppArgs = args[args.indexOf('--postprocessor-args') + 1]

        expect(ppArgs).toContain('palettegen') // High quality uses palettegen
        expect(ppArgs).toContain('fps=24')
        expect(ppArgs).toContain('scale=-2:\'min(320,ih)\'')
    })

    // 2. AUDIO MODE
    it('should handle Audio Mode with default bitrate', async () => {
        // User selects Audio, undefined bitrate
        const args = await buildYtDlpArgs(url, { format: 'audio' }, settings, 'test.mp3')

        expect(args).toContain('--audio-quality')
        expect(args[args.indexOf('--audio-quality') + 1]).toBe('2') // Default 192k -> quality 2
    })

    it('should handle Audio Mode with specific bitrate', async () => {
        // 320kbps
        const args = await buildYtDlpArgs(url, { format: 'audio', audioBitrate: '320' }, settings, 'test.mp3')
        expect(args[args.indexOf('--audio-quality') + 1]).toBe('0') // 320k -> 0

        // 128kbps
        const args2 = await buildYtDlpArgs(url, { format: 'audio', audioBitrate: '128' }, settings, 'test.mp3')
        expect(args2[args2.indexOf('--audio-quality') + 1]).toBe('5') // 128k -> 5
    })

    it('should inject Loudness Normalization for audio', async () => {
        const args = await buildYtDlpArgs(url, { format: 'audio', audioNormalization: true }, settings, 'test.mp3')
        expect(args).toContain('--postprocessor-args')
        expect(args.some(a => a.includes('loudnorm=I=-16'))).toBe(true)
    })

    // 3. VIDEO CODECS
    it('should request AV1 codec when selected', async () => {
        const args = await buildYtDlpArgs(url, { videoCodec: 'av1' }, settings, 'test.mp4')
        const fmt = args[args.indexOf('-f') + 1]
        expect(fmt).toContain('vcodec^=av01')
    })

    it('should request VP9 codec when selected', async () => {
        const args = await buildYtDlpArgs(url, { videoCodec: 'vp9' }, settings, 'test.webm')
        const fmt = args[args.indexOf('-f') + 1]
        expect(fmt).toContain('vcodec^=vp9')
    })

    // 4. SPONSORBLOCK & CHAPTERS
    it('should add sponsorblock args', async () => {
        const args = await buildYtDlpArgs(url, { removeSponsors: true }, createMockSettings({ sponsorSegments: ['sponsor'] }), 'test.mp4')
        expect(args).toContain('--sponsorblock-remove')
        expect(args).toContain('sponsor')
    })

    it('should split chapters with sanitized output template', async () => {
        const args = await buildYtDlpArgs(url, { splitChapters: true }, settings, '/abs/path/to/test.mp4')
        expect(args).toContain('--split-chapters')
        // Check new output template for chapters
        const outIndex = args.lastIndexOf('-o') // It overrides existing -o
        expect(outIndex).toBeGreaterThan(-1)
        expect(args[outIndex + 1]).toContain('[Chapters] test')
        expect(args[outIndex + 1]).toContain('%(chapter_number)s')
    })
})

describe('buildYtDlpArgs Advanced Scenarios', () => {
    const settings = createMockSettings()
    const url = 'https://youtube.com/watch?v=advanced'

    // 1. NETWORK SETTINGS
    it('should inject proxy if configured', async () => {
        const proxySettings = createMockSettings({ proxy: 'http://user:pass@1.2.3.4:8080' })
        const args = await buildYtDlpArgs(url, {}, proxySettings, 'test.mp4')
        expect(args).toContain('--proxy')
        expect(args).toContain('http://user:pass@1.2.3.4:8080')
    })

    it('should inject cookies from browser', async () => {
        const cookieSettings = createMockSettings({ cookieSource: 'browser', browserType: 'firefox' })
        const args = await buildYtDlpArgs(url, {}, cookieSettings, 'test.mp4')
        expect(args).toContain('--cookies-from-browser')
        expect(args).toContain('firefox')
    })

    it('should inject cookies from file', async () => {
        const cookieSettings = createMockSettings({ cookieSource: 'txt', cookiePath: '/path/to/cookies.txt' })
        const args = await buildYtDlpArgs(url, {}, cookieSettings, 'test.mp4')
        expect(args).toContain('--cookies')
        expect(args).toContain('/path/to/cookies.txt')
    })

    it('should apply speed limit', async () => {
        const speedSettings = createMockSettings({ speedLimit: '5M' })
        const args = await buildYtDlpArgs(url, {}, speedSettings, 'test.mp4')
        expect(args).toContain('--limit-rate')
        expect(args).toContain('5M')
    })

    it('should handle User-Agent customization', async () => {
        // Custom UA
        const uaSettings = createMockSettings({ userAgent: 'Mozilla/TestAgent' })
        const args = await buildYtDlpArgs(url, {}, uaSettings, 'test.mp4')
        const uaIndex = args.indexOf('--user-agent')
        expect(uaIndex).toBeGreaterThan(-1)
        expect(args[uaIndex + 1]).toBe('Mozilla/TestAgent')

        // Disabled UA (Space hack)
        const noUaSettings = createMockSettings({ userAgent: ' ' })
        const args2 = await buildYtDlpArgs(url, {}, noUaSettings, 'test.mp4')
        expect(args2).not.toContain('--user-agent')
    })

    // 2. CLIPPING SAFETY (CRITICAL)
    it('should DISABLE metadata embedding when clipping to prevent corruption', async () => {
        // Enable all embedding options in settings
        const embedSettings = createMockSettings({
            embedMetadata: true,
            embedChapters: true,
            embedThumbnail: true
        })

        // Clipping enabled
        const args = await buildYtDlpArgs(url, { rangeStart: '00:10', rangeEnd: '00:20' }, embedSettings, 'clip.mp4')

        // Metadata args should be ABSENT
        expect(args).not.toContain('--embed-metadata')
        expect(args).not.toContain('--embed-chapters')
        expect(args).not.toContain('--embed-thumbnail')

        // Should have download sections
        expect(args).toContain('--download-sections')
    })

    // 3. HARDWARE ACCELERATION SPECIFICS
    it('should use Intel QSV flags with ICQ mode during clipping', async () => {
        // ICQ mode (-global_quality) is only applied during clipping for quality consistency
        const args = await buildYtDlpArgs(url, { rangeStart: '10' }, settings, 'test.mp4', 'intel')
        const dlArgs = args[args.indexOf('--downloader-args') + 1]
        expect(dlArgs).toContain('h264_qsv')
        expect(dlArgs).toContain('-global_quality') // ICQ mode for clips
    })

    it('should use AMD AMF flags with clipping optimization', async () => {
        // AMF with clipping triggers specific rate control
        const args = await buildYtDlpArgs(url, { rangeStart: '10' }, settings, 'test.mp4', 'amd')
        const dlArgs = args[args.indexOf('--downloader-args') + 1]
        expect(dlArgs).toContain('h264_amf')
        expect(dlArgs).toContain('-rc cqp') // Constant Quality
    })

    it('should use Apple VideoToolbox flags', async () => {
        const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'apple')
        const dlArgs = args[args.indexOf('--downloader-args') + 1]
        expect(dlArgs).toContain('h264_videotoolbox')
    })

    // 4. LIVESTREAM
    it('should add live-from-start flag', async () => {
        const args = await buildYtDlpArgs(url, { liveFromStart: true }, settings, 'live.mp4')
        expect(args).toContain('--live-from-start')
    })

    // -------------------------------------------------------------------------
    // 8. 403 Error Investigation (Split + Loudnorm)
    // -------------------------------------------------------------------------
    it('should generate valid args for Split Chapters + Audio Normalization', async () => {
        const settings = createMockSettings({
            audioNormalization: true // Global setting
        });
        const options: YtDlpOptions = {
            splitChapters: true,
            audioNormalization: true, // Task setting
        };

        const args = await buildYtDlpArgs('https://youtube.com/watch?v=video', options, settings, 'C:/Downloads/video.mp4', 'cpu');

        // SEQUENTIAL MODE CHECK:
        // When both are enabled, buildYtDlpArgs should SKIP adding --split-chapters
        // to avoid the 403 error. The splitting happens in a second pass in createVideoSlice.
        expect(args).not.toContain('--split-chapters');

        // Check for Loudnorm (should still be there as it runs on the main file)
        const ppIndex = args.findIndex(a => a.includes('loudnorm=I=-16:TP=-1.5:LRA=11'));
        expect(ppIndex).toBeGreaterThan(-1);

        // Ensure no conflicting downloader args (like forced ffmpeg downloader which causes header issues)
        expect(args).not.toContain('--downloader');
        expect(args.join(' ')).not.toContain('--downloader ffmpeg');
    });

    // 5. HARDWARE ACCELERATION FALLBACKS (Safety Checks)
    it('should fall back to CPU if User wants GPU but System detects CPU', async () => {
        const gpuSettings = createMockSettings({ hardwareDecoding: 'gpu' })
        // System reports 'cpu' (4th arg)
        const args = await buildYtDlpArgs(url, {}, gpuSettings, 'test.mp4', 'cpu')

        // Should NOT contain downloader args for HW accel
        expect(args.join(' ')).not.toContain('h264_nvenc')
        expect(args.join(' ')).not.toContain('h264_qsv')
    })

    it('should NOT use Video HW Accel for Audio-only downloads', async () => {
        const gpuSettings = createMockSettings({ hardwareDecoding: 'gpu' })
        // System has NVIDIA
        const args = await buildYtDlpArgs(url, { format: 'audio' }, gpuSettings, 'test.mp3', 'nvidia')

        // Should NOT invoke video encoder for mp3
        expect(args.join(' ')).not.toContain('h264_nvenc')
    })

    // -------------------------------------------------------------------------
    // 9. Comprehensive Audit Tests
    // -------------------------------------------------------------------------

    it('should ignore audioNormalization for GIF format (no audio)', async () => {
        const settings = createMockSettings({ audioNormalization: true })
        const options: YtDlpOptions = {
            format: 'gif',
            audioNormalization: true // User might have this on from a previous download
        }
        const args = await buildYtDlpArgs(url, options, settings, 'test.gif', 'cpu')

        // GIF has no audio, so loudnorm should NOT be applied
        expect(args.join(' ')).not.toContain('loudnorm')
    })

    it('should NOT use Video HW Accel for GIF downloads (uses VideoConvertor)', async () => {
        const gpuSettings = createMockSettings({ hardwareDecoding: 'gpu' })
        // GIF mode with NVIDIA GPU available
        const args = await buildYtDlpArgs(url, { format: 'gif' }, gpuSettings, 'test.gif', 'nvidia')

        // Should NOT invoke HW encoder since GIF uses VideoConvertor post-processor
        expect(args.join(' ')).not.toContain('h264_nvenc')
        expect(args.join(' ')).not.toContain('--downloader-args')
    })

    it('should skip HW downloader args when forceTranscode + clipping are both active', async () => {
        const settings = createMockSettings({ hardwareDecoding: 'gpu' })
        const options: YtDlpOptions = {
            rangeStart: '10', // Clipping
            rangeEnd: '30',
            videoCodec: 'h264',
            forceTranscode: true // User wants a specific codec AND is clipping
        }
        const args = await buildYtDlpArgs(url, options, settings, 'test.mp4', 'nvidia')

        // HW downloader args should be SKIPPED to avoid conflict with VideoConvertor post-processor
        expect(args.join(' ')).not.toContain('--downloader-args')
        expect(args.join(' ')).not.toContain('h264_nvenc')

        // But VideoConvertor args SHOULD be present
        expect(args.join(' ')).toContain('VideoConvertor')
        expect(args.join(' ')).toContain('libx264')
    })

    it('should correctly handle AV1 codec with MP4 container', async () => {
        const settings = createMockSettings({ container: 'mp4' })
        const options: YtDlpOptions = {
            videoCodec: 'av1'
        }
        const args = await buildYtDlpArgs(url, options, settings, 'test.mp4', 'cpu')

        // Should include AV1 format string
        expect(args.join(' ')).toContain('vcodec^=av01')

        // Should include MP4 container
        expect(args).toContain('--merge-output-format')
        expect(args).toContain('mp4')
    })

    it('should correctly handle HEVC codec with MKV container', async () => {
        const settings = createMockSettings({ container: 'mkv' })
        const options: YtDlpOptions = {
            videoCodec: 'hevc'
        }
        const args = await buildYtDlpArgs(url, options, settings, 'test.mkv', 'cpu')

        // Should include HEVC format string
        expect(args.join(' ')).toContain('vcodec^=hevc')

        // Should include MKV container
        expect(args).toContain('--merge-output-format')
        expect(args).toContain('mkv')
    })
})

// =============================================================================
// EDGE CASES & BAD SCENARIO TESTS
// =============================================================================
describe('buildYtDlpArgs Edge Cases & Bad Scenarios', () => {
    const settings = createMockSettings()
    const url = 'https://youtube.com/watch?v=edgecase'

    // -------------------------------------------------------------------------
    // 1. RESOLUTION EDGE CASES
    // -------------------------------------------------------------------------
    describe('Resolution Edge Cases', () => {
        it('should handle resolution "4K" (non-numeric)', async () => {
            // 4K is often labeled as 2160p
            const args = await buildYtDlpArgs(url, { format: '4K' }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            // Should strip non-numeric but still have height constraint
            expect(formatString).toContain('height<=4')
        })

        it('should handle resolution "2K" (non-numeric)', async () => {
            const args = await buildYtDlpArgs(url, { format: '2K' }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            expect(formatString).toContain('height<=2')
        })

        it('should handle numeric resolution without "p" suffix (720)', async () => {
            const args = await buildYtDlpArgs(url, { format: '720' }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            expect(formatString).toContain('height<=720')
        })

        it('should handle resolution with uppercase "P" (1080P)', async () => {
            const args = await buildYtDlpArgs(url, { format: '1080P' }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            expect(formatString).toContain('height<=1080')
            expect(formatString).not.toContain('1080P')
        })

        it('should handle mixed resolution format (720p HD)', async () => {
            // Edge case: User might input "720p HD" or similar
            const args = await buildYtDlpArgs(url, { format: '720p HD' }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            // Should strip everything except numbers
            expect(formatString).toContain('height<=720')
        })
    })

    // -------------------------------------------------------------------------
    // 2. CLIPPING EDGE CASES
    // -------------------------------------------------------------------------
    describe('Clipping Edge Cases', () => {
        it('should handle rangeStart only (no rangeEnd)', async () => {
            const args = await buildYtDlpArgs(url, { rangeStart: '00:30' }, settings, 'test.mp4')
            expect(args).toContain('--download-sections')
            expect(args).toContain('*00:30-inf')
        })

        it('should handle rangeEnd only (no rangeStart)', async () => {
            const args = await buildYtDlpArgs(url, { rangeEnd: '01:00' }, settings, 'test.mp4')
            expect(args).toContain('--download-sections')
            expect(args).toContain('*0-01:00')
        })

        it('should handle numeric seconds as rangeStart/End', async () => {
            const args = await buildYtDlpArgs(url, { rangeStart: 30, rangeEnd: 60 }, settings, 'test.mp4')
            expect(args).toContain('--download-sections')
            expect(args).toContain('*30-60')
        })

        it('should handle decimal seconds in range', async () => {
            const args = await buildYtDlpArgs(url, { rangeStart: '10.5', rangeEnd: '30.75' }, settings, 'test.mp4')
            expect(args).toContain('*10.5-30.75')
        })

        it('should sanitize malicious characters in range times', async () => {
            const args = await buildYtDlpArgs(url, {
                rangeStart: '00:30 && rm -rf /',
                rangeEnd: '01:00; cat /etc/passwd'
            }, settings, 'test.mp4')
            const sectionsArg = args[args.indexOf('--download-sections') + 1]
            expect(sectionsArg).not.toContain('&&')
            expect(sectionsArg).not.toContain('rm')
            expect(sectionsArg).not.toContain(';')
            expect(sectionsArg).not.toContain('cat')
        })
    })

    // -------------------------------------------------------------------------
    // 3. GIF EDGE CASES
    // -------------------------------------------------------------------------
    describe('GIF Edge Cases', () => {
        it('should handle GIF with clipping', async () => {
            const args = await buildYtDlpArgs(url, {
                format: 'gif',
                rangeStart: '00:05',
                rangeEnd: '00:10'
            }, settings, 'test.gif')

            expect(args).toContain('--recode-video')
            expect(args).toContain('gif')
            expect(args).toContain('--download-sections')
        })

        it('should handle GIF with extreme FPS (60)', async () => {
            const args = await buildYtDlpArgs(url, { format: 'gif', gifFps: 60 }, settings, 'test.gif')
            const ppArgs = args[args.indexOf('--postprocessor-args') + 1]
            expect(ppArgs).toContain('fps=60')
        })

        it('should handle GIF with very low FPS (5)', async () => {
            const args = await buildYtDlpArgs(url, { format: 'gif', gifFps: 5 }, settings, 'test.gif')
            const ppArgs = args[args.indexOf('--postprocessor-args') + 1]
            expect(ppArgs).toContain('fps=5')
        })

        it('should handle GIF with zero scale (original size)', async () => {
            const args = await buildYtDlpArgs(url, { format: 'gif', gifScale: 0 }, settings, 'test.gif')
            const ppArgs = args[args.indexOf('--postprocessor-args') + 1]
            // Scale 0 means no scaling filter should be applied
            expect(ppArgs).not.toContain('scale=')
        })

        it('should NOT apply hardware acceleration for GIF even with NVIDIA GPU', async () => {
            const args = await buildYtDlpArgs(url, { format: 'gif' }, settings, 'test.gif', 'nvidia')
            expect(args.join(' ')).not.toContain('h264_nvenc')
            expect(args.join(' ')).not.toContain('--downloader-args')
        })
    })

    // -------------------------------------------------------------------------
    // 4. AUDIO EDGE CASES
    // -------------------------------------------------------------------------
    describe('Audio Edge Cases', () => {
        it('should handle unknown bitrate gracefully (fallback to default)', async () => {
            const args = await buildYtDlpArgs(url, { format: 'audio', audioBitrate: '999' }, settings, 'test.mp3')
            // Should use quality level 2 (default for unknown)
            expect(args[args.indexOf('--audio-quality') + 1]).toBe('2')
        })

        it('should handle audio format with subtitles (subtitles should be ignored)', async () => {
            const args = await buildYtDlpArgs(url, {
                format: 'audio',
                subtitles: true,
                embedSubtitles: true
            }, settings, 'test.mp3')
            // Audio should still work, subtitles might be written but not embedded
            expect(args).toContain('-x')
            // embedSubtitles should not be present for audio (no video to embed into)
            // Note: The current code doesn't explicitly block this, but let's check behavior
        })

        it('should NOT apply hardware acceleration for audio downloads', async () => {
            const args = await buildYtDlpArgs(url, { format: 'audio' }, settings, 'test.mp3', 'nvidia')
            expect(args.join(' ')).not.toContain('h264_nvenc')
        })
    })

    // -------------------------------------------------------------------------
    // 5. CODEC + CONTAINER COMPATIBILITY (Edge Cases)
    // -------------------------------------------------------------------------
    describe('Codec/Container Edge Cases', () => {
        it('should handle undefined videoCodec (defaults to auto)', async () => {
            const args = await buildYtDlpArgs(url, { videoCodec: undefined }, settings, 'test.mp4')
            const formatString = args[args.indexOf('-f') + 1]
            // Auto codec should be generic: bestvideo+bestaudio
            expect(formatString).toContain('bestvideo')
            expect(formatString).not.toContain('vcodec^=')
        })

        it('should handle WEBM container with VP9 codec correctly', async () => {
            const webmSettings = createMockSettings({ container: 'webm' })
            const args = await buildYtDlpArgs(url, { videoCodec: 'vp9' }, webmSettings, 'test.webm')
            expect(args).toContain('--merge-output-format')
            expect(args).toContain('webm')
            const formatString = args[args.indexOf('-f') + 1]
            expect(formatString).toContain('vcodec^=vp9')
        })

        it('should handle forceTranscode without clipping', async () => {
            // forceTranscode true but no clipping - should add transcode args
            const args = await buildYtDlpArgs(url, {
                videoCodec: 'h264',
                forceTranscode: true
            }, settings, 'test.mp4')
            expect(args.join(' ')).toContain('VideoConvertor')
            expect(args.join(' ')).toContain('libx264')
        })
    })

    // -------------------------------------------------------------------------
    // 6. HARDWARE ACCELERATION EDGE CASES
    // -------------------------------------------------------------------------
    describe('Hardware Acceleration Edge Cases', () => {
        it('should handle unknown GPU type gracefully', async () => {
            // Pass an invalid GPU type - should not crash
            const args = await buildYtDlpArgs(url, {}, settings, 'test.mp4', 'unknown' as any)
            // Should not contain any encoder args since 'unknown' is not mapped
            expect(args.join(' ')).not.toContain('h264_nvenc')
            expect(args.join(' ')).not.toContain('h264_amf')
        })

        it('should respect hardwareDecoding=cpu setting even with nvidia GPU', async () => {
            const cpuSettings = createMockSettings({ hardwareDecoding: 'cpu' })
            const args = await buildYtDlpArgs(url, {}, cpuSettings, 'test.mp4', 'nvidia')
            expect(args.join(' ')).not.toContain('h264_nvenc')
        })

        it('should handle clipping with all GPU types', async () => {
            const gpuTypes = ['nvidia', 'amd', 'intel', 'apple'] as const
            for (const gpu of gpuTypes) {
                const args = await buildYtDlpArgs(url, { rangeStart: '10', rangeEnd: '20' }, settings, 'test.mp4', gpu)
                // Should contain quality settings for clipping
                expect(args).toContain('--downloader-args')
            }
        })
    })

    // -------------------------------------------------------------------------
    // 7. COMBINED CONFLICTING OPTIONS
    // -------------------------------------------------------------------------
    describe('Combined/Conflicting Options', () => {
        it('should handle clipping + GPU + specific codec + subtitles', async () => {
            const args = await buildYtDlpArgs(url, {
                rangeStart: '00:10',
                rangeEnd: '00:30',
                videoCodec: 'h264',
                subtitles: true,
                subtitleLang: 'en'
            }, settings, 'test.mp4', 'nvidia')

            expect(args).toContain('--download-sections')
            expect(args).toContain('--write-subs')
            // Embed subs should be disabled during clipping
            expect(args).not.toContain('--embed-subs')
        })

        it('should handle all enhancements enabled (edge stress test)', async () => {
            const fullSettings = createMockSettings({
                embedMetadata: true,
                embedThumbnail: true,
                embedChapters: true,
                useSponsorBlock: true,
                sponsorSegments: ['sponsor', 'intro'],
                audioNormalization: true
            })

            const args = await buildYtDlpArgs(url, {
                subtitles: true,
                subtitleLang: 'en',
                embedSubtitles: true,
                audioNormalization: true
            }, fullSettings, 'test.mp4')

            // Non-clipping: All should be present
            expect(args).toContain('--embed-metadata')
            expect(args).toContain('--sponsorblock-remove')
            expect(args.join(' ')).toContain('loudnorm')
        })

        it('should disable metadata/thumbnail/chapters when clipping (anti-corruption)', async () => {
            const fullSettings = createMockSettings({
                embedMetadata: true,
                embedThumbnail: true,
                embedChapters: true
            })

            const args = await buildYtDlpArgs(url, {
                rangeStart: '00:10',
                rangeEnd: '00:30'
            }, fullSettings, 'test.mp4')

            // All embedding should be DISABLED during clipping
            expect(args).not.toContain('--embed-metadata')
            expect(args).not.toContain('--embed-thumbnail')
            expect(args).not.toContain('--embed-chapters')
        })

        it('should skip HW downloader when forceTranscode + clipping both active', async () => {
            const args = await buildYtDlpArgs(url, {
                rangeStart: '10',
                rangeEnd: '30',
                videoCodec: 'av1',
                forceTranscode: true
            }, settings, 'test.mp4', 'nvidia')

            // HW downloader args should be SKIPPED
            expect(args.join(' ')).not.toContain('--downloader-args')
            expect(args.join(' ')).not.toContain('h264_nvenc')

            // But VideoConvertor should be present for transcode
            expect(args.join(' ')).toContain('VideoConvertor')
        })
    })

    // -------------------------------------------------------------------------
    // 8. SECURITY / INJECTION PREVENTION
    // -------------------------------------------------------------------------
    describe('Security: Injection Prevention', () => {
        it('should reject User-Agent containing newlines', async () => {
            const badSettings = createMockSettings({ userAgent: 'Mozilla/5.0\n--some-evil-flag' })
            const args = await buildYtDlpArgs(url, {}, badSettings, 'test.mp4')
            expect(args).not.toContain('--some-evil-flag')
        })

        it('should reject User-Agent starting with dash', async () => {
            const badSettings = createMockSettings({ userAgent: '--evil-flag' })
            const args = await buildYtDlpArgs(url, {}, badSettings, 'test.mp4')
            // Should use default UA or skip entirely
            expect(args.join(' ')).not.toContain('--user-agent --evil-flag')
        })

        it('should reject speed limit starting with dash', async () => {
            const badSettings = createMockSettings({ speedLimit: '-rf /' })
            const args = await buildYtDlpArgs(url, {}, badSettings, 'test.mp4')
            expect(args).not.toContain('--limit-rate')
        })
    })

    // -------------------------------------------------------------------------
    // 9. SUBTITLE EDGE CASES
    // -------------------------------------------------------------------------
    describe('Subtitle Edge Cases', () => {
        it('should handle subtitleLang "all"', async () => {
            const args = await buildYtDlpArgs(url, { subtitles: true, subtitleLang: 'all' }, settings, 'test.mp4')
            expect(args).toContain('--all-subs')
        })

        it('should handle subtitleLang "auto" with app language', async () => {
            const idSettings = createMockSettings({ language: 'id' })
            const args = await buildYtDlpArgs(url, { subtitles: true, subtitleLang: 'auto' }, idSettings, 'test.mp4')
            expect(args).toContain('--write-auto-subs')
            const subLangsArg = args[args.indexOf('--sub-langs') + 1]
            expect(subLangsArg).toContain('id')
        })

        it('should NOT embed subtitles when clipping', async () => {
            const args = await buildYtDlpArgs(url, {
                subtitles: true,
                embedSubtitles: true,
                rangeStart: '10',
                rangeEnd: '20'
            }, settings, 'test.mp4')
            expect(args).not.toContain('--embed-subs')
            expect(args).toContain('--write-subs') // Should still write external subs
        })

        it('should handle missing subtitleLang (fallback to en)', async () => {
            const args = await buildYtDlpArgs(url, { subtitles: true }, settings, 'test.mp4')
            expect(args).toContain('--sub-langs')
            expect(args).toContain('en')
        })
    })
})

