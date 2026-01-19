import { StateCreator } from 'zustand'
import { AppState, VideoSlice, DownloadTask, CompressionOptions } from './types'
import { v4 as uuidv4 } from 'uuid'
import { Command } from '@tauri-apps/plugin-shell'
import { downloadDir, join } from '@tauri-apps/api/path'

// Import Helper Libs
import { notify } from '../../lib/notify'
import {
    buildYtDlpArgs,
    parseMetadata,
    sanitizeFilename,
    getYtDlpCommand,
    parseYtDlpProgress,
    isErrorLine,
    getPostProcessStatusText
} from '../../lib/ytdlp'
import { stat, exists } from '@tauri-apps/plugin-fs'
import { BINARIES } from '../../lib/constants'

// Import Extracted Services
import {
    formatBytes,
    timeToSeconds,
    killProcessTree,
    activeProcessMap,
    activePidMap,
    startingTaskIds,
    cleanupTask
} from '../../lib/processUtils'
import {
    ffmpegTimeRegex,
    parseFFmpegProgress,
    parseFFmpegDuration,
    buildCompressionArgs,
    buildCompressedOutputPath,
    detectFileType
} from '../../lib/ffmpegService'


export const createVideoSlice: StateCreator<AppState, [], [], VideoSlice> = (set, get) => ({
    tasks: [],

    addTask: async (url, options) => {
        const id = uuidv4()
        const { settings, processQueue, tasks } = get()

        // Prevent duplicate downloads of same URL
        const existingTask = tasks.find(t =>
            t.url === url &&
            (t.status === 'downloading' || t.status === 'fetching_info')
        )
        if (existingTask) {
            get().addLog({ message: `[Queue] Duplicate URL ignored: ${url}`, type: 'warning' })
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
            // Check startingTaskIds to prevent race condition
            const pending = tasks.find(t =>
                t.status === 'pending' && !startingTaskIds.has(t.id)
            )
            if (pending) {
                startingTaskIds.add(pending.id) // Lock before async call
                startTask(pending.id)
            }
        }
    },

    startTask: async (id) => {
        const { tasks, settings, updateTask } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) {
            startingTaskIds.delete(id) // Clean up if task not found
            return
        }

        // FIX RACE CONDITION: Mark as fetching immediately to prevent double-scheduling
        updateTask(id, { status: 'fetching_info' })
        startingTaskIds.delete(id) // Safe to unlock after status changed

        const options = task._options || {}
        const url = task.url
        const downloadPath = task.path || settings.downloadPath


        // Check FFMPEG via sidecar
        try {
            const { getBinaryVersion } = await import('../../lib/updater-service')
            const version = await getBinaryVersion('ffmpeg')

            if (!version) {
                notify.error('Critical Error: FFmpeg binary missing.')
                return
            }
        } catch (e) {
            console.error("Binary check failed:", e)
            notify.error('Failed to verify FFmpeg binary', { description: String(e) })
            return
        }

        updateTask(id, { status: 'fetching_info', speed: 'Fetching Info...', eta: '...', log: undefined })
        get().addLog({ message: `Starting Task ${id}: Fetching stream info...`, type: 'info' })


        // 1. DUMP JSON (Metadata Phase)
        // Anti-Hang: Add socket timeout to prevent indefinite loading
        const dumpArgs = ['--get-url', '--dump-json', '--no-playlist', '--encoding', 'utf-8', '--socket-timeout', '15', url]
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

                // Use new error mapper for user-friendly messages
                const { getHumanReadableError } = await import('../../lib/errors')
                const humanError = getHumanReadableError(err)

                if (humanError) {
                    notify.error(humanError.message, {
                        description: humanError.action,
                        duration: 8000
                    })
                    throw new Error(humanError.message)
                }

                // Fallback for unmapped errors
                throw new Error(`Failed to fetch metadata: ${output.stderr.substring(0, 150)}...`)
            }

            const lines = output.stdout.split('\n').filter(l => l.trim())
            const { streamUrls, needsMerging, meta } = parseMetadata(lines)

            if (streamUrls.length === 0) {
                throw new Error("Could not parse stream URLs (No valid streams found)")
            }

            get().addLog({ message: `Stream Found: ${streamUrls.length} sources. Merging Needed: ${needsMerging}`, type: 'info' })

            // 2. Prepare Filename

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
            const fullOutputPathRaw = await join(downloadPath, finalName)

            // Collision Defense: Check if file exists and auto-rename (Video_1.mp4)
            // This prevents silent overwriting/data loss
            let uniqueName = finalName
            let uniquePath = fullOutputPathRaw
            let counter = 1
            const MAX_COLLISION_ATTEMPTS = 1000 // Safety limit to prevent infinite loop

            while (await exists(uniquePath).catch(() => false) && counter < MAX_COLLISION_ATTEMPTS) {
                const namePart = finalName.lastIndexOf('.') !== -1 ? finalName.substring(0, finalName.lastIndexOf('.')) : finalName
                const extPart = finalName.lastIndexOf('.') !== -1 ? finalName.substring(finalName.lastIndexOf('.')) : ''
                uniqueName = `${namePart}_${counter}${extPart}`
                uniquePath = await join(downloadPath, uniqueName)
                counter++
            }

            const fullOutputPath = uniquePath

            // 3. START DOWNLOAD (Native Phase)
            get().addLog({ message: `Starting Native Download via yt-dlp for ${id} (Resumable)`, type: 'info' })

            const nativeArgs = await buildYtDlpArgs(url, options, settings, fullOutputPath, get().gpuType)

            try {
                const cmd = await getYtDlpCommand(nativeArgs)
                const _child = await cmd.spawn()

                activeProcessMap.set(id, _child)

                // Store PID for True Pause feature
                const pid = _child.pid
                if (pid) {
                    activePidMap.set(id, pid)
                    get().addLog({ message: `[Process] Started PID ${pid} for task ${id}`, type: 'info' })
                }

                // Store command for Developer Mode
                const ytdlpCommandStr = `yt-dlp ${nativeArgs.join(' ')}`

                updateTask(id, {
                    status: 'downloading',
                    title: finalName,
                    pid: pid, // Persist PID
                    filePath: fullOutputPath,
                    speed: 'Starting Native Engine...',
                    eta: '...',
                    ytdlpCommand: ytdlpCommandStr,
                    concurrentFragments: settings.concurrentFragments || 4,
                    chapters: meta.chapters, // Persist chapters
                    audioNormalization: options.audioNormalization || false
                })

                // Store last few stderr lines for better error reporting
                const stderrBuffer: string[] = []

                // Calculate Clip Duration for FFmpeg Progress
                const isClipping = options.rangeStart || options.rangeEnd
                let clipDuration = 0
                if (isClipping) {
                    const start = timeToSeconds(String(options.rangeStart || 0))
                    const end = options.rangeEnd ? timeToSeconds(String(options.rangeEnd)) : (meta?.duration || 0)
                    clipDuration = Math.max(1, end - start)
                }

                // Shared Progress Handler for stdout/stderr (Typed)
                let lastUpdate = 0
                const handleOutput = (line: string | Uint8Array) => {
                    const str = typeof line === 'string' ? line : new TextDecoder().decode(line)

                    // 1. Capture Error Buffer
                    if (isErrorLine(str)) {
                        stderrBuffer.push(str)
                        if (stderrBuffer.length > 5) stderrBuffer.shift()
                        updateTask(id, { log: str })
                    }

                    // 2. FFmpeg Progress Parsing (Real-time for Trimming)
                    if (isClipping && clipDuration > 0) {
                        const timeMatch = str.match(ffmpegTimeRegex)
                        if (timeMatch) {
                            const currentTimeStr = timeMatch[1]
                            const currentSeconds = timeToSeconds(currentTimeStr)
                            let percent = (currentSeconds / clipDuration) * 100
                            if (percent > 100) percent = 100

                            // Calculate ETA based on remaining duration
                            // Simple approach: assume ~real-time processing speed
                            const remainingSeconds = Math.max(0, clipDuration - currentSeconds)
                            const etaStr = remainingSeconds > 0
                                ? (remainingSeconds > 60 ? `~${Math.ceil(remainingSeconds / 60)}m` : `~${Math.ceil(remainingSeconds)}s`)
                                : '-'

                            // Update UI
                            updateTask(id, {
                                progress: percent,
                                speed: 'Processing Clip...',
                                eta: etaStr,
                                statusDetail: 'Processing Clip...'
                            })
                            return // Skip other parsing if matched
                        }
                    }

                    // 3. Normal yt-dlp Progress Parsing (Using Service)
                    const progressInfo = parseYtDlpProgress(str)
                    if (progressInfo) {
                        if (progressInfo.isPostProcess) {
                            // Post-processing stage
                            updateTask(id, {
                                progress: 99,
                                speed: '-',
                                eta: '-',
                                statusDetail: getPostProcessStatusText(progressInfo.postProcessType)
                            })
                        } else {
                            // Download progress
                            const newProgress = Math.min(progressInfo.percent, 99)
                            const currentTask = get().tasks.find(t => t.id === id)
                            const currentProgress = currentTask?.progress || 0

                            // SELF-HEALING: If we are getting progress but status is still 'fetching_info' (purple badge), force 'downloading'
                            // This corrects potential race conditions/batched updates
                            const extraUpdates: Partial<DownloadTask> = {}
                            if (currentTask?.status === 'fetching_info' && newProgress > 0) {
                                extraUpdates.status = 'downloading'
                            }

                            // Throttling: Update max 5 times/sec (200ms)
                            const now = Date.now()
                            if (now - lastUpdate > 200 || progressInfo.percent >= 100 || extraUpdates.status) {
                                updateTask(id, {
                                    progress: Math.max(currentProgress, newProgress),
                                    speed: progressInfo.speed,
                                    eta: progressInfo.eta,
                                    ...(progressInfo.totalSize && { totalSize: progressInfo.totalSize }),
                                    statusDetail: undefined, // Clear post-process status
                                    ...extraUpdates
                                })
                                lastUpdate = now
                            }
                        }
                    }
                }

                cmd.stderr.on('data', (line: string | Uint8Array) => {
                    // FFmpeg often sends status to stderr
                    handleOutput(line)
                })

                cmd.stdout.on('data', (line: string | Uint8Array) => {
                    handleOutput(line)
                })

                cmd.on('close', async (data: any) => {
                    activeProcessMap.delete(id)
                    activePidMap.delete(id) // Clean up PID on close 

                    // Fix: Trigger next download in queue
                    get().processQueue()

                    // Fix: Don't overwrite 'stopped' or 'paused' status with 'error'
                    // This happens because killing a process results in exit code 1 (or null)
                    const currentStatus = get().tasks.find(t => t.id === id)?.status
                    if (currentStatus === 'stopped' || currentStatus === 'paused') {
                        return
                    }

                    if (data.code === 0) {
                        // SEQUENTIAL SPLIT CHECK
                        // If we have chapters AND splitChapters was requested AND we did audio normalization (which disabled auto-split),
                        // then we must split now.
                        const taskNow = get().tasks.find(t => t.id === id)
                        const opts = taskNow?._options

                        if (opts?.splitChapters && opts?.audioNormalization && taskNow?.chapters && taskNow.chapters.length > 0) {
                            updateTask(id, {
                                statusDetail: 'Splitting Chapters (Sequential)...',
                                progress: 99,
                                speed: 'Splitting...'
                            })

                            try {
                                // Dynamically import split helper to keep slice clean
                                const { splitVideoByChapters } = await import('../../lib/ffmpegService')
                                await splitVideoByChapters(fullOutputPath, taskNow.chapters, (p) => {
                                    updateTask(id, { statusDetail: `Splitting: ${Math.round(p)}%` })
                                })

                                get().addLog({ message: `Sequential Split Completed for ${id}`, type: 'success' })

                                // Optional: Delete original large file? 
                                // For safety, let's keep it or maybe rename it to [Full] ...
                                // User usually expects just the parts.
                                // Let's settle on: Keep Full File so they have the normalized master.

                            } catch (e) {
                                get().addLog({ message: `Split Failed: ${e}`, type: 'error' })
                                updateTask(id, { log: `Split Failed: ${e}` })
                                // Don't fail the whole task, the download is good.
                            }
                        }

                        // Metadata capture
                        let sizeStr = '-'
                        try {
                            const fileStat = await stat(fullOutputPath)
                            sizeStr = formatBytes(fileStat.size)
                        } catch (e) {
                            console.error("Failed to stat file:", e)
                        }

                        updateTask(id, {
                            status: 'completed',
                            progress: 100,
                            speed: '-',
                            eta: 'Done',
                            fileSize: sizeStr,
                            completedAt: Date.now()
                        })
                        get().addLog({ message: `Native Task ${id} Completed. Size: ${sizeStr}`, type: 'success' })
                    } else {
                        // Use captured error or last stderr lines
                        const currentLog = get().tasks.find(t => t.id === id)?.log
                        const fallbackError = stderrBuffer.join('\n') || `Native Process Failed (Code ${data.code})`

                        updateTask(id, {
                            status: 'error',
                            log: currentLog || fallbackError
                        })
                    }
                })

                cmd.on('error', (err: any) => {
                    activeProcessMap.delete(id)
                    // Check for encoding error and provide helpful message
                    const errStr = String(err)
                    if (errStr.includes('utf-8') || errStr.includes('utf8')) {
                        updateTask(id, { status: 'error', log: 'Encoding Error: Video title contains special characters.' })
                    } else {
                        updateTask(id, { status: 'error', log: `Spawn Error: ${err}` })
                    }
                })



                return

            } catch (e) {
                throw new Error(`Failed to spawn native downloader: ${e}`)
            }
        } catch (e) {
            get().addLog({ message: `Task Error: ${e}`, type: 'error' })
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
        if (!task) return

        // SAFEGUARD: Prevent stopping during Merge phase (Critical Risk of Corruption)
        if (task.speed === 'Merging...') {
            notify.error("Cannot stop during Merging phase", {
                description: "Stopping now would corrupt the file. Please wait a moment."
            })
            return
        }

        // Kill the entire process tree (yt-dlp + ffmpeg children)
        const pid = activePidMap.get(id) || task.pid
        if (pid) {
            await killProcessTree(pid, get().addLog)
        }

        // Also try child.kill() as backup
        const child = activeProcessMap.get(id)
        if (child) {
            try { await child.kill() } catch (e) { /* ignore */ }
        }

        activeProcessMap.delete(id)
        activePidMap.delete(id)
        updateTask(id, { status: 'stopped', speed: '-', eta: 'Stopped' })
    },

    pauseTask: async (id) => {
        const { updateTask, tasks } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        // SAFEGUARD: Prevent pausing during Merge phase
        if (task.speed === 'Merging...') {
            notify.error("Cannot pause during Merging phase", {
                description: "Process is finalizing. Please wait."
            })
            return
        }

        // Kill entire process tree (yt-dlp + ffmpeg) to truly pause
        // yt-dlp will resume via --continue when restarted
        const pid = activePidMap.get(id) || task.pid
        if (pid) {
            await killProcessTree(pid, get().addLog)
        }

        // Also try child.kill() as backup
        const child = activeProcessMap.get(id)
        if (child) {
            try { await child.kill() } catch (e) { /* ignore */ }
        }

        activeProcessMap.delete(id)
        activePidMap.delete(id)
        updateTask(id, { status: 'paused', speed: 'Paused', eta: '-' })
    },

    retryTask: async (id) => {
        const { tasks, updateTask, startTask } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        get().addLog({ message: `Retrying Task ${id}...`, type: 'info' })

        // Attempt to clean up potential corrupted/partial files that cause 416 errors

        // Attempt to clean up potential corrupted/partial files that cause 416 errors
        if (task.filePath) {
            try {
                // Import remove dynamically to avoid top-level issues if not used
                const { remove, exists } = await import('@tauri-apps/plugin-fs')

                const filesToDelete = [
                    task.filePath, // The main file (e.g. video.mp4)
                    `${task.filePath}.part`, // yt-dlp partial
                    `${task.filePath}.ytdl`, // yt-dlp temp
                    `${task.filePath}.webm`, // potential intermediate
                    `${task.filePath}.m4a`   // potential intermediate
                ]

                for (const f of filesToDelete) {
                    if (await exists(f).catch(() => false)) {
                        await remove(f).catch(e => console.warn(`Failed to delete ${f}:`, e))
                        get().addLog({ message: `[Cleanup] Deleted stale file: ${f}`, type: 'info' })
                    }
                }
            } catch (e) {
                console.warn("Cleanup failed during retry:", e)
            }
        }

        updateTask(id, { status: 'pending', progress: 0, speed: 'Retrying...', eta: '...', log: undefined })

        // Prevent race condition: Lock task before starting
        if (!startingTaskIds.has(id)) {
            startingTaskIds.add(id)
            startTask(id)
        }
    },

    resumeTask: async (id) => {
        const { tasks, updateTask, startTask } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        // Restart is the most robust resume method for yt-dlp
        // The --continue flag will resume from the .part file
        get().addLog({ message: `Resuming Task ${id} (Restart)...`, type: 'info' })
        // Keep the current progress - don't reset to 0
        // yt-dlp with --continue will resume from .part file
        updateTask(id, { status: 'pending', speed: 'Resuming...', eta: '...' })

        // Prevent race condition: Lock task before starting
        if (!startingTaskIds.has(id)) {
            startingTaskIds.add(id)
            startTask(id)
        }
    },

    compressTask: async (taskId: string, options: CompressionOptions) => {
        const { tasks, settings, updateTask } = get()
        const originalTask = tasks.find(t => t.id === taskId)
        if (!originalTask || !originalTask.filePath) return

        // Use service functions
        const fileType = detectFileType(originalTask.filePath)
        let outputPath = buildCompressedOutputPath(originalTask.filePath)

        // AUTO-RENAME / OVERWRITE PROTECTION
        let counter = 1
        const maxAttempts = 100
        let uniquePath = outputPath

        try {
            // Check if default "_compress.mp4" exists
            while (await exists(uniquePath).catch(() => false) && counter < maxAttempts) {
                // Insert counter before extension: video_compress_1.mp4
                const dotIndex = outputPath.lastIndexOf('.')
                const base = dotIndex !== -1 ? outputPath.substring(0, dotIndex) : outputPath
                const ext = dotIndex !== -1 ? outputPath.substring(dotIndex) : ''
                uniquePath = `${base}_${counter}${ext}`
                counter++
            }
            outputPath = uniquePath
        } catch (e) {
            console.warn("Failed to check existence for compression output, risking overwrite.", e)
        }

        const args = buildCompressionArgs(originalTask.filePath, outputPath, options, fileType)

        // Create New Task
        const newId = uuidv4()
        const newTask: DownloadTask = {
            id: newId,
            url: originalTask.filePath,
            title: `Compressing: ${originalTask.title}`,
            status: 'downloading',
            statusDetail: 'Initializing Compression...',
            progress: 0,
            speed: 'Starting...',
            eta: '...',
            filePath: outputPath,
            fileSize: '-',
            completedAt: undefined,
            path: settings.downloadPath
        }

        set(state => ({ tasks: [newTask, ...state.tasks] }))

        // Spawn Process - Use sidecar binary for consistency with download tasks
        try {
            const cmd = Command.sidecar(BINARIES.FFMPEG, args)

            let durationSec = 0

            const child = await cmd.spawn()
            activeProcessMap.set(newId, child)
            activePidMap.set(newId, child.pid)

            updateTask(newId, { pid: child.pid, statusDetail: 'Encoding...' })

            cmd.on('close', async (data) => {
                cleanupTask(newId)

                if (data.code === 0) {
                    const { size: sizeBytes } = await stat(outputPath).catch(() => ({ size: 0 }))
                    updateTask(newId, {
                        status: 'completed',
                        progress: 100,
                        fileSize: formatBytes(sizeBytes),
                        completedAt: Date.now(),
                        statusDetail: 'Compressed'
                    })
                    notify.success("Compression Complete", { description: newTask.title })
                } else {
                    updateTask(newId, { status: 'error', log: `FFmpeg Exited with Code ${data.code}` })
                }
            })

            // Parse Progress (Using service function)
            cmd.stderr.on('data', (event: string | Uint8Array) => {
                const line = typeof event === 'string'
                    ? event
                    : new TextDecoder().decode(event)

                // 1. Catch Duration
                const parsedDuration = parseFFmpegDuration(line)
                if (parsedDuration !== null && !durationSec) {
                    durationSec = parsedDuration
                }

                // 2. Parse progress using service
                const progressEvent = parseFFmpegProgress(line, durationSec)
                if (progressEvent) {
                    updateTask(newId, {
                        progress: progressEvent.percent,
                        speed: progressEvent.speed,
                        eta: progressEvent.eta
                    })
                }
            })

        } catch (e) {
            updateTask(newId, { status: 'error', log: String(e) })
        }
    },

    sanitizeTasks: () => {
        set(state => ({
            tasks: state.tasks.map(t => {
                // Reset "stuck" states that are active but have no running process (e.g. after restart)
                if (t.status === 'fetching_info' || t.status === 'downloading') {
                    return {
                        ...t,
                        status: 'stopped',
                        speed: '-',
                        eta: '-',
                        pid: undefined,
                        statusDetail: 'Interrupted by App Restart'
                    }
                }
                // Also reset pending to stopped? No, let pending stay pending (queue)
                return t
            })
        }))
    }
})
