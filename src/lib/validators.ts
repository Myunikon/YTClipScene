
// Constants
// Permissive Regex: Allow any HTTP/HTTPS URL
// We let yt-dlp determine validity.
export const VIDEO_URL_REGEX = /^https?:\/\/.+/i
export const MAX_URL_LENGTH = 2000 // Increased for long tokens

/**
 * Validates a potential video URL.
 * Now permissive to support all yt-dlp sites.
 */
export function isValidVideoUrl(text: string): boolean {
    if (!text || text.length > MAX_URL_LENGTH) return false
    return VIDEO_URL_REGEX.test(text.trim())
}


export function isYouTubeUrl(url: string): boolean {
    if (!url) return false
    try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.replace('www.', '')
        return (
            hostname === 'youtube.com' ||
            hostname === 'youtu.be' ||
            hostname === 'm.youtube.com' ||
            hostname.endsWith('.youtube.com')
        )
    } catch {
        // Fallback for partial URLs if needed, or return false
        return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)
    }
}
