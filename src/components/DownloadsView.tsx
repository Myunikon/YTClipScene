import { useAppStore } from '../store'
import { translations } from '../lib/locales'
import { DownloadEmptyState } from './downloads/DownloadEmptyState'
import { DownloadItem } from './downloads/DownloadItem'

export function DownloadsView() {
  const { tasks, settings } = useAppStore()
  const t = translations[settings.language].downloads
  
  // Only show active/in-progress tasks - completed/stopped go to History
  const displayTasks = tasks.filter(t => ['pending', 'fetching_info', 'downloading', 'error', 'paused'].includes(t.status))

  if (displayTasks.length === 0) {
    return <DownloadEmptyState t={t} />
  }

  return (
    <div className="w-full space-y-2">
      {/* Header (Desktop Only) */}
      <div className="hidden md:grid grid-cols-[3fr_100px_3fr_auto] gap-4 p-4 bg-secondary/50 text-secondary-foreground font-semibold text-sm rounded-lg mb-2">
        <div>{t.headers.title_url}</div>
        <div>{t.headers.status}</div>
        <div>{t.headers.progress}</div>
        <div className="text-right">{t.headers.actions}</div>
      </div>

      <div className="space-y-4 md:space-y-2">
        {displayTasks.map(task => (
          <DownloadItem key={task.id} task={task} t={t} />
        ))}
      </div>
    </div>
  )
}
