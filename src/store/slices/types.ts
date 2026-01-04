export interface DownloadOptions {
  path?: string // Save directory
  rangeStart?: string | number
  rangeEnd?: string | number
  format?: string
  container?: string
  sponsorBlock?: boolean
  turbo?: boolean
  customFilename?: string // User-defined filename (without extension)
  audioBitrate?: string // Audio quality in kbps (128, 192, 320)
  subtitles?: boolean // Download subtitles
  subtitleLang?: string // Subtitle language (en, id, auto, all)
  embedSubtitles?: boolean // Embed subtitles into video
  videoCodec?: 'auto' | 'av1' | 'h264' | 'vp9' // Codec Preference
  scheduledTime?: number // Timestamp
}

export interface DownloadTask {
  id: string
  url: string
  title: string
  status: 'pending' | 'fetching_info' | 'downloading' | 'completed' | 'error' | 'stopped' | 'paused' | 'scheduled'
  progress: number
  speed: string
  eta: string
  range?: string
  format?: string
  log?: string
  path?: string // Save folder
  filePath?: string // Full path to file
  concurrentFragments?: number // Number of parallel chunks used
  scheduledTime?: number // Timestamp for scheduled start
  _options?: DownloadOptions
  // Developer Mode: Command details
  ytdlpCommand?: string
  ffmpegCommand?: string
}


export interface AppSettings {
  // General
  theme: 'dark' | 'light'
  language: 'en' | 'id' | 'ms' | 'zh'
  launchAtStartup: boolean
  startMinimized: boolean
  closeAction: 'minimize' | 'quit'
  hasSeenOnboarding: boolean

  // Downloads
  downloadPath: string
  alwaysAskPath: boolean
  filenameTemplate: string
  resolution: string
  container: 'mp4' | 'mkv'


  // Network
  concurrentDownloads: number
  concurrentFragments: number // yt-dlp -N argument
  speedLimit: string
  proxy: string
  userAgent: string
  lowPerformanceMode: boolean
  
  // Advanced
  cookieSource: 'none' | 'browser' | 'txt'
  browserType?: 'chrome' | 'edge' | 'firefox' | 'opera' | 'brave' | 'vivaldi' | 'chromium' | 'safari'
  cookiePath?: string
  useSponsorBlock: boolean
  sponsorSegments: string[]
  binaryPathYtDlp: string
  binaryPathFfmpeg: string
  embedMetadata: boolean
  embedThumbnail: boolean
  postDownloadAction: 'none' | 'sleep' | 'shutdown'
  developerMode: boolean
  disablePlayButton: boolean // Hide play button in History view
}

export interface UISlice {
  showBinaryConfirmation: boolean
  missingBinaries: string[]
  requestBinaryConfirmation: (missing: string[]) => Promise<boolean>
  respondBinaryConfirmation: (answer: boolean) => void
}

export interface LogEntry {
  message: string
  timestamp: number
}

export interface LogSlice {
  logs: LogEntry[]
  addLog: (msg: string) => void
  clearLogs: () => void
}

export interface SettingsSlice {
  settings: AppSettings
  setSetting: (key: string, val: any) => void
  updateSettings: (newSettings: Partial<AppSettings>) => void
}

export interface SystemSlice {
  binariesReady: boolean
  listenersInitialized: boolean
  hasNotifiedMissingBinaries: boolean // Track if we've alerted user
  gpuType: 'cpu' | 'nvidia'
  
  // yt-dlp Version Tracking
  ytdlpVersion: string | null
  ytdlpLatestVersion: string | null
  ytdlpNeedsUpdate: boolean
  
  // FFmpeg Version Tracking
  ffmpegVersion: string | null
  ffmpegLatestVersion: string | null
  ffmpegNeedsUpdate: boolean
  
  // Loading state for version check
  isCheckingUpdates: boolean
  
  setBinariesReady: (ready: boolean) => void
  
  detectHardwareAccel: () => Promise<void>
  initListeners: () => void
  checkBinaryUpdates: () => Promise<void> // Check for updates (replaces checkYtDlpUpdate + updateYtDlp)
  validateBinaries: () => Promise<void>
}

export interface VideoSlice {
  tasks: DownloadTask[]
  addTask: (url: string, options: DownloadOptions) => Promise<void>
  stopTask: (id: string) => Promise<void>
  pauseTask: (id: string) => Promise<void>
  resumeTask: (id: string) => Promise<void>
  retryTask: (id: string) => Promise<void>
  clearTask: (id: string) => void
  deleteHistory: () => void
  updateTask: (id: string, updates: Partial<DownloadTask>) => void
  startTask: (id: string) => Promise<void>
  processQueue: () => void
  importTasks: (tasks: DownloadTask[]) => void
}

export type AppState = UISlice & LogSlice & SettingsSlice & SystemSlice & VideoSlice
