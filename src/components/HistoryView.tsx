import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { notify } from '../lib/notify'
import { useAppStore, DownloadTask } from '../store'
import { translations } from '../lib/locales'
import { FolderOpen, Play, Trash2, FileVideo, Globe, Calendar, HardDrive, Terminal, RefreshCw, AlertCircle, Search, ArrowUp, ArrowDown, MoreVertical, MapPin, Minimize2, ListChecks } from 'lucide-react'
import { openPath } from '@tauri-apps/plugin-opener'
import { exists } from '@tauri-apps/plugin-fs'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { CommandModal } from './CommandModal'
import { CompressDialog } from './CompressDialog'
import { Select } from './Select'
import { parseSize, formatRange } from '../lib/utils'

import youtubeIcon from '../assets/platforms/youtube.png'
import instagramIcon from '../assets/platforms/instagram.png'
import tiktokIcon from '../assets/platforms/tiktok.png'
import facebookIcon from '../assets/platforms/facebook.png'
import xIcon from '../assets/platforms/x.png'

interface HistoryRowProps {
    task: DownloadTask
    language: string 
    onOpenFolder: (path: string) => void
    onPlayFile: (path: string) => void
    onRemove: (id: string) => void
    onRetry: (id: string) => void
    onRefreshPath: (id: string) => void // Relocate file
    onCompress: (task: DownloadTask) => void // NEW: Compress file
    onViewCommand: (task: DownloadTask) => void
    style: React.CSSProperties
    showPlayButton: boolean
    showCommandButton: boolean
    isMissing?: boolean
    index: number
    lowPerf: boolean
    // Selection Mode Props
    isSelectionMode: boolean
    isSelected: boolean
    onToggleSelect: (id: string) => void
}

const HistoryRow = memo(({ style, task, language, onOpenFolder, onPlayFile, onRemove, onRetry, onRefreshPath, onCompress, onViewCommand, showPlayButton, showCommandButton, isMissing, index, lowPerf, isSelectionMode, isSelected, onToggleSelect }: HistoryRowProps) => {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    
    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }
        if (showMenu) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMenu])

    if (!task) return null

    const t = translations[language as keyof typeof translations]?.history || translations.en.history
    const isFileAvailable = !!task.filePath && !isMissing
    const displayTitle = task.title || 'Unknown Title'
    
    // Extract source domain - colors work for both light and dark mode
    const getSourceInfo = (url: string) => {
        try {
            const hostname = new URL(url).hostname.replace('www.', '')
            if (hostname.includes('youtube') || hostname.includes('youtu.be')) return { icon: youtubeIcon, isImage: true, name: 'YouTube', color: 'text-red-600 dark:text-red-400' }
            if (hostname.includes('tiktok')) return { icon: tiktokIcon, isImage: true, name: 'TikTok', color: 'text-pink-600 dark:text-pink-400' }
            if (hostname.includes('instagram')) return { icon: instagramIcon, isImage: true, name: 'Instagram', color: 'text-purple-600 dark:text-purple-400' }
            if (hostname.includes('twitter') || hostname.includes('x.com')) return { icon: xIcon, isImage: true, name: 'X', color: 'text-sky-600 dark:text-sky-400' }
            if (hostname.includes('facebook') || hostname.includes('fb.watch')) return { icon: facebookIcon, isImage: true, name: 'Facebook', color: 'text-blue-600 dark:text-blue-400' }
            return { icon: Globe, isImage: false, name: hostname.split('.')[0], color: 'text-gray-500 dark:text-gray-400' }
        } catch { return { icon: Globe, isImage: false, name: 'Web', color: 'text-gray-500 dark:text-gray-400' } }
    }
    const source = getSourceInfo(task.url)
    
    // Folder path (last 3 folders for better context)
    const folderPath = task.path ? task.path.split(/[/\\]/).slice(-3).join('/') : ''
    
    // Date formatter
    const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
       day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : null

    return (
      <div 
        style={{...style, ...(lowPerf ? {} : { animationDelay: `${index * 50}ms` })}} 
        className={`flex sm:grid sm:grid-cols-[1fr_200px_160px] items-center justify-between border-b border-border hover:bg-muted/50 transition-colors px-4 py-3 group gap-2 sm:gap-0 relative ${
            lowPerf ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards'
        } ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
        onClick={() => isSelectionMode && onToggleSelect(task.id)}
      >
         {/* Checkbox for Selection Mode */}
         {isSelectionMode && (
             <div className="absolute left-2 top-1/2 -translate-y-1/2 sm:static sm:mr-3 sm:translate-y-0 flex items-center justify-center">
                 <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onToggleSelect(task.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                 />
             </div>
         )}
         
         {/* Column 1: Title & Meta */}
         <div className={`overflow-hidden pr-2 sm:pr-4 flex-1 min-w-0 ${isSelectionMode ? 'pl-6 sm:pl-0' : ''}`}>
            <div className="font-medium truncate text-sm text-foreground" title={displayTitle}>
                {displayTitle}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                {source && (
                    <span className={`${source.color} font-medium shrink-0 flex items-center gap-1.5`}>
                        {source.isImage ? (
                            <img src={source.icon as string} alt={source.name} className="w-3.5 h-3.5 object-contain" />
                        ) : (
                            <source.icon className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden xs:inline">{source.name}</span>
                    </span>
                )}
                
                {/* File Size */}
                {task.fileSize && (
                    <span className="flex items-center gap-1.5 shrink-0" title="File Size">
                        <HardDrive className="w-3.5 h-3.5" />
                        {task.fileSize}
                    </span>
                )}

                {/* Date */}
                {completedDate && (
                    <span className="flex items-center gap-1.5 shrink-0" title="Completed">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{completedDate}</span>
                    </span>
                )}

                {folderPath && (
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px] font-mono text-xs hidden sm:flex items-center gap-1.5" title={task.path}>
                        <FolderOpen className="w-3.5 h-3.5" /> 
                        {folderPath}
                    </span>
                )}
                {task.range && task.range !== 'Full' && (
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-xs bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-500/30">
                        ✂ {formatRange(task.range)}
                    </span>
                )}
                
                {/* File Missing Indicator */}
                {!isFileAvailable && (
                    <span className="flex items-center gap-1.5 text-red-500 font-medium animate-pulse" title="File not found - Moved or Deleted">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Missing</span>
                    </span>
                )}
            </div>
         </div>

         {/* Column 2: Format Badge */}
         <div className="hidden sm:flex flex-col items-center justify-center shrink-0">
            {task.format && (
                <div className="flex flex-col items-center gap-1">
                    {/* Primary Badge (Resolution) */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        task.format.toLowerCase().includes('audio') 
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30'
                            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                    }`}>
                        {task.format.toUpperCase()}
                    </span>
                    
                    {/* Secondary Info (Codec + Container) */}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                         {/* Codec */}
                        {task._options?.videoCodec && (
                             <span title="Video Codec">{task._options.videoCodec.split('.')[0].replace('avc1', 'H.264').replace('vp9', 'VP9').replace('av01', 'AV1')}</span>
                        )}
                        
                        {/* Separator if both exist */}
                        {task._options?.videoCodec && (task._options?.container || (task.filePath && task.filePath.split('.').pop())) && (
                            <span className="opacity-50">•</span>
                        )}

                        {/* Container */}
                        <span title="Container">
                            {task._options?.container?.toUpperCase() || (task.filePath ? task.filePath.split('.').pop()?.toUpperCase() : 'MP4')}
                        </span>
                    </div>
                </div>
            )}
         </div>

         {/* Column 3: Actions */}
         <div className="flex justify-end gap-1 shrink-0 relative">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-1">
                <button 
                    onClick={() => task.path && onOpenFolder(task.path)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title={t.open_folder}
                >
                    <FolderOpen className="w-4 h-4" />
                </button>
                {/* Compress Button - only for files that exist */}
                {!isMissing && task.filePath && (
                    <button 
                        onClick={() => onCompress(task)}
                        className="p-2 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Compress"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                )}
                {showCommandButton && (
                    <button 
                        onClick={() => onViewCommand(task)}
                        className="p-2 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="View Command"
                    >
                        <Terminal className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Common: Play or Retry */}
            {showPlayButton && isFileAvailable ? (
                <button 
                    onClick={() => task.filePath && onPlayFile(task.filePath)}
                    className="p-2 text-muted-foreground hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                    title={t.play}
                >
                    <Play className="w-4 h-4" />
                </button>
            ) : (
                <>
                    {/* Relocate button - find the moved file */}
                    <button 
                        onClick={() => onRefreshPath(task.id)}
                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors hidden sm:block"
                        title="Locate File"
                    >
                        <MapPin className="w-4 h-4" />
                    </button>
                    {/* Retry button - redownload */}
                    <button 
                        onClick={() => onRetry(task.id)}
                        className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors hidden sm:block"
                        title="Redownload"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Desktop Delete */}
            <button 
                onClick={() => onRemove(task.id)}
                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors hidden sm:block"
                title={t.clear}
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Mobile More Menu */}
            <div className="sm:hidden relative" ref={menuRef}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1 flex flex-col gap-0.5">
                           {!isFileAvailable && (
                                <button 
                                    onClick={() => onRetry(task.id)}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors text-left"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Redownload
                                </button>
                            )} 
                            
                            <button 
                                onClick={() => { task.path && onOpenFolder(task.path); setShowMenu(false) }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-foreground hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <FolderOpen className="w-3.5 h-3.5 text-blue-400" /> {t.open_folder}
                            </button>
                            
                            {showCommandButton && (
                                <button 
                                    onClick={() => { onViewCommand(task); setShowMenu(false) }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-foreground hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                    <Terminal className="w-3.5 h-3.5 text-purple-400" /> View Command
                                </button>
                            )}

                            {/* Compress - only if file exists */}
                            {isFileAvailable && task.filePath && (
                                <button 
                                    onClick={() => { onCompress(task); setShowMenu(false) }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-foreground hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                    <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> Compress
                                </button>
                            )}

                            <div className="h-px bg-white/5 my-0.5" />
                            
                            <button 
                                onClick={() => onRemove(task.id)}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-white/5 hover:text-red-300 rounded-lg transition-colors text-left"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> {t.clear}
                            </button>
                        </div>
                    </div>
                )}
            </div>
         </div>
      </div>
    )
}, (prev, next) => {
    return (
        prev.task.id === next.task.id &&
        prev.task.title === next.task.title &&
        prev.task.status === next.task.status &&
        prev.style.top === next.style.top && 
        prev.language === next.language &&
        prev.task.fileSize === next.task.fileSize &&
        prev.task.completedAt === next.task.completedAt &&
        prev.onRetry === next.onRetry &&
        prev.isMissing === next.isMissing && 
        prev.index === next.index &&
        prev.lowPerf === next.lowPerf &&
        prev.isSelectionMode === next.isSelectionMode &&
        prev.isSelected === next.isSelected
    )
})

HistoryRow.displayName = 'HistoryRow'

// --- Main Component ---

export function HistoryView() {
  const { tasks, deleteHistory, clearTask, retryTask, updateTask, settings } = useAppStore()
  const language = settings.language
  // Safely fallback to English if key missing
  const t = translations[language as keyof typeof translations]?.history || translations.en.history

  // --- Filtering & Sorting State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('date') // date, size, source
  const [filterFormat, setFilterFormat] = useState('all') // all, video, audio
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // --- Pagination State ---
  const [visibleCount, setVisibleCount] = useState(20)

  // --- Selection State ---
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode)
      setSelectedIds(new Set()) // Clear on toggle
  }

  const toggleSelect = useCallback((id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
      })
  }, [])

  const selectAll = () => {
      if (selectedIds.size === historyTasks.length) {
          setSelectedIds(new Set())
      } else {
          setSelectedIds(new Set(historyTasks.map(t => t.id)))
      }
  }

  const deleteSelected = useCallback(() => {
      if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
          selectedIds.forEach(id => clearTask(id))
          setIsSelectionMode(false)
          setSelectedIds(new Set())
          notify.success(`Deleted ${selectedIds.size} items`)
      }
  }, [selectedIds, clearTask])

  const historyTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.status === 'completed' || t.status === 'stopped')

    if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(t => t.title.toLowerCase().includes(query))
    }

    if (filterFormat !== 'all') {
        filtered = filtered.filter(t => {
            const isAudio = t.format?.toLowerCase().includes('audio') || t.url.toLowerCase().includes('audio')
            return filterFormat === 'audio' ? isAudio : !isAudio
        })
    }

    filtered.sort((a, b) => {
        let valA: number | string = 0
        let valB: number | string = 0

        switch (filterType) {
            case 'size':
                valA = parseSize(a.fileSize || '0')
                valB = parseSize(b.fileSize || '0')
                break
            case 'source':
                try {
                    valA = new URL(a.url).hostname
                    valB = new URL(b.url).hostname
                } catch {
                    valA = a.url || ''
                    valB = b.url || ''
                }
                break
            case 'date':
            default:
                valA = a.completedAt || 0
                valB = b.completedAt || 0
                break
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    return filtered
  }, [tasks, searchQuery, filterType, sortOrder, filterFormat])

  // Verification State
  const [missingFileIds, setMissingFileIds] = useState<Set<string>>(new Set())
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerifyFiles = async () => {
      setIsVerifying(true)
      const missing = new Set<string>()
      const chunks = []
      for (let i = 0; i < historyTasks.length; i += 10) {
          chunks.push(historyTasks.slice(i, i + 10))
      }

      for (const chunk of chunks) {
          await Promise.all(chunk.map(async (task) => {
              if (task.filePath) {
                  try {
                       const fileExists = await exists(task.filePath)
                       if (!fileExists) missing.add(task.id)
                  } catch {
                       missing.add(task.id)
                  }
              }
          }))
      }
      setMissingFileIds(missing)
      setIsVerifying(false)
      if (missing.size > 0) notify.warning(`Scan Complete: ${missing.size} missing files found`, { duration: 4000 })
      else notify.success("Scan Complete: All files are healthy", { duration: 3000 })
  }

  const handleOpenFolder = useCallback(async (path: string) => {
    const tCommon = translations[language as keyof typeof translations]?.errors || translations.en.errors
    if (!path) {
        notify.warning(tCommon.path_empty)
        return
    }
    const tErrors = translations[language].settings.advanced.errors
    try { await openPath(path) } 
    catch (e: any) {
        if (e?.toString().includes('Not allowed') || e?.toString().includes('forbidden')) {
             notify.error(tErrors.access_denied, { description: tErrors.access_desc, duration: 4000 })
        } else {
             notify.error(tErrors.folder_not_found, { description: tErrors.folder_desc, duration: 4000 })
        }
    }
  }, [language])

  const handlePlayFile = useCallback(async (path: string) => {
    if (!path) {
        notify.warning(t.file_not_found || "Path empty")
        return
    }
    const tErrors = translations[language].settings.advanced.errors
    try { await openPath(path) } 
    catch (e) {
        const folderPath = path.substring(0, path.lastIndexOf(/[/\\]/.test(path) ? (path.includes('\\') ? '\\' : '/') : '/'))
        notify.error("File Error", {
            description: tErrors.file_desc,
            action: folderPath ? {
                label: tErrors.open_folder,
                onClick: () => openPath(folderPath).catch(() => {})
            } : undefined
        })
    }
  }, [language])

  const handleRemove = useCallback((id: string) => clearTask(id), [clearTask])
  const handleRetry = useCallback((id: string) => { retryTask(id); notify.success("Redownload Started") }, [retryTask])
  const handleViewCommand = useCallback((task: DownloadTask) => { setSelectedTask(task); setIsCommandOpen(true) }, [])
  
  // NEW: Handle file relocation via file picker
  const handleRefreshPath = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    
    const selected = await openFileDialog({
      title: 'Locate File',
      filters: [{ name: 'Media', extensions: ['mp4', 'mkv', 'webm', 'mp3', 'm4a', 'gif', 'jpg', 'png'] }]
    })
    
    if (selected) {
      const newPath = selected as string
      if (newPath) {
        updateTask(id, { filePath: newPath })
        // Trigger re-check of missing files via state update
        setMissingFileIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        notify.success("File path updated")
      }
    }
  }, [tasks, updateTask])

  const [selectedTask, setSelectedTask] = useState<DownloadTask | null>(null)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  
  // NEW: Compress dialog state
  const [compressTask, setCompressTask] = useState<DownloadTask | null>(null)
  const [isCompressOpen, setIsCompressOpen] = useState(false)
  const handleCompress = useCallback((task: DownloadTask) => { 
    setCompressTask(task)
    setIsCompressOpen(true) 
  }, [])

  const emptyState = tasks.filter(t => t.status === 'completed' || t.status === 'stopped').length === 0

  if (emptyState) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-in fade-in zoom-in duration-500">
              <div className="p-4 bg-secondary/30 rounded-full">
                <FileVideo className="w-12 h-12 opacity-40" />
              </div>
              <p>{t.empty}</p>
          </div>
      )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
        {/* Header Bar with Animation */}
        <div className="flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Row 1: Title */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {t.title} <span className="text-xs font-normal text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">{historyTasks.length}</span>
                </h2>
            </div>
            
            {/* Row 2: Controls Stack */}
            <div className="flex flex-col gap-2">
                {/* Selection Mode Header Overlay */}
                {isSelectionMode ? (
                    <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={selectAll}
                            className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
                        >
                            {selectedIds.size === historyTasks.length ? "Deselect All" : "Select All"}
                        </button>
                        <div className="text-xs text-primary font-medium flex-1 text-center">
                            {selectedIds.size} Selected
                        </div>
                        <button 
                            onClick={deleteSelected}
                            disabled={selectedIds.size === 0}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                         <button 
                            onClick={toggleSelectionMode}
                            className="text-xs text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                            <input 
                                type="text" 
                                placeholder={t.search_placeholder || "Search history..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-secondary/20 hover:bg-secondary/40 dark:bg-secondary/50 dark:hover:bg-secondary/70 border border-border/50 dark:border-white/10 rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>
                        
                        {/* Filters Row */}
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                             <button
                                onClick={toggleSelectionMode}
                                className={`h-10 px-3 flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors ${
                                    isSelectionMode 
                                    ? 'bg-primary/20 border-primary text-primary' 
                                    : 'border-border/50 hover:bg-secondary text-muted-foreground'
                                }`}
                                title="Bulk Selection"
                            >
                                <ListChecks className="w-4 h-4" />
                                <span className="hidden sm:inline">Select</span>
                            </button>

                             <div className="w-[100px] sm:w-[120px]">
                               <Select 
                                    value={filterFormat} 
                                    onChange={setFilterFormat} 
                                    options={[
                                        { value: 'all', label: 'All Types' },
                                        { value: 'video', label: 'Video' },
                                        { value: 'audio', label: 'Audio' }
                                    ]}
                                    className="w-full"
                               />
                            </div>

                            <div className="w-[100px] sm:w-[120px]">
                               <Select 
                                    value={filterType} 
                                    onChange={setFilterType} 
                                    options={[
                                        { value: 'date', label: t.filter_date || 'Date' },
                                        { value: 'size', label: t.filter_size || 'Size' },
                                        { value: 'source', label: t.filter_source || 'Source' }
                                    ]}
                                    className="w-full"
                               />
                            </div>

                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="h-10 w-10 flex items-center justify-center hover:bg-secondary dark:hover:bg-secondary/80 rounded-lg border border-border/50 dark:border-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
                                title={sortOrder === 'asc' ? (t.sort_asc || "Oldest First") : (t.sort_desc || "Newest First")}
                            >
                                {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                            </button>

                            <div className="w-px bg-border/50 mx-1 hidden md:block" />

                            <button 
                                onClick={handleVerifyFiles} 
                                disabled={isVerifying}
                                className="h-10 px-3 md:px-4 text-xs font-medium text-amber-500 hover:text-amber-600 flex items-center justify-center gap-2 rounded-lg hover:bg-amber-500/10 transition-colors border border-border/50 dark:border-white/10 hover:border-amber-500/20 disabled:opacity-50"
                                title="Check if files still exist"
                            >
                                <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={() => {
                                    if(confirm("Are you sure you want to delete ALL history?")) deleteHistory()
                                }}
                                className="h-10 px-3 md:px-4 text-xs font-medium text-red-500 hover:text-red-600 flex items-center justify-center gap-2 rounded-lg hover:bg-red-500/10 transition-colors border border-border/50 dark:border-white/10 hover:border-red-500/20"
                                title="Delete All History"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 border rounded-xl bg-card/50 overflow-hidden min-h-[400px] shadow-sm backdrop-blur-md flex flex-col">
            {/* Table Header */}
            <div className="flex justify-between items-center sm:grid sm:grid-cols-[1fr_200px_160px] px-4 py-3 bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b border-border/50 shrink-0">
                <div>{t.file_details}</div>
                <div className="hidden sm:block text-center">{t.format}</div>
                <div className="text-right">{t.actions}</div>
            </div>
            
            {/* Scrollable List */}
            <div className="flex-1 overflow-auto">
                {historyTasks.length > 0 ? (
                    <>
                        {historyTasks.slice(0, visibleCount).map((task, idx) => (
                            <HistoryRow 
                                key={task.id}
                                style={{}}
                                index={idx}
                                task={task}
                                language={language}
                                onOpenFolder={handleOpenFolder}
                                onPlayFile={handlePlayFile}
                                onRemove={handleRemove}
                                onRetry={handleRetry}
                                onRefreshPath={handleRefreshPath}
                                onCompress={handleCompress}
                                onViewCommand={handleViewCommand}
                                showPlayButton={!isSelectionMode}
                                showCommandButton={settings.developerMode}
                                isMissing={missingFileIds.has(task.id)}
                                lowPerf={settings.lowPerformanceMode}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedIds.has(task.id)}
                                onToggleSelect={toggleSelect}
                            />
                        ))}
                        
                        {/* Load More Button */}
                        {historyTasks.length > visibleCount && (
                             <div className="p-4 flex justify-center">
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="px-6 py-2 bg-secondary/50 hover:bg-secondary text-sm font-medium rounded-full transition-colors"
                                >
                                    Load More ({historyTasks.length - visibleCount} remaining)
                                </button>
                             </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground animate-in fade-in duration-300">
                        <p>{t.empty ? t.empty : 'No results found'}</p>
                    </div>
                )}
            </div>
            
            {/* Command Modal */}
            {selectedTask && (
                <CommandModal 
                    task={selectedTask}
                    isOpen={isCommandOpen}
                    onClose={() => setIsCommandOpen(false)}
                />
            )}
            
            {/* Compress Dialog */}
            <CompressDialog 
                isOpen={isCompressOpen}
                onClose={() => setIsCompressOpen(false)}
                task={compressTask}
                onCompress={(taskId, options) => {
                    compressTask && useAppStore.getState().compressTask(taskId, options)
                }}
            />
        </div>
    </div>
  )
}
