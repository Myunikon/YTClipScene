import { useRef, useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { exists } from '@tauri-apps/plugin-fs'
import { downloadDir } from '@tauri-apps/api/path'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { notify } from './lib/notify'
import { useAppStore } from './store'
import { translations } from './lib/locales'
import { AddDialog } from './components/AddDialog'
import { HistoryView } from './components/HistoryView'
import { Onboarding } from './components/Onboarding'
import { ClipboardListener } from './components/ClipboardListener'
import { SettingsView } from './components/SettingsView'
import { DownloadsView } from './components/DownloadsView'
import { GuideModal, GuideModalRef } from './components/GuideModal'
import { ShortcutsPopover } from './components/ShortcutsPopover'
import { AppHeader } from './components/layout/AppHeader'
import { AppLayout } from './components/layout/AppLayout'
import { ContextMenu } from './components/ContextMenu'
import { StatusBar } from './components/StatusBar'

type ViewState = 'downloads' | 'settings' | 'history'

function App() {
  const { settings } = useAppStore()
  const [activeTab, setActiveTab] = useState<ViewState>('downloads')
  const [clipboardUrl, setClipboardUrl] = useState('')
  const [previewLang, setPreviewLang] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Dialog Refs
  const addDialogRef = useRef<any>(null)
  const guideModalRef = useRef<GuideModalRef>(null)

  const t = translations[(previewLang ?? settings.language) as keyof typeof translations]
  const theme = settings.theme
  
  // Online/Offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  /* -------------------------------------------------------------------------- */
  /* QUICK DOWNLOAD HANDLER                                                     */
  /* -------------------------------------------------------------------------- */
  const handleNewTask = async (url?: string) => {
    const { settings } = useAppStore.getState()
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager')
    const { notify } = await import('./lib/notify')

    // 1. Get Target URL (Argument or Clipboard)
    let targetUrl = url
    if (!targetUrl && settings.quickDownloadEnabled) {
       try {
           const clipText = await readText()
           // Basic URL validation
           if (clipText && (clipText.startsWith('http') || clipText.startsWith('www'))) {
               targetUrl = clipText
           }
       } catch (e) { console.warn('Clipboard read failed', e) }
    }

    // 2. Try Quick Download
    if (targetUrl && settings.quickDownloadEnabled) {
        const quickUsed = await addDialogRef.current?.quickDownload(targetUrl)
        if (quickUsed) {
            notify.success('Quick Download Started', { 
                description: targetUrl.substring(0, 50) + '...',
                duration: 3000 
            })
            return // Done! Skip dialog
        }
    }

    // 3. Fallback: Open Dialog
    if (targetUrl) setClipboardUrl(targetUrl)
    // Small timeout to ensure state updates propagate if needed
    setTimeout(() => addDialogRef.current?.showModal(), 50)
  }

  // const addTask = (url: string, opts: any) => useAppStore.getState().addTask(url, opts)
  const addTask = (url: string, opts: any) => useAppStore.getState().addTask(url, opts)

  // Replaced simple openDialog with smart handler
  const openDialog = () => handleNewTask()

  /* -------------------------------------------------------------------------- */
  /* GLOBAL EVENT LISTENERS                                                     */
  /* -------------------------------------------------------------------------- */
  // Global Error Handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
        console.error("Global Error Caught:", event.error)
        notify.error("Unexpected Error", { 
            description: event.error?.message || "An unknown error occurred",
            duration: 10000,
            action: {
                label: "Reload",
                onClick: () => window.location.reload()
            }
        })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
        console.error("Unhandled Promise Rejection:", event.reason)
        // Extract useful message from various rejection shapes
        let message = "Unknown error"
        if (event.reason instanceof Error) message = event.reason.message
        else if (typeof event.reason === 'string') message = event.reason
        else if (event.reason?.message) message = event.reason.message

        notify.error("Unhandled Async Error", { 
            description: message,
            duration: 10000 
        })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  // Initial Theme Application
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(settings.theme)
  }, [settings.theme])

  // Low Performance Mode Application
  useEffect(() => {
      if (settings.lowPerformanceMode) {
          document.body.classList.add('low-perf-mode')
      } else {
          document.body.classList.remove('low-perf-mode')
      }
  }, [settings.lowPerformanceMode])

  // Window Close Handler (Scheduler Protection & Minimize logic)
  useEffect(() => {
      let unlisten: () => void;
      const setupListener = async () => {
          unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
              const state = useAppStore.getState()
              const hasScheduled = state.tasks.some(t => t.status === 'scheduled')
              const hasActive = state.tasks.some(t => t.status === 'downloading' || t.status === 'fetching_info')

              // Priority 1: Scheduler Protection
              if (hasScheduled) {
                  event.preventDefault()
                  await getCurrentWindow().minimize()
                  notify.warning("Scheduler Active ⏳", {
                      description: "App minimized to background to keep the timer running. Don't close it!",
                      duration: 5000
                  })
                  return
              }

              // Priority 2: Active Downloads Protection (Optional, but good UX)
              if (hasActive && state.settings.closeAction === 'minimize') {
                   event.preventDefault()
                   await getCurrentWindow().minimize()
                   notify.info("Downloads Running ⬇️", {
                       description: "App minimized to continue downloading.",
                   })
                   return
              }

              // Priority 3: User Preference
              if (state.settings.closeAction === 'minimize') {
                  event.preventDefault()
                  await getCurrentWindow().minimize()
              }
          })
      }
      setupListener()
      return () => { if (unlisten) unlisten() }
  }, [])

  // Font Size Application
  useEffect(() => {
    const root = document.documentElement
    // Map sizes to pixel values (assuming base 16px)
    // Small: 14px (87.5%), Medium: 16px (100%), Large: 18px (112.5%)
    const sizeMap: Record<string, string> = {
        small: '13px',
        medium: '16px',
        large: '20px'
    }
    
    // Safety check for existing setting, fallback to medium
    const targetSize = sizeMap[settings.frontendFontSize || 'medium']
    root.style.fontSize = targetSize
  }, [settings.frontendFontSize])


  // Scheduler Logic: Check every 10s
  useEffect(() => {
      const interval = setInterval(() => {
          const { tasks, updateTask, processQueue } = useAppStore.getState()
          const now = Date.now()
          
          let needsProcessing = false
          tasks.forEach(task => {
              if (task.status === 'scheduled' && task.scheduledTime) {
                  const scheduledTimeMs = new Date(task.scheduledTime).getTime()
                  if (scheduledTimeMs <= now) {
                      // Time to run!
                      updateTask(task.id, { status: 'pending', scheduledTime: undefined, log: 'Scheduled start triggered' })
                      needsProcessing = true
                  }
              }
          })
          
          if (needsProcessing) {
              processQueue()
          }
      }, 10000) // Check every 10 seconds for scheduled tasks
      
      return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Global Key Bindings
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'q') return // Let toggle sidebar work (if exists)
        
        // Open Add Dialog
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault()
            handleNewTask()
        }

        // Settings
        if (e.ctrlKey && e.key === ',') {
            e.preventDefault()
            setActiveTab('settings')
        }

        // History
        if (e.ctrlKey && e.key === 'h') {
             e.preventDefault()
             setActiveTab('history')
        }

        // Downloads (Home)
        if (e.ctrlKey && e.key === 'd') {
             e.preventDefault()
             setActiveTab('downloads')
        }

        // F11 Fullscreen
        if (e.key === 'F11') {
            e.preventDefault()
            const win = getCurrentWindow()
            const isFull = await win.isFullscreen()
            await win.setFullscreen(!isFull)
        }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settings.theme])


  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState({ 
      visible: false, 
      x: 0, 
      y: 0,
      hasLink: false,
      linkUrl: ''
  })

  // Disable Default & Show Custom Menu
  useEffect(() => {
    const handleContextMenu = async (e: MouseEvent) => {
        e.preventDefault() 
        
        // Detect Link
        const target = e.target as HTMLElement
        const link = target.closest('a')
        const linkUrl = link ? link.href : ''

        setContextMenu({ 
            visible: true, 
            x: e.clientX, 
            y: e.clientY,
            hasLink: !!linkUrl,
            linkUrl
        })
    }
    document.addEventListener('contextmenu', handleContextMenu)
    
    // Close on any click
    const handleClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev)
    window.addEventListener('click', handleClick)

    return () => {
        document.removeEventListener('contextmenu', handleContextMenu)
        window.removeEventListener('click', handleClick)
    }
  }, [])

  /* -------------------------------------------------------------------------- */
  /* STARTUP VALIDATION: Check Download Path & Sanitize Tasks                    */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    // 1. Validate Path
    const validatePath = async () => {
        const { settings, setSetting } = useAppStore.getState()
        if (settings.downloadPath) {
            try {
                const isValid = await exists(settings.downloadPath)
                if (!isValid) {
                    const defaultPath = await downloadDir()
                    setSetting('downloadPath', defaultPath)
                }
            } catch (e) {
                console.error("Failed to validate path:", e)
            }
        }
    }
    validatePath()

    // 2. Sanitize Tasks (Reset 'stuck' active states from persistent store)
    useAppStore.getState().sanitizeTasks()
  }, [])

  /* -------------------------------------------------------------------------- */
  /* START MINIMIZED: Hide window on startup if enabled                          */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const checkStartMinimized = async () => {
        const { settings } = useAppStore.getState()
        if (settings.startMinimized) {
            try {
                const appWindow = getCurrentWindow()
                await appWindow.hide()
            } catch (e) {
                console.warn('window.hide not available:', e)
            }
        }
    }
    checkStartMinimized()
  }, [])

  useEffect(() => {
    let unlisten: Promise<() => void> | undefined;

    const setupListener = async () => {
        try {
            const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
            
            unlisten = onOpenUrl(async (urls) => {
                console.log('Deep link received:', urls)
                for (const url of urls) {
                    try {
                        // Support both clipscene://download?url=... and just raw clipscene://...
                        const urlObj = new URL(url)
                        const targetUrl = urlObj.searchParams.get('url')
                        
                        if (targetUrl) {
                            // Standardized handler for all tasks (Deep Link, Clipboard, Shortcuts)
                            handleNewTask(targetUrl)
                        }
                    } catch (e) {
                        console.error('Failed to parse deep link:', e)
                    }
                }
            })
        } catch (e) {
            console.error('Deep link plugin not initialized', e)
        }
    }
    
    setupListener()
    
    return () => {
        if (unlisten) unlisten.then(f => f())
    }
  }, [])

  /* -------------------------------------------------------------------------- */
  /* THEME TOGGLE (With View Transition)                                        */
  /* -------------------------------------------------------------------------- */
  const toggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    const update = () => {
        useAppStore.getState().updateSettings({ ...settings, theme: newTheme })
    }

    if (!document.startViewTransition) {
        update()
        return
    }

    const transition = document.startViewTransition(async () => {
        update()
    })

    try {
        await transition.ready
        const clipPath = [`circle(0px at top left)`, `circle(250% at top left)`]
        document.documentElement.animate(
            { clipPath: theme === 'dark' ? [...clipPath].reverse() : clipPath },
            { duration: 500, easing: "ease-in-out", pseudoElement: theme === 'dark' ? "::view-transition-old(root)" : "::view-transition-new(root)" }
        )
    } catch (e) { console.error(e) }
  }

  return (
    <MotionConfig 
      reducedMotion={settings.lowPerformanceMode ? "always" : "never"}
      transition={settings.lowPerformanceMode ? { duration: 0 } : undefined}
    >
    <AppLayout isOffline={isOffline} language={settings.language}>
        <AppHeader 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            t={t as any} 
            openDialog={openDialog}
            onOpenGuide={() => guideModalRef.current?.showModal()}
            onOpenShortcuts={() => setShowShortcuts(true)}
        />
        
        {/* Shortcuts Popover */}
        <ShortcutsPopover isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
             {!settings.lowPerformanceMode && (
                 <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
             )}
 
             <div className="relative z-10 h-full overflow-hidden grid grid-cols-1 grid-rows-1">
                 <AnimatePresence>
                    {activeTab === 'downloads' && (
                        <motion.div 
                            key="downloads"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="p-6 max-w-6xl mx-auto w-full h-full flex flex-col col-start-1 row-start-1"
                        >
                             <div className="flex-1 border rounded-xl bg-card/60 backdrop-blur-md shadow-sm overflow-hidden flex flex-col border-white/5">
                                 <DownloadsView />
                             </div>
                        </motion.div>
                    )}
                    
                    {activeTab === 'history' && (
                        <motion.div 
                            key="history"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="p-6 w-full h-full col-start-1 row-start-1"
                        >
                            <HistoryView />
                        </motion.div>
                    )}
                    
                    {activeTab === 'settings' && (
                        <motion.div 
                            key="settings"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full h-full col-start-1 row-start-1 bg-card/60 backdrop-blur-md rounded-xl border border-white/10 shadow-xl overflow-hidden"
                        >
                            <SettingsView toggleTheme={toggleTheme} setPreviewLang={setPreviewLang} />
                        </motion.div>
                    )}
                 </AnimatePresence>
             </div>
        </div>

        <ClipboardListener onFound={(url) => handleNewTask(url)} />

       <AddDialog ref={addDialogRef} addTask={addTask} initialUrl={clipboardUrl} previewLang={previewLang} isOffline={isOffline} />
       <GuideModal ref={guideModalRef} />
       <Onboarding />

       <ContextMenu 
            x={contextMenu.x}
            y={contextMenu.y}
            visible={contextMenu.visible}
            onClose={() => setContextMenu(c => ({ ...c, visible: false }))}
       />
       
       <StatusBar />
       <Toaster position="bottom-right" theme={theme as any} richColors expand={true} className="!z-[9999]" toastOptions={{ style: { marginBottom: '28px', marginRight: '2px' } }} />
    </AppLayout>
    </MotionConfig>
  )
}

export default App
