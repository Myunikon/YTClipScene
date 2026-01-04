import { StateCreator } from 'zustand'
// No change needed here, just context.
import { AppState, SystemSlice } from './types'
import { downloadDir } from '@tauri-apps/api/path'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { toast } from 'sonner'
import { isTauriAvailable } from '../../lib/platform'
import { runBinaryValidation } from '../../lib/binary-validator'
import { getBinaryVersion } from '../../lib/updater-service'

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
                const hasNvidia = await invoke('check_gpu_support').catch(() => false)
                
                get().addLog(`GPU Detection: ${hasNvidia ? 'NVIDIA Enc Detected' : 'CPU Only'}`)
                set({ gpuType: hasNvidia ? 'nvidia' : 'cpu' })
             } catch(e) {
                 // Ignore invoke errors
             }
         }
      } catch (e) {
          console.error("GPU Check failed:", e)
      }
  },

  validateBinaries: async () => {
    // Delegated to service
    await runBinaryValidation((msg) => get().addLog(msg))
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
    
    console.log("Init Listeners (Tauri)")
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
        get().addLog('Checking bundled binaries...')
        
        const [ffVer, ytVer] = await Promise.all([
            getBinaryVersion('ffmpeg'),
            getBinaryVersion('yt-dlp')
        ])

        if (ffVer && ytVer) {
            get().addLog(`Binaries Found: ffmpeg=${ffVer}, yt-dlp=${ytVer}`)
            set({ binariesReady: true, ytdlpVersion: ytVer })
            get().detectHardwareAccel()
        } else {
             // If sidecar check fails, it means they are missing or permission denied
             get().addLog(`Missing binaries! ffmpeg=${ffVer}, yt-dlp=${ytVer}`)
             toast.error("Critical Error: Bundled binaries missing or not executable.")
             set({ binariesReady: false })
        }
            
        // Listen for Custom Downloader Events
        try {
            const { listen } = await import('@tauri-apps/api/event')
            await listen<any>('download-progress', (event) => {
                const { id, total_bytes, downloaded_bytes, status, speed } = event.payload
                
                const progress = total_bytes > 0 ? (downloaded_bytes / total_bytes) * 100 : 0
                const speedMB = (speed / 1024 / 1024).toFixed(2) + ' MB/s'
                
                let eta = '...'
                if (speed > 0 && total_bytes > downloaded_bytes) {
                    const remaining = total_bytes - downloaded_bytes
                    const sec = Math.ceil(remaining / speed)
                        eta = sec > 60 
                        ? `${Math.floor(sec / 60)}m ${sec % 60}s` 
                        : `${sec}s`
                } else if (status === 'completed') {
                    eta = 'Done'
                }

                let uiStatus: any = 'downloading'
                if (status === 'completed') uiStatus = 'completed'
                if (status.startsWith('error')) uiStatus = 'error'
                if (status === 'paused') uiStatus = 'paused'
                
                updateTask(id, {
                    status: uiStatus,
                    progress,
                    speed: speedMB,
                    eta,
                    log: status.startsWith('error') ? status : undefined
                })
                
                if (status === 'completed') {
                        sendNotification({ title: 'Download Complete', body: id })
                        toast.success(`Download Complete: ${id}`)
                        
                        // CHECK QUEUE STATUS FOR POST-ACTION
                        setTimeout(async () => {
                            const { tasks, settings } = get()
                            const active = tasks.filter(t => t.status === 'downloading' || t.status === 'pending')
                            
                            if (active.length === 0 && settings.postDownloadAction !== 'none') {
                                const action = settings.postDownloadAction
                                const actionName = action === 'shutdown' ? 'Shutting down' : 'Sleeping'
                                
                                sendNotification({ 
                                    title: 'Queue Finished', 
                                    body: `${actionName} system in 5 seconds...` 
                                })
                                toast.info(`Queue Finished: ${actionName} in 5s...`)
                                
                                get().addLog(`[System] Queue finished. Executing ${action} in 5s...`)
                                await new Promise(r => setTimeout(r, 5000))
                                
                                try {
                                    const { invoke } = await import('@tauri-apps/api/core')
                                    // NOTE: 'confirm: true' required by lib.rs security update
                                    await invoke('perform_system_action', { action, confirm: true })
                                } catch (e) {
                                    console.error("System action failed:", e)
                                }
                            }
                        }, 1000)
                }
            })
            console.log("Custom Downloader Listener Attached")
        } catch (e) {
            console.error("Failed to attach listener:", e)
        }
    } catch (e) {
        console.error("Binary check failed:", e)
        get().addLog(`Binary check failed: ${e}`)
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
          
          get().addLog(`[Version Check] yt-dlp: ${result.ytdlp.current} → ${result.ytdlp.latest || 'N/A'} (Update: ${result.ytdlp.hasUpdate})`)
          get().addLog(`[Version Check] FFmpeg: ${result.ffmpeg.current} → ${result.ffmpeg.latest || 'N/A'} (Update: ${result.ffmpeg.hasUpdate})`)
      } catch (e) {
          console.error('Version check failed:', e)
          get().addLog(`[Version Check] Failed: ${e}`)
      } finally {
          set({ isCheckingUpdates: false })
      }
  },
})
