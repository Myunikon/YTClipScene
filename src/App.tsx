import { useRef, useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { exists } from '@tauri-apps/plugin-fs'
import { downloadDir } from '@tauri-apps/api/path'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
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

  const addTask = (url: string, opts: any) => useAppStore.getState().addTask(url, opts)
  const openDialog = () => addDialogRef.current?.showModal()

  /* -------------------------------------------------------------------------- */
  /* GLOBAL EVENT LISTENERS                                                     */
  /* -------------------------------------------------------------------------- */
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

  // Scheduler Logic: Check every 10s
  useEffect(() => {
      const interval = setInterval(() => {
          const { tasks, updateTask, processQueue } = useAppStore.getState()
          const now = Date.now()
          
          let needsProcessing = false
          tasks.forEach(task => {
              if (task.status === 'scheduled' && task.scheduledTime && task.scheduledTime <= now) {
                  // Time to run!
                  updateTask(task.id, { status: 'pending', scheduledTime: undefined, log: 'Scheduled start triggered' })
                  needsProcessing = true
              }
          })
          
          if (needsProcessing) {
              processQueue()
          }
      }, 10000) 
      
      return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Global Key Bindings
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'q') return // Let toggle sidebar work (if exists)
        
        // Open Add Dialog
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault()
            openDialog()
        }

        // Settings
        if (e.ctrlKey && e.key === ',') {
            e.preventDefault()
            setActiveTab('settings')
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
  /* STARTUP VALIDATION: Check Download Path                                     */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
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

  /* -------------------------------------------------------------------------- */
  /* WINDOW CLOSE INTERCEPTOR                                                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const appWindow = getCurrentWindow()
    const unlisten = appWindow.onCloseRequested(async (event) => {
        const currentSettings = useAppStore.getState().settings
        if (currentSettings.closeAction === 'minimize') {
            event.preventDefault()
            try {
                await appWindow.hide()
            } catch (e) {
                console.warn('window.hide not available:', e)
            }
        }
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  /* -------------------------------------------------------------------------- */
  /* DEEP LINK LISTENER (clipscene://)                                           */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    let unlisten: Promise<() => void> | undefined;

    const setupListener = async () => {
        try {
            const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
            unlisten = onOpenUrl((urls) => {
                console.log('Deep link received:', urls)
                for (const url of urls) {
                    try {
                        // Support both clipscene://download?url=... and just raw clipscene://...
                        const urlObj = new URL(url)
                        const targetUrl = urlObj.searchParams.get('url')
                        
                        if (targetUrl) {
                            setClipboardUrl(targetUrl)
                            // Small delay to ensure state updates
                            setTimeout(() => openDialog(), 100)
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
    <MotionConfig transition={settings.lowPerformanceMode ? { duration: 0 } : undefined}>
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
                             <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
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
                            className="w-full h-full col-start-1 row-start-1"
                        >
                            <SettingsView toggleTheme={toggleTheme} setPreviewLang={setPreviewLang} />
                        </motion.div>
                    )}
                 </AnimatePresence>
             </div>
        </div>

        <ClipboardListener onFound={(url) => { setClipboardUrl(url); addDialogRef.current?.showModal() }} />

       <AddDialog ref={addDialogRef} addTask={addTask} initialUrl={clipboardUrl} previewLang={previewLang} />
       <GuideModal ref={guideModalRef} />
       <Onboarding />

       <ContextMenu 
            x={contextMenu.x}
            y={contextMenu.y}
            visible={contextMenu.visible}
            onClose={() => setContextMenu(c => ({ ...c, visible: false }))}
       />
       
       <StatusBar />
       <Toaster position="bottom-right" theme={theme as any} richColors />
    </AppLayout>
    </MotionConfig>
  )
}

export default App
