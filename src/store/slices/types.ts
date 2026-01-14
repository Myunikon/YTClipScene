export interface DownloadOptions {
  path?: string // Save directory
  rangeStart?: string | number
  rangeEnd?: string | number
  format?: string
  container?: string
  sponsorBlock?: boolean
  liveFromStart?: boolean // Download livestream from the beginning
  splitChapters?: boolean // Split video into multiple files based on chapters
  customFilename?: string // User-defined filename (without extension)
  audioBitrate?: string // Audio quality in kbps (128, 192, 320)
  audioFormat?: 'mp3' | 'm4a' | 'flac' | 'wav' | 'opus' | 'aac' // Audio format for extraction
  subtitles?: boolean // Download subtitles
  subtitleFormat?: string // format to convert subtitles to (srt, ass, vtt, lrc)
  subtitleLang?: string // Subtitle language (en, id, auto, all)
  embedSubtitles?: boolean // Embed subtitles into video
  videoCodec?: 'auto' | 'av1' | 'h264' | 'vp9' | 'hevc' // Codec Preference
  scheduledTime?: number // Timestamp
  audioNormalization?: boolean // Loudness Normalization
  forceTranscode?: boolean // Force re-encoding if native codec unavailable
}

export interface DownloadTask {
  id: string
  pid?: number // Process ID for robust killing
  url: string
  title: string
  status: 'pending' | 'fetching_info' | 'downloading' | 'completed' | 'error' | 'stopped' | 'paused' | 'scheduled'
  statusDetail?: string // Granular status: "Merging...", "Extracting Audio...", "Fixing..."
  progress: number
  speed: string
  eta: string
  totalSize?: string // e.g. "123.45MiB"
  range?: string
  format?: string
  log?: string
  path?: string // Save folder
  filePath?: string // Full path to file
  concurrentFragments?: number // Number of parallel chunks used
  scheduledTime?: number // Timestamp for scheduled start
  _options?: DownloadOptions
  _downloadPhase?: number // Internal: Track multi-phase download progress (video=1, audio=2)
  // Developer Mode: Command details
  ytdlpCommand?: string
  ffmpegCommand?: string
  // History Metadata
  fileSize?: string
  completedAt?: number
  chapters?: any[] // Store chapters for sequential splitting
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
  container: 'mp4' | 'mkv' | 'webm' | 'mov'
  hardwareDecoding: 'auto' | 'cpu' | 'gpu'


  // Network
  concurrentDownloads: number
  concurrentFragments: number // yt-dlp -N argument
  speedLimit: string
  proxy: string
  userAgent: string
  lowPerformanceMode: boolean
  frontendFontSize: 'small' | 'medium' | 'large'

  
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
  embedChapters: boolean // Embed chapter markers in video
  postDownloadAction: 'none' | 'sleep' | 'shutdown'
  developerMode: boolean
  quickDownloadEnabled: boolean // Skip dialog for repeat downloads
  showQuickModeButton: boolean // Show/hide Quick Mode toggle in dialog
  lastDownloadOptions: DownloadOptions | null // Remember last used options
  audioNormalization: boolean // Loudness Normalization (EBU R128)
}

export interface UISlice {
  showBinaryConfirmation: boolean
  missingBinaries: string[]
  requestBinaryConfirmation: (missing: string[]) => Promise<boolean>
  respondBinaryConfirmation: (answer: boolean) => void
}

export interface LogEntry {
  id: string // Unique ID for diffing
  message?: string // Fallback or raw message
  translationKey?: string
  params?: Record<string, string | number>
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
}

export interface LogSlice {
  logs: LogEntry[]
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'id'>) => void
  clearLogs: () => void
  removeLog: (index: number) => void
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
  gpuType: 'cpu' | 'nvidia' | 'amd' | 'intel'
  gpuModel?: string
  gpuRenderer?: string
  
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

export interface CompressionOptions {
  preset: 'wa' | 'social' | 'archive' | 'custom'
  crf: number
  resolution: string
  encoder: 'auto' | 'cpu' | 'nvenc' | 'amf' | 'qsv'
  speedPreset: 'ultrafast' | 'veryfast' | 'medium' | 'slow' | 'veryslow'
  audioBitrate?: string
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
  compressTask: (taskId: string, options: CompressionOptions) => Promise<void>
  sanitizeTasks: () => void
}

export type AppState = UISlice & LogSlice & SettingsSlice & SystemSlice & VideoSlice
