import { StateCreator } from 'zustand'
import { AppState, SettingsSlice, AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    language: 'en',
    launchAtStartup: false,
    startMinimized: false,
    closeAction: 'quit',
    hasSeenOnboarding: false,

    downloadPath: '',
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
    browserType: 'chrome',
    useSponsorBlock: false,
    sponsorSegments: ['sponsor', 'intro', 'outro'],
    binaryPathYtDlp: '',
    binaryPathFfmpeg: '',
    embedMetadata: true,
    embedThumbnail: true,
    postDownloadAction: 'none',
    developerMode: false,
    disablePlayButton: false
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,
  
  setSetting: (key, val) => {
      set(state => ({ settings: { ...state.settings, [key]: val } }))
      // Mask sensitive values in logs
      const sensitiveKeys = ['proxy', 'cookiePath', 'userAgent']
      const logVal = sensitiveKeys.includes(key) ? '***REDACTED***' : val
      console.log("Store Set:", key, logVal)
  },
  updateSettings: (newSettings) => {
      set(state => ({ settings: { ...state.settings, ...newSettings } }))
      
      // Data Redaction for Security: Mask sensitive fields before logging
      const safeLog = { ...newSettings }
      const sensitiveKeys = ['proxy', 'cookiePath', 'userAgent']
      
      sensitiveKeys.forEach(key => {
          if (key in safeLog) (safeLog as any)[key] = '***REDACTED***'
      })

      console.log("Store Bulk Update:", safeLog)
  },
})
