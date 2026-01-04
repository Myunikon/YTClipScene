import { useState } from 'react'
import { Pause, Play, StopCircle, Trash2, FolderOpen, RefreshCcw, Terminal, Zap } from 'lucide-react'
import { openPath } from '@tauri-apps/plugin-opener'
import { cn } from '../../lib/utils'
import { StatusBadge } from './StatusBadge'
import { DownloadTask } from '../../store/slices/types'
import { useAppStore } from '../../store'
import { CommandModal } from '../CommandModal'

interface DownloadItemProps {
    task: DownloadTask
    t: any
}

// CommandModal removed, imported from ../CommandModal

export function DownloadItem({ task, t }: DownloadItemProps) {
    const { pauseTask, stopTask, resumeTask, retryTask, clearTask, settings } = useAppStore()
    const [showCommandModal, setShowCommandModal] = useState(false)

    return (
        <>
            <div className="bg-card border rounded-xl p-4 md:px-4 md:py-3 shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 md:grid-cols-[3fr_100px_3fr_auto] gap-4 items-center group relative overflow-hidden">
                
                {/* 1. Title & Info */}
                <div className="min-w-0 flex flex-col justify-center z-10">
                    <div className="font-bold truncate text-sm" title={task.title}>{task.title || 'Fetching info...'}</div>
                    <div className="text-xs text-muted-foreground truncate opacity-70 font-mono">{task.url}</div>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                        {task.range !== 'Full' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-100 font-mono">Clip: {task.range}</span>}
                        {task.status === 'error' && task.log && (
                            <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 truncate max-w-full md:max-w-[200px]" title={task.log}>
                                {task.log}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Status Badge */}
                <div className="flex md:block items-center justify-between z-10">
                    <span className="md:hidden text-xs text-muted-foreground font-semibold uppercase">{t.headers.status}:</span>
                    <StatusBadge status={task.status} />
                </div>

                {/* 3. Progress Bar */}
                <div className="min-w-0 z-10 w-full">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 bg-secondary h-2.5 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                            <div 
                                className={cn("h-full transition-all duration-300 ease-out relative overflow-hidden", 
                                    task.status === 'error' ? "bg-red-500" : "bg-primary"
                                )}
                                style={{ 
                                    width: `${task.progress}%`,
                                    backgroundImage: (task.concurrentFragments || 1) > 1 && task.status === 'downloading'
                                        ? 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)' 
                                        : 'none',
                                    backgroundSize: '1rem 1rem'
                                }}
                            >
                                {/* Shimmer on active download */}
                                {task.status === 'downloading' && (
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]"></div>
                                )}
                            </div>
                        </div>
                        <span className="text-xs font-mono font-bold w-12 text-right">{task.progress.toFixed(0)}%</span>
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1 font-mono uppercase tracking-wider items-center">
                        <div className="flex gap-2">
                            <span>{task.speed || '0 B/s'}</span>
                            <span>ETA: {task.eta || '--:--'}</span>
                        </div>
                        {(task.concurrentFragments || 1) > 1 && (
                            <span className="flex items-center gap-1 text-yellow-500/80 animate-pulse font-bold" title={`Downloading with ${task.concurrentFragments} parallel fragments`}>
                                <Zap className="w-3 h-3" fill="currentColor" />
                                <span>x{task.concurrentFragments}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* 4. Actions */}
                <div className="flex items-center justify-end gap-1 z-10 pt-2 md:pt-0 border-t md:border-0 border-dashed border-border/50 mt-2 md:mt-0">
                    {/* Developer Mode: Terminal Icon */}
                    {settings.developerMode && (
                        <button 
                            onClick={() => setShowCommandModal(true)}
                            className="p-2 hover:bg-purple-500/10 text-purple-500 rounded-lg transition-colors" 
                            title="View Command Details"
                        >
                            <Terminal className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    )}

                    {task.status === 'downloading' && (
                        <>
                            <button onClick={() => pauseTask(task.id)} className="p-2 hover:bg-yellow-500/10 text-yellow-600 rounded-lg transition-colors" title="Pause (will restart from beginning when resumed)">
                                <Pause className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => stopTask(task.id)} className="p-2 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title={t.stop}>
                                <StopCircle className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                    {task.status === 'paused' && (
                        <>
                            <button onClick={() => resumeTask(task.id)} className="p-2 hover:bg-green-500/10 text-green-600 rounded-lg transition-colors" title="Resume (Restarts Process)">
                                <Play className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => stopTask(task.id)} className="p-2 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title={t.stop}>
                                <StopCircle className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                    {(task.status === 'error') && (
                        <>
                            <button onClick={() => retryTask(task.id)} className="p-2 hover:bg-orange-500/10 text-orange-600 rounded-lg transition-colors" title="Retry">
                                <RefreshCcw className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => clearTask(task.id)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={t.clear}>
                                <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                    {(task.status === 'pending') && (
                        <button onClick={() => clearTask(task.id)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={t.clear}>
                            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    )}
                    {task.status === 'stopped' && (
                        <>
                            <button onClick={() => retryTask(task.id)} className="p-2 hover:bg-orange-500/10 text-orange-600 rounded-lg transition-colors" title={t.restart || "Restart"}>
                                <RefreshCcw className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => clearTask(task.id)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={t.clear}>
                                <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                    {task.status === 'completed' && (
                        <>
                            <button onClick={async () => {
                                const target = task.filePath;
                                console.log('[Play] Opening file:', target, 'Folder:', task.path);
                                if (target) {
                                    try {
                                        await openPath(target);
                                    } catch (e) {
                                        console.error('Failed to open file:', e);
                                        // Fallback: try to open folder
                                        if (task.path) {
                                            try {
                                                await openPath(task.path);
                                            } catch (e2) {
                                                console.error('Failed to open folder:', e2);
                                            }
                                        }
                                    }
                                } else if (task.path) {
                                    await openPath(task.path);
                                }
                            }} className="p-2 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors" title={t.open_file}>
                                <Play className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => task.path && openPath(task.path)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={t.open_folder}>
                                <FolderOpen className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => clearTask(task.id)} className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors" title={t.clear}>
                                <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Progress Background (Optional - Subtle) */}
                <div className="md:hidden absolute bottom-0 left-0 h-1 bg-primary/10 w-full z-0">
                    <div className="h-full bg-primary/20" style={{ width: `${task.progress}%` }}></div>
                </div>

            </div>

            {/* Command Modal */}
            <CommandModal 
                task={task} 
                isOpen={showCommandModal} 
                onClose={() => setShowCommandModal(false)} 
            />
        </>
    )
}
