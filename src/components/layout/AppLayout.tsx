import { ReactNode } from 'react'
import { Background } from '../Background'
import { WifiOff, AlertTriangle } from 'lucide-react'
import { translations } from '../../lib/locales'
import { useAppStore } from '../../store'

interface AppLayoutProps {
  children: ReactNode
  isOffline: boolean
  language: string
}

export function AppLayout({ children, isOffline, language }: AppLayoutProps) {
    // Determine translation for "Offline"
    const t = translations[language as keyof typeof translations] || translations['en']
    const { ytdlpNeedsUpdate, ytdlpLatestVersion } = useAppStore()

    return (
        <div className="h-screen w-screen flex flex-col text-foreground font-sans overflow-hidden selection:bg-primary/30 relative">
            <Background />
             
            {/* OFFLINE WARNING BANNER */}
            {isOffline && (
                <div className="absolute top-16 left-0 right-0 z-40 bg-red-500/10 border-b border-red-500/20 text-red-500 px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                    <WifiOff className="w-3.5 h-3.5" />
                    {t.status.offline}
                </div>
            )}

            {/* YT-DLP UPDATE AVAILABLE BANNER (Info Only) */}
            {ytdlpNeedsUpdate && !isOffline && (
                <div className="absolute top-16 left-0 right-0 z-40 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                        {t.updater_banner.update_available} <strong>{ytdlpLatestVersion}</strong>
                    </span>
                    <span className="text-muted-foreground/70">(Manual update required)</span>
                </div>
            )}

            {children}
        </div>
    )
}
