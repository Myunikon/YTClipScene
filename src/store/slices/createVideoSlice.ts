import { StateCreator } from 'zustand'
import { AppState, VideoSlice, DownloadTask } from './types'
import { v4 as uuidv4 } from 'uuid'
import { Child } from '@tauri-apps/plugin-shell'
import { downloadDir, join } from '@tauri-apps/api/path'
// invoke removed

// Import Helper Lib
import { toast } from 'sonner'
import { buildYtDlpArgs, parseMetadata, sanitizeFilename, getYtDlpCommand } from '../../lib/ytdlp'

const activeProcessMap = new Map<string, Child>()
const activePidMap = new Map<string, number>() // Store PID for true pause

export const createVideoSlice: StateCreator<AppState, [], [], VideoSlice> = (set, get) => ({
  tasks: [],

  addTask: async (url, options) => {
    const id = uuidv4()
    const { settings, processQueue, tasks } = get()

    // Prevent duplicate downloads of same URL
    const existingTask = tasks.find(t => 
        t.url === url && 
        ['pending', 'downloading', 'fetching_info'].includes(t.status)
    )
    if (existingTask) {
        get().addLog(`[Queue] Duplicate URL ignored: ${url}`)
        return
    }

    let downloadPath = options.path || settings.downloadPath
    if (!downloadPath) {
        downloadPath = await downloadDir()
    }

    const newTask: DownloadTask = {
      id,
      url,
      title: 'Queueing...',
      status: options.scheduledTime ? 'scheduled' : 'pending',
      progress: 0,
      speed: '-',
      eta: '-',
      range: (options.rangeStart || options.rangeEnd) ? `${options.rangeStart || 0}-${options.rangeEnd || ''}` : 'Full',
      format: options.format || settings.resolution,
      path: downloadPath,
      scheduledTime: options.scheduledTime,
      _options: options
    };
    
    set(state => ({ tasks: [newTask, ...state.tasks] }))
    processQueue()
  },

  processQueue: () => {
      const { tasks, settings, startTask } = get()
      const active = tasks.filter(t => t.status === 'downloading').length
      const limit = settings.concurrentDownloads || 3
      
      if (active < limit) {
          const pending = tasks.find(t => t.status === 'pending')
          if (pending) {
              startTask(pending.id)
          }
      }
  },

  startTask: async (id) => {
    const { tasks, settings, updateTask } = get()
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const options = task._options || {}
    const url = task.url
    const downloadPath = task.path || settings.downloadPath




    // Check FFMPEG via sidecar
    try {
        const { getBinaryVersion } = await import('../../lib/updater-service')
        const version = await getBinaryVersion('ffmpeg')
        
        if (!version) {
            try {
                toast.error('Critical Error: FFmpeg binary missing.')
            } catch(e) {}
            return
        }
    } catch (e) {
        console.error("Binary check failed:", e)
    }

    updateTask(id, { status: 'fetching_info', speed: 'Fetching Info...', eta: '...', log: undefined })
    get().addLog(`Starting Task ${id}: Fetching stream info...`)

    // 1. DUMP JSON (Metadata Phase)
    const dumpArgs = ['--get-url', '--dump-json', '--no-playlist', url]
    // Add auth if needed for metadata too
    if (settings.cookieSource === 'browser') {
        dumpArgs.push('--cookies-from-browser', settings.browserType || 'chrome')
    } else if (settings.cookieSource === 'txt' && settings.cookiePath) {
        dumpArgs.push('--cookies', settings.cookiePath)
    }

    try {
        const command = await getYtDlpCommand(dumpArgs)
        const output = await command.execute()
        
        if (output.code !== 0) {
            const err = output.stderr
            if (err.includes('DPAPI') || err.includes('database is locked')) {
                 const msg = "Gagal mengakses Cookies Browser. Pastikan Browser sudah DITUTUP sepenuhnya."
                 toast.error('Cookie Access Failed', { description: 'Please close your browser.' })
                 throw new Error(msg)
            }
            if (err.includes('Sign in to confirm')) {
                 const msg = "Video ini memerlukan login (Age Restricted)."
                 toast.error('Age Restricted Video', { description: 'Use Browser Session in Settings.' })
                 throw new Error(msg)
            }
            throw new Error(`Gagal mengambil metadata: ${output.stderr.substring(0, 100)}...`)
        }

        const lines = output.stdout.split('\n').filter(l => l.trim())
        const { streamUrls, needsMerging, meta } = parseMetadata(lines)
        
        if (streamUrls.length === 0) {
             throw new Error("Could not parse stream URLs (No valid streams found)")
        }

        get().addLog(`Stream Found: ${streamUrls.length} sources. Merging Needed: ${needsMerging}`)
        
        // 2. Prepare Filename
        // IMPORTANT: Use settings.container (output format) NOT meta.ext (source format)
        // yt-dlp converts webm to mp4 via --merge-output-format, so filename must match
        const outputExt = options.format === 'audio' ? 'mp3' : (options.container || settings.container || 'mp4')
        
        let finalName: string
        if (options.customFilename) {
            // User-provided custom filename - sanitize and add extension
            let sanitized = options.customFilename.replace(/[\\/:*?"<>|]/g, '_').replace(/\\.\\./g, '').trim()
            // Add extension if not present
            if (!sanitized.toLowerCase().endsWith(`.${outputExt}`)) {
                sanitized = `${sanitized}.${outputExt}`
            }
            finalName = sanitized
        } else {
            // Template-based filename - override meta.ext with actual output extension
            const template = settings.filenameTemplate || '{title}.{ext}'
            const metaWithCorrectExt = { ...meta, ext: outputExt }
            finalName = sanitizeFilename(template, metaWithCorrectExt)
        }
        const fullOutputPath = await join(downloadPath, finalName)

        // 3. START DOWNLOAD (Native Phase)
        get().addLog(`Starting Native Download via yt-dlp for ${id} (Resumable)`)
        
        const nativeArgs = await buildYtDlpArgs(url, options, settings, fullOutputPath)

        try {
             const cmd = await getYtDlpCommand(nativeArgs)
             const _child = await cmd.spawn()
             
             activeProcessMap.set(id, _child)
             
             // Store PID for True Pause feature
             const pid = _child.pid
             if (pid) {
                 activePidMap.set(id, pid)
                 get().addLog(`[Process] Started PID ${pid} for task ${id}`)
             }
             
             // Store command for Developer Mode
             const ytdlpCommandStr = `yt-dlp ${nativeArgs.join(' ')}`
             
             updateTask(id, { 
                 status: 'downloading', 
                 title: finalName,
                 filePath: fullOutputPath,
                 speed: 'Starting Native Engine...',
                 eta: '...',
                 ytdlpCommand: ytdlpCommandStr,
                 concurrentFragments: settings.concurrentFragments || 4
             })

             cmd.on('close', (data: any) => {
                 activeProcessMap.delete(id)
                 activePidMap.delete(id) // Clean up PID on close 
                 if (data.code === 0) {
                     updateTask(id, { status: 'completed', progress: 100, speed: '-', eta: 'Done' })
                     get().addLog(`Native Task ${id} Completed.`)
                 } else {
                     updateTask(id, { status: 'error', log: `Native Process Failed (Code ${data.code})` })
                 }
             })

             cmd.on('error', (err: any) => {
                  activeProcessMap.delete(id)
                  updateTask(id, { status: 'error', log: `Spawn Error: ${err}` })
             })
             
             cmd.stdout.on('data', (line: any) => {
                 const str = line.toString()
                 
                 // Get current task for state tracking
                 const currentTask = get().tasks.find(t => t.id === id)
                 const isClipping = task.range !== 'Full'
                 
                 // Track download phases explicitly by detecting new Destination lines
                 // yt-dlp outputs "[download] Destination: filename" when starting each stream
                 if (isClipping && str.includes('[download] Destination:')) {
                     const currentPhase = (currentTask as any)?._downloadPhase || 0
                     updateTask(id, { _downloadPhase: currentPhase + 1 } as any)
                 }
                 
                 // Track multi-phase downloads (video + audio + merge)
                 if (str.includes('[download]')) {
                     const percentMatch = str.match(/(\d+\.?\d*)%/)
                     const speedMatch = str.match(/at\s+(\d+\.?\d*\w+\/s)/)
                     const etaMatch = str.match(/ETA\s+(\S+)/)

                     if (percentMatch) {
                         let p = parseFloat(percentMatch[1])
                         const s = speedMatch ? speedMatch[1] : '-'
                         const e = etaMatch ? etaMatch[1] : '-'
                         
                         // For clipped downloads: distribute progress across phases
                         // Phase 1 = video (0-45%), Phase 2 = audio (45-90%), Merge = 90-100%
                         if (isClipping) {
                             const phase = (currentTask as any)?._downloadPhase || 1
                             
                             if (phase === 1) {
                                 // Video phase: 0-45%
                                 p = p * 0.45
                             } else if (phase === 2) {
                                 // Audio phase: 45-90%
                                 p = 45 + (p * 0.45)
                             } else {
                                 // Additional phases if any: cap at 90%
                                 p = Math.min(90, 45 + (p * 0.45))
                             }
                         }
                         
                         updateTask(id, { progress: Math.min(p, 99), speed: s, eta: e })
                     }
                 }
                 
                 // Track merger progress for clips
                 if (str.includes('[Merger]') || str.includes('[ffmpeg]')) {
                     updateTask(id, { progress: 92, speed: 'Merging...', eta: '-' })
                 }
             })

             cmd.stderr.on('data', (line: any) => {
                 const str = line.toString()
                 if (str.includes('ERROR:') || str.includes('Traceback')) {
                     updateTask(id, { log: str })
                 }
             })
             
             return

        } catch (e) {
             throw new Error(`Failed to spawn native downloader: ${e}`)
        }
    } catch (e) {
        get().addLog(`Task Error: ${e}`)
        const msg = e instanceof Error ? e.message : String(e)
        updateTask(id, { status: 'error', log: msg })
    }
  },

  clearTask: (id) => {
    const { stopTask } = get()
    // Ensure process is killed before removing
    stopTask(id) 
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
  },

  deleteHistory: () => {
     set(state => ({ tasks: state.tasks.filter(t => t.status !== 'completed' && t.status !== 'stopped') }))
  },

  importTasks: (importedTasks) => {
    set(state => {
        // Filter out tasks that already exist by ID
        const existingIds = new Set(state.tasks.map(t => t.id))
        const newTasks = importedTasks.filter(t => !existingIds.has(t.id))
        return { tasks: [...state.tasks, ...newTasks] }
    })
  },

  updateTask: (id, updates) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }))
  },

  stopTask: async (id) => {
    const { tasks, updateTask } = get()
    const task = tasks.find(t => t.id === id)
    if(!task) return
    
    // Kill the active process if it exists
    const child = activeProcessMap.get(id)
    if (child) {
         try {
             await child.kill()
             get().addLog(`Killed Native Process for Task ${id}`)
         } catch (e) {
             console.error("Failed to kill child process:", e)
         }
         activeProcessMap.delete(id)
    }

    updateTask(id, { status: 'stopped', speed: '-', eta: 'Stopped' })
  },

  pauseTask: async (id) => {
      const { updateTask, tasks } = get()
      const task = tasks.find(t => t.id === id)
      if(!task) return

      // Kill logic to ensure download stops (yt-dlp resumes via --continue on restart)
      const child = activeProcessMap.get(id)
      if (child) {
          try {
              await child.kill()
              get().addLog(`[Pause] Killed process for task ${id} (will resume via restart)`)
          } catch(e) {
              console.error("Pause kill failed:", e)
          }
          activeProcessMap.delete(id)
          activePidMap.delete(id)
      }
      
      updateTask(id, { status: 'paused', speed: 'Paused', eta: '-' })
  },

  retryTask: async (id) => {
      const { tasks, updateTask, startTask } = get()
      const task = tasks.find(t => t.id === id)
      if(!task) return

      get().addLog(`Retrying Task ${id}...`)
      updateTask(id, { status: 'pending', speed: 'Retrying...', eta: '...', log: undefined }) 
      startTask(id)
  },

  resumeTask: async (id) => {
      const { tasks, updateTask, startTask } = get()
      const task = tasks.find(t => t.id === id)
      if(!task) return

      // Restart is the most robust resume method for yt-dlp
      get().addLog(`Resuming Task ${id} (Restart)...`)
      updateTask(id, { status: 'pending', speed: 'Resuming...', eta: '...' })
      startTask(id)
  }
})
