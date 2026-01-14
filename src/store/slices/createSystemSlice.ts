import { StateCreator } from 'zustand'
// No change needed here, just context.
import { AppState, SystemSlice } from './types'
import { downloadDir } from '@tauri-apps/api/path'
import { notify } from '../../lib/notify'
import { isTauriAvailable } from '../../lib/platform'
import { runBinaryValidation } from '../../lib/binary-validator'
import { getBinaryVersion } from '../../lib/updater-service'
import { translations } from '../../lib/locales'
import { Command } from '@tauri-apps/plugin-shell'

export const createSystemSlice: StateCreator<AppState, [], [], SystemSlice> = (set, get) => ({
  binariesReady: false,
  listenersInitialized: false,
  hasNotifiedMissingBinaries: false,
  gpuType: 'cpu',
  
  // yt-dlp Version Tracking
  ytdlpVersion: null,
  ytdlpLatestVersion: null,
  ytdlpNeedsUpdate: false,
  
  // FFmpeg Version Tracking
  ffmpegVersion: null,
  ffmpegLatestVersion: null,
  ffmpegNeedsUpdate: false,
  
  // Loading state
  isCheckingUpdates: false,

  setBinariesReady: (ready) => set({ binariesReady: ready }),

  detectHardwareAccel: async () => {
      try {
         // With sidecar, we assume it works or user verifies manually.
         // Simple check if ffmpeg is versionable
         const version = await getBinaryVersion('ffmpeg')
         
         if (version) {
             try {
                const { invoke } = await import('@tauri-apps/api/core')
                
                // 1. CPU DIAGNOSTIC (First, as requested)
                try {
                     const cmd = Command.create('run-powershell', [
                        '-NoProfile',
                        '-Command',
                        "Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, L3CacheSize | Format-List"
                     ])
                     const output = await cmd.execute()
                     const cpuLog = output.stdout || output.stderr
                     
                     get().addLog({ message: `[CPU DETECT DIAGNOSTIC]\n${cpuLog.trim()}`, type: 'info' })
                } catch (e) {
                    console.warn("CPU Check failed:", e)
                    get().addLog({ message: `[CPU Error] Failed to detect CPU details: ${e}`, type: 'error' })
                }
                
                // 2. GPU DIAGNOSTIC
                // Backend now returns GpuInfo struct
                interface GpuInfo { vendor: string, model: string, renderer: string, debug_info: string }
                const gpuInfo = await invoke<GpuInfo>('check_gpu_support')
                
                let logMsg = `GPU Detection: ${gpuInfo.vendor !== 'none' && gpuInfo.vendor !== 'cpu' ? gpuInfo.model : 'CPU Only'}`
                if (gpuInfo.renderer.includes('Software')) {
                    logMsg += ' (FFmpeg Hardware Encoder Unavailable)'
                } else {
                    logMsg += ` [Renderer: ${gpuInfo.renderer}]`
                }
                get().addLog({ message: logMsg, type: 'info' })
                get().addLog({ message: `[GPU DETECT DIAGNOSTIC]\n${gpuInfo.debug_info}`, type: 'info' })
                

                
                // Validate against known types
                const validTypes = ['nvidia', 'amd', 'intel', 'cpu']
                // Use OS vendor if valid, even if renderer is software (to show the name)
                const finalType = validTypes.includes(gpuInfo.vendor) ? gpuInfo.vendor : 'cpu'
                
                set({ 
                    gpuType: finalType as 'nvidia' | 'amd' | 'intel' | 'cpu',
                    gpuModel: gpuInfo.model,
                    gpuRenderer: gpuInfo.renderer
                })
             } catch(e) {
                 console.error("GPU details fetch failed:", e)
                 get().addLog({ message: `[GPU Error] Backend check failed: ${e}`, type: 'error' })
             }
         }
      } catch (e) {
          console.error("GPU Check failed:", e)
      }
  },

  validateBinaries: async () => {
    // Delegated to service
    const lang = get().settings.language || 'en'
    await runBinaryValidation((entry) => get().addLog(entry), lang)
  },

  initListeners: async () => {
    // Guard to prevent multiple calls
    if (get().listenersInitialized) {
        return
    }
    set({ listenersInitialized: true })
    
    // Check if running in Tauri context
    if (!isTauriAvailable()) {
        console.warn("Tauri not available, running in browser-only mode")
        return
    }
    

    const { settings, setSetting, tasks, updateTask } = get()
    
    // CRASH RECOVERY
    let recoveredCount = 0
    tasks.forEach(t => {
        if (t.status === 'downloading') {
            updateTask(t.id, { status: 'paused', speed: '-', eta: 'Interrupted' })
            recoveredCount++
        }
    })

    if (!settings.downloadPath) {
         const defaultPath = await downloadDir()
         setSetting('downloadPath', defaultPath)
    }
    
    // Check for Binaries (Sidecar Check)
    try {
        get().addLog({ message: 'Checking bundled binaries...', type: 'info' })
        
        const [ffVer, ytVer] = await Promise.all([
            getBinaryVersion('ffmpeg'),
            getBinaryVersion('yt-dlp')
        ])

        if (ffVer && ytVer) {
            get().addLog({ message: `Binaries Found: ffmpeg=${ffVer}, yt-dlp=${ytVer}`, type: 'success' })
            set({ binariesReady: true, ytdlpVersion: ytVer })
            get().detectHardwareAccel()
        } else {
             // If sidecar check fails, it means they are missing or permission denied
             get().addLog({ message: `Missing binaries! ffmpeg=${ffVer}, yt-dlp=${ytVer}`, type: 'error' })
             notify.error("Critical Error: Bundled binaries missing or not executable.")
             set({ binariesReady: false })
        }
            
    } catch (e) {
        console.error("Binary check failed:", e)
        const t = translations[get().settings.language as keyof typeof translations]?.errors || translations.en.errors
        notify.error(t.binary_validation, { description: String(e) })
        get().addLog({ message: `Binary check failed: ${e}`, type: 'error' })
    }
  },

  checkBinaryUpdates: async () => {
      set({ isCheckingUpdates: true })
      try {
          const { checkForUpdates } = await import('../../lib/updater-service')
          const result = await checkForUpdates()
          
          set({
              ytdlpVersion: result.ytdlp.current,
              ytdlpLatestVersion: result.ytdlp.latest,
              ytdlpNeedsUpdate: result.ytdlp.hasUpdate,
              ffmpegVersion: result.ffmpeg.current,
              ffmpegLatestVersion: result.ffmpeg.latest,
              ffmpegNeedsUpdate: result.ffmpeg.hasUpdate
          })
          
          get().addLog({ message: `[Version Check] yt-dlp: ${result.ytdlp.current} → ${result.ytdlp.latest || 'N/A'} (Update: ${result.ytdlp.hasUpdate})`, type: 'info' })
          get().addLog({ message: `[Version Check] FFmpeg: ${result.ffmpeg.current} → ${result.ffmpeg.latest || 'N/A'} (Update: ${result.ffmpeg.hasUpdate})`, type: 'info' })
      } catch (e) {
          console.error('Version check failed:', e)
          const t = translations[get().settings.language as keyof typeof translations]?.errors || translations.en.errors
          notify.error(t.update_check, { description: String(e) })
          get().addLog({ message: `[Version Check] Failed: ${e}`, type: 'error' })
      } finally {
          set({ isCheckingUpdates: false })
      }
  },
})
