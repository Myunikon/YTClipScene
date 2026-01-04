import { Package, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store'
import { translations } from '../lib/locales'

export function Updater() {
    const { 
        ytdlpVersion, ytdlpLatestVersion, ytdlpNeedsUpdate,
        ffmpegVersion, ffmpegLatestVersion, ffmpegNeedsUpdate,
        checkBinaryUpdates, isCheckingUpdates, settings
    } = useAppStore()

    const language = settings.language
    const t = translations[language as keyof typeof translations].settings.updater

    const StatusBadge = ({ hasUpdate, checked }: { hasUpdate: boolean, checked: boolean }) => {
        if (!checked) return <span className="text-[10px] text-muted-foreground">{t.not_checked}</span>
        return hasUpdate 
            ? <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t.update_available}</span>
            : <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />{t.up_to_date}</span>
    }

    return (
        <div className="p-5 border border-border rounded-xl bg-card space-y-4">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     <div className="bg-primary/10 p-2.5 rounded-lg">
                         <Package className="w-5 h-5 text-primary" />
                     </div>
                     <div>
                         <h3 className="font-semibold text-base">{t.binary_versions}</h3>
                         <p className="text-sm text-muted-foreground">{t.check_updates}</p>
                     </div>
                 </div>
                 <button 
                    onClick={() => checkBinaryUpdates()}
                    disabled={isCheckingUpdates}
                    className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                    {isCheckingUpdates ? t.checking : t.update_btn}
                </button>
             </div>
             
             {/* Version Cards */}
             <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/30 rounded-lg space-y-2 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">yt-dlp</div>
                        <StatusBadge hasUpdate={ytdlpNeedsUpdate} checked={!!ytdlpLatestVersion} />
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                        {t.current_ver}: <span className="text-foreground">{ytdlpVersion || t.unknown}</span>
                    </div>
                    {ytdlpLatestVersion && (
                        <div className="text-xs text-muted-foreground/70">
                            Latest: {ytdlpLatestVersion}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-secondary/30 rounded-lg space-y-2 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">FFmpeg</div>
                        <StatusBadge hasUpdate={ffmpegNeedsUpdate} checked={!!ffmpegLatestVersion} />
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                        {t.current_ver}: <span className="text-foreground text-[10px]">{ffmpegVersion || t.unknown}</span>
                    </div>
                    {ffmpegLatestVersion && (
                        <div className="text-xs text-muted-foreground/70 truncate text-[10px]">
                            Latest: {ffmpegLatestVersion}
                        </div>
                    )}
                </div>
             </div>
             
             <p className="text-[10px] text-muted-foreground/60 text-center">
                {t.binary_bundled}
             </p>
        </div>
    )
}
