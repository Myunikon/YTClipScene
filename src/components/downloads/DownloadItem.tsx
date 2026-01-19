import { useState } from 'react'
import { Pause, Play, StopCircle, Trash2, FolderOpen, RefreshCcw, Terminal, Zap } from 'lucide-react'
import { openPath } from '@tauri-apps/plugin-opener'
import { cn, formatRange } from '../../lib/utils'
import { StatusBadge } from './StatusBadge'
import { DownloadTask } from '../../store/slices/types'
import { useAppStore } from '../../store'
import { CommandModal } from '../CommandModal'
import { ConfirmDialog } from '../ConfirmDialog'
import { notify } from '../../lib/notify'
import { translations } from '../../lib/locales'

interface DownloadItemProps {
    task: DownloadTask
    t: any
}

// CommandModal removed, imported from ../CommandModal

export function DownloadItem({ task, t }: DownloadItemProps) {
    const { pauseTask, stopTask, resumeTask, retryTask, clearTask, settings } = useAppStore()
    const [showCommandModal, setShowCommandModal] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [showClipPauseWarning, setShowClipPauseWarning] = useState(false)

    // Check if this is a clipped download
    const isClipped = task.range !== 'Full'

    const handleOpenFile = async () => {
        const target = task.filePath;
        if (target) {
            try {
                await openPath(target);
            } catch (e: any) {
                console.error('Failed to open file:', e);
                const fileName = target.split(/[/\\]/).pop() || 'File';
                const tErrors = translations[settings.language as keyof typeof translations].settings.advanced.errors;

                notify.error(`${fileName}`, {
                    description: tErrors.file_desc,
                    action: task.path ? {
                        label: tErrors.open_folder,
                        onClick: () => openPath(task.path!).catch(() => { })
                    } : undefined,
                    duration: 5000
                });
            }
        } else if (task.path) {
            handleOpenFolder();
        }
    }

    const handleOpenFolder = async () => {
        if (!task.path) return;
        try {
            await openPath(task.path);
        } catch (e) {
            const tErrors = translations[settings.language as keyof typeof translations].settings.advanced.errors;
            notify.error(tErrors.folder_not_found, {
                description: tErrors.folder_desc,
                duration: 4000
            });
        }
    }

    return (
        <>
            <div className="bg-card border rounded-xl p-4 md:px-4 md:py-3 shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 md:grid-cols-[3fr_100px_3fr_auto] gap-4 items-center group relative overflow-hidden">

                {/* 1. Title & Info */}
                <div className="min-w-0 flex flex-col justify-center z-10 gap-0.5">
                    <div
                        className={cn(
                            "font-bold truncate text-sm transition-colors",
                            task.status === 'completed'
                                ? "cursor-pointer hover:text-primary hover:underline underline-offset-4 decoration-primary/50"
                                : ""
                        )}
                        title={task.title || task.url}
                        onClick={task.status === 'completed' ? handleOpenFile : undefined}
                    >
                        {task.title || 'Fetching info...'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate opacity-70 font-mono">{task.url}</div>

                    <div className="flex flex-wrap gap-2 mt-1.5">
                        {task.range && task.range !== 'Full' && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md dark:bg-amber-500/20 dark:text-amber-400 font-mono border border-amber-200 dark:border-amber-500/30">
                                ✂ Clip: {formatRange(task.range)}
                            </span>
                        )}
                        {task.audioNormalization && (
                            <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-md dark:bg-pink-500/20 dark:text-pink-400 font-mono border border-pink-200 dark:border-pink-500/30">
                                ♪ Normalized
                            </span>
                        )}
                        {task.status === 'error' && task.log && (
                            <div className="flex items-center gap-2 max-w-full">
                                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 shrink-0">
                                    ERROR
                                </span>
                                <span className="text-xs text-red-500 truncate" title={task.log}>
                                    {task.log}
                                </span>
                            </div>
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
                        <div className="flex-1 bg-secondary/50 h-2 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                            <div
                                className={cn("h-full relative overflow-hidden",
                                    task.status === 'error' ? "bg-red-500" : "bg-primary",
                                    !settings.lowPerformanceMode && "transition-all duration-300 ease-out"
                                )}
                                style={{
                                    width: `${task.progress}%`,
                                    backgroundImage: !settings.lowPerformanceMode && (task.concurrentFragments || 1) > 1 && task.status === 'downloading'
                                        ? 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)'
                                        : 'none',
                                    backgroundSize: '1rem 1rem'
                                }}
                            >
                                {/* Active Shimmer */}
                                {!settings.lowPerformanceMode && task.status === 'downloading' && (
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]"></div>
                                )}
                            </div>
                        </div>
                        <span className="text-xs font-mono font-bold w-10 text-right tabular-nums text-muted-foreground">{task.progress.toFixed(0)}%</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-muted-foreground/80 mt-1.5 font-semibold uppercase tracking-wide items-center h-4">
                        {task.statusDetail ? (
                            <span className={cn("text-orange-500/90 truncate", !settings.lowPerformanceMode && "animate-pulse")}>{task.statusDetail}</span>
                        ) : (
                            <div className="flex gap-3">
                                <span className="font-mono">{task.speed || '0 B/s'}</span>
                                {task.totalSize && <span className="opacity-50">|</span>}
                                {task.totalSize && <span className="font-mono">{task.totalSize}</span>}
                                <span className="opacity-50">|</span>
                                <span className="font-mono text-foreground/70">ETA: {task.eta || '--:--'}</span>
                            </div>
                        )}
                        {(task.concurrentFragments || 1) > 1 && (
                            <span className={cn("flex items-center gap-1 text-yellow-500/80", !settings.lowPerformanceMode && "animate-pulse")} title={`Downloading with ${task.concurrentFragments} parallel fragments`}>
                                <Zap className="w-3 h-3" fill="currentColor" />
                            </span>
                        )}
                    </div>
                </div>

                {/* 4. Actions */}
                <div className="flex items-center justify-end gap-1 z-10 pt-2 md:pt-0 border-t md:border-0 border-dashed border-border/50 mt-2 md:mt-0">
                    {/* Developer Mode or Error: Terminal Icon to view logs */}
                    {(settings.developerMode || task.status === 'error') && (
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
                            <button
                                onClick={() => isClipped ? setShowClipPauseWarning(true) : pauseTask(task.id)}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isClipped
                                        ? "hover:bg-orange-500/10 text-orange-500"
                                        : "hover:bg-yellow-500/10 text-yellow-600"
                                )}
                                title={isClipped ? t.pause_clip_tooltip : t.pause_download}
                            >
                                <Pause className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setShowCancelConfirm(true)} className="p-2 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title={t.stop}>
                                <StopCircle className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                    {task.status === 'paused' && (
                        <>
                            <button onClick={() => resumeTask(task.id)} className="p-2 hover:bg-green-500/10 text-green-600 rounded-lg transition-colors" title={t.resume_download}>
                                <Play className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setShowCancelConfirm(true)} className="p-2 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title={t.stop}>
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
                            <button onClick={handleOpenFile} className="p-2 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors" title={t.open_file}>
                                <Play className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={handleOpenFolder} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={t.open_folder}>
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

            {/* Cancel Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                onConfirm={() => stopTask(task.id)}
                title={t.cancel_confirm_title || 'Cancel Download?'}
                description={t.cancel_confirm_desc || 'This will stop the download and you may need to restart from the beginning.'}
                confirmLabel={t.confirm || 'Yes, Cancel'}
                cancelLabel={t.keep_downloading || 'Keep Downloading'}
            />

            {/* Clip Pause Warning Dialog */}
            <ConfirmDialog
                isOpen={showClipPauseWarning}
                onClose={() => setShowClipPauseWarning(false)}
                onConfirm={() => {
                    setShowClipPauseWarning(false)
                    pauseTask(task.id)
                }}
                title={t.clip_pause_title || "⚠️ Pause Clipped Download?"}
                description={`${t.clip_pause_desc || "This is a CLIPPED download. Due to technical limitations, resuming will RESTART from 0%."} (${task.range})`}
                confirmLabel={t.clip_pause_confirm || "Pause Anyway"}
                cancelLabel={t.keep_downloading}
            />

            {/* Command Modal */}
            <CommandModal
                task={task}
                isOpen={showCommandModal}
                onClose={() => setShowCommandModal(false)}
            />
        </>
    )
}
