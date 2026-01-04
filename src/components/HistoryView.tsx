import { memo, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore, DownloadTask } from '../store'
import { translations } from '../lib/locales'
import { FolderOpen, Play, Trash2, FileVideo } from 'lucide-react'
import { openPath } from '@tauri-apps/plugin-opener'
import { Terminal } from 'lucide-react'
import { CommandModal } from './CommandModal'

// --- Types & Props ---

interface HistoryRowProps {
    task: DownloadTask
    language: string 
    onOpenFolder: (path: string) => void
    onPlayFile: (path: string) => void
    onRemove: (id: string) => void
    onViewCommand: (task: DownloadTask) => void
    style: React.CSSProperties
    showPlayButton: boolean
    showCommandButton: boolean
}

// --- Memoized Row Component ---

const HistoryRow = memo(({ style, task, language, onOpenFolder, onPlayFile, onRemove, onViewCommand, showPlayButton, showCommandButton }: HistoryRowProps) => {
    // Safety check for empty task (ghost row)
    if (!task) return null

    const t = translations[language as keyof typeof translations]?.history || { open_folder: 'Open Folder', play: 'Play', clear: 'Remove' } 
    const isFileAvailable = !!task.filePath
    const displayName = task.title || 'Unknown Title'
    const displayPath = task.filePath ? task.filePath.split(/[/\\]/).pop() : task.url

    return (
      <div style={style} className="flex items-center border-b border-border/50 hover:bg-secondary/20 transition-colors px-4 group">
         {/* Title & Path */}
         <div className="flex-1 min-w-0 pr-4">
            <div className="font-medium truncate text-sm text-foreground" title={displayName}>
                {displayName}
            </div>
            <div className="text-xs text-muted-foreground truncate font-mono opacity-70" title={task.filePath || task.path}>
                {displayPath}
            </div>
         </div>

         {/* Format Badge */}
         <div className="w-24 shrink-0 hidden sm:block">
            {task.format && (
                <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider border border-border/50">
                    {task.format}
                </span>
            )}
         </div>

         {/* Actions */}
         <div className="w-32 shrink-0 flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
            <button 
                onClick={() => task.path && onOpenFolder(task.path)}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                title={t.open_folder}
            >
                <FolderOpen className="w-4 h-4" />
            </button>
            {showCommandButton && (
                <button 
                    onClick={() => onViewCommand(task)}
                    className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-md transition-colors"
                    title="View Command Details"
                >
                    <Terminal className="w-4 h-4" />
                </button>
            )}
            {showPlayButton && (
            <button 
                disabled={!isFileAvailable}
                onClick={() => task.filePath && onPlayFile(task.filePath)}
                className="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={isFileAvailable ? t.play : 'File path unknown'}
            >
                <Play className="w-4 h-4" />
            </button>
            )}
            <button 
                onClick={() => onRemove(task.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors ml-2"
                title={t.clear || "Remove"}
            >
                <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>
    )
}, (prev, next) => {
    // Custom comparison for performance
    return (
        prev.task.id === next.task.id &&
        prev.task.title === next.task.title &&
        prev.task.status === next.task.status &&
        prev.style.top === next.style.top && 
        prev.language === next.language
    )
})

HistoryRow.displayName = 'HistoryRow'

// --- Main Component ---

// --- Main Component ---

export function HistoryView() {
  const { tasks, deleteHistory, clearTask, settings } = useAppStore()
  const language = settings.language
  const t = translations[language].history

  // Filter stable list
  const historyTasks = useMemo(() => 
    tasks.filter(t => t.status === 'completed' || t.status === 'stopped'),
  [tasks])

  // Handlers (Stable)
  const handleOpenFolder = useCallback(async (path: string) => {
    if (!path) {
        console.warn("Open Folder: Path is empty")
        return
    }
    try {
        await openPath(path)
    } catch (e: any) {
        console.error("Failed to open folder:", e)
        // Check for specific error string or specific code if possible, otherwise generic handler
        if (e?.toString().includes('Not allowed') || e?.toString().includes('forbidden')) {
             toast.error(t.file_not_found || 'Permission Denied: Check Settings', { 
                 description: 'Ensure Downloads folder is accessible.' 
             })
        } else {
             toast.error(t.file_not_found || 'Folder not found')
        }
    }
  }, [t])

  const handlePlayFile = useCallback(async (path: string) => {
    if (!path) {
        console.warn("Play File: Path is empty")
        return
    }
    try {
        await openPath(path)
    } catch (e) {
        console.error("Failed to open file:", e)
        toast.error(t.file_not_found || 'File not found')
    }
  }, [t])

  const handleRemove = useCallback((id: string) => {
      clearTask(id)
  }, [clearTask])

  // Command Modal State
  const [selectedTask, setSelectedTask] = useState<DownloadTask | null>(null)
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  const handleViewCommand = useCallback((task: DownloadTask) => {
      setSelectedTask(task)
      setIsCommandOpen(true)
  }, [])

  if (historyTasks.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-in fade-in duration-500">
              <div className="p-4 bg-secondary/30 rounded-full">
                <FileVideo className="w-12 h-12 opacity-40" />
              </div>
              <p>{t.empty}</p>
          </div>
      )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                {t.title} <span className="text-xs font-normal text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">{historyTasks.length}</span>
            </h2>
            <button 
                onClick={deleteHistory} 
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
            >
                <Trash2 className="w-3.5 h-3.5" />
                {t.clear}
            </button>
        </div>

        <div className="flex-1 border rounded-xl bg-card/50 overflow-hidden min-h-[400px] shadow-sm backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b border-border/50 shrink-0">
                <div className="flex-1">{t.file_details}</div>
                <div className="w-24 hidden sm:block">{t.format}</div>
                <div className="w-32 text-right">{t.actions}</div>
            </div>
            
            {/* Simple Scrollable List */}
            <div className="overflow-y-auto flex-1 p-0">
                {historyTasks.map((task) => (
                    <HistoryRow 
                        key={task.id}
                        task={task}
                        language={language}
                        onOpenFolder={handleOpenFolder}
                        onPlayFile={handlePlayFile}
                        onRemove={handleRemove}
                        onViewCommand={handleViewCommand}
                        style={{}} // No specific style needed for non-virtualized
                        showPlayButton={!settings.disablePlayButton}
                        showCommandButton={settings.developerMode}
                    />
                ))}
            </div>
            
            {/* Command Modal */}
            {selectedTask && (
                <CommandModal 
                    task={selectedTask}
                    isOpen={isCommandOpen}
                    onClose={() => setIsCommandOpen(false)}
                />
            )}
        </div>
    </div>
  )
}
