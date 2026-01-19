/**
 * Unit Tests for validators.ts
 * Tests URL validation functions
 */
import { describe, it, expect } from 'vitest'
import { isValidVideoUrl, VIDEO_URL_REGEX, MAX_URL_LENGTH } from './validators'

describe('isValidVideoUrl', () => {
    it('should accept valid HTTP URLs', () => {
        expect(isValidVideoUrl('http://example.com/video')).toBe(true)
        expect(isValidVideoUrl('http://youtube.com/watch?v=abc123')).toBe(true)
    })

    it('should accept valid HTTPS URLs', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc123')).toBe(true)
        expect(isValidVideoUrl('https://www.example.com/path/to/video')).toBe(true)
    })

    it('should reject empty or null input', () => {
        expect(isValidVideoUrl('')).toBe(false)
        expect(isValidVideoUrl('   ')).toBe(false)
    })

    it('should reject URLs without protocol', () => {
        expect(isValidVideoUrl('youtube.com/watch?v=abc')).toBe(false)
        expect(isValidVideoUrl('www.youtube.com')).toBe(false)
    })

    it('should reject non-HTTP protocols', () => {
        expect(isValidVideoUrl('ftp://example.com/file.mp4')).toBe(false)
        expect(isValidVideoUrl('file:///path/to/video.mp4')).toBe(false)
        expect(isValidVideoUrl('javascript:alert(1)')).toBe(false)
    })

    it('should reject URLs exceeding MAX_URL_LENGTH', () => {
        // Create a URL that is definitely longer than 2000 characters
        const longUrl = 'https://example.com/' + 'a'.repeat(MAX_URL_LENGTH + 1)
        expect(isValidVideoUrl(longUrl)).toBe(false)
    })

    it('should handle URLs with query parameters', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc123&list=PLxyz')).toBe(true)
    })

    it('should handle URLs with special characters', () => {
        expect(isValidVideoUrl('https://example.com/video?title=hello%20world')).toBe(true)
    })
})

describe('VIDEO_URL_REGEX', () => {
    it('should match HTTP URLs', () => {
        expect(VIDEO_URL_REGEX.test('http://example.com')).toBe(true)
    })

    it('should match HTTPS URLs', () => {
        expect(VIDEO_URL_REGEX.test('https://example.com')).toBe(true)
    })

    it('should be case insensitive', () => {
        expect(VIDEO_URL_REGEX.test('HTTPS://EXAMPLE.COM')).toBe(true)
        expect(VIDEO_URL_REGEX.test('HTTP://example.com')).toBe(true)
    })
})
