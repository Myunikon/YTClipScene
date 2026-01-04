import { Command } from '@tauri-apps/plugin-shell'
import { fetch } from '@tauri-apps/plugin-http'

/**
 * Get the version of a sidecar binary
 */
export async function getBinaryVersion(binaryName: 'yt-dlp' | 'ffmpeg'): Promise<string | null> {
    try {
        // match the name in capabilities/default.json
        const cmd = Command.sidecar(`binaries/${binaryName}`, binaryName === 'ffmpeg' ? ['-version'] : ['--version'])
        const output = await cmd.execute()
        
        if (output.code === 0) {
            const stdout = output.stdout.trim()
            // ffmpeg version output is multiline, take first line
            // yt-dlp is usually single line 2024.10.10
            if (binaryName === 'ffmpeg') {
                const match = stdout.match(/ffmpeg version ([^\s]+)/)
                return match ? match[1] : stdout.split('\n')[0]
            }
            return stdout.split('\n')[0]
        }
    } catch (e) {
        console.error(`Failed to get version for ${binaryName}:`, e)
    }
    return null
}

/**
 * Get the latest version of a binary from GitHub releases
 */
export async function getLatestVersion(binaryName: 'yt-dlp' | 'ffmpeg'): Promise<string | null> {
    try {
        const repoMap = {
            'yt-dlp': 'yt-dlp/yt-dlp',
            'ffmpeg': 'BtbN/FFmpeg-Builds'
        }
        const repo = repoMap[binaryName]
        
        const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'ClipSceneYT'
            }
        })
        
        if (response.ok) {
            const data = await response.json() as { tag_name: string }
            // yt-dlp uses version like "2024.12.23"
            // FFmpeg-Builds uses version like "autobuild-2024-12-23-14-21"
            return data.tag_name || null
        }
    } catch (e) {
        console.error(`Failed to fetch latest version for ${binaryName}:`, e)
    }
    return null
}

/**
 * Compare two version strings (simple date-based comparison for yt-dlp)
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(current: string | null, latest: string | null): number {
    if (!current || !latest) return 0
    
    // Normalize: extract numbers from version strings
    const normalize = (v: string) => v.replace(/[^\d.]/g, '').replace(/\./g, '')
    
    const c = normalize(current)
    const l = normalize(latest)
    
    if (c === l) return 0
    return c < l ? -1 : 1
}

/**
 * Check if update is available
 */
export async function checkForUpdates(): Promise<{
    ytdlp: { current: string | null, latest: string | null, hasUpdate: boolean },
    ffmpeg: { current: string | null, latest: string | null, hasUpdate: boolean }
}> {
    const [ytdlpCurrent, ffmpegCurrent] = await Promise.all([
        getBinaryVersion('yt-dlp'),
        getBinaryVersion('ffmpeg')
    ])
    
    const [ytdlpLatest, ffmpegLatest] = await Promise.all([
        getLatestVersion('yt-dlp'),
        getLatestVersion('ffmpeg')
    ])
    
    return {
        ytdlp: {
            current: ytdlpCurrent,
            latest: ytdlpLatest,
            hasUpdate: compareVersions(ytdlpCurrent, ytdlpLatest) < 0
        },
        ffmpeg: {
            current: ffmpegCurrent,
            latest: ffmpegLatest,
            hasUpdate: compareVersions(ffmpegCurrent, ffmpegLatest) < 0
        }
    }
}
