import { useRef, forwardRef, useImperativeHandle } from 'react'
import { Rocket, Plus, Scissors, Zap, ChevronRight, AlertCircle, Database, Settings, X, HelpCircle } from 'lucide-react'
import { translations } from '../lib/locales'
import { useAppStore } from '../store'

export interface GuideModalRef {
    showModal: () => void
    close: () => void
}

export const GuideModal = forwardRef<GuideModalRef, {}>((_, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const { settings } = useAppStore()
    const t = translations[settings.language]

    useImperativeHandle(ref, () => ({
        showModal: () => dialogRef.current?.showModal(),
        close: () => dialogRef.current?.close()
    }))

    return (
        <dialog 
            ref={dialogRef}
            className="fixed inset-0 m-auto bg-transparent p-0 backdrop:bg-black/80 w-full max-w-3xl rounded-2xl shadow-2xl open:animate-in open:fade-in open:zoom-in-95 backdrop:animate-in backdrop:fade-in"
            onClick={(e) => {
                if (e.target === dialogRef.current) dialogRef.current.close()
            }}
        >
            <div className="glass-strong text-foreground h-[80vh] flex flex-col rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-secondary/20">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary/10 rounded-lg">
                            <HelpCircle className="w-6 h-6 text-primary" />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold">{t.guide.title}</h2>
                             <p className="text-sm text-muted-foreground">{t.guide.subtitle}</p>
                         </div>
                    </div>

                    <button onClick={() => dialogRef.current?.close()} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                     {/* 1. Getting Started */}
                     <section className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-2"><Rocket className="w-5 h-5 text-blue-500"/> {t.guide.sections.started}</h4>
                        
                        <div className="space-y-3">
                            {/* Single Video Download */}
                            <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20" open>
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-primary"/> {t.guide.sections.single}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 whitespace-pre-wrap">
                                    <p>{t.guide.sections.single_text}</p>
                                </div>
                            </details>

                            {/* Video Clipping */}
                            <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20">
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm"><Scissors className="w-4 h-4 text-primary"/> {t.guide.sections.clipping}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 whitespace-pre-wrap">
                                    <p>{t.guide.sections.clipping_text}</p>
                                </div>
                            </details>
                        </div>
                    </section>

                    {/* 2. Advanced Features */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-2"><Zap className="w-5 h-5 text-yellow-500"/> {t.guide.sections.power}</h4>
                        
                        <div className="space-y-3">
                            <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20">
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-primary"/> {t.guide.sections.turbo}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 whitespace-pre-wrap">
                                    <p>{t.guide.sections.turbo_text}</p>
                                </div>
                            </details>

                            <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20">
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm"><Database className="w-4 h-4 text-primary"/> {t.guide.sections.queue}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 whitespace-pre-wrap">
                                    <p>{t.guide.sections.queue_text}</p>
                                </div>
                            </details>

                            <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20">
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm"><Settings className="w-4 h-4 text-primary"/> {t.guide.sections.renaming}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 animate-in slide-in-from-top-1 whitespace-pre-wrap">
                                    <p>{t.guide.sections.renaming_text}</p>
                                </div>
                            </details>

                            {/* SPONSORBLOCK */}
                             <details className="group border rounded-xl p-4 open:bg-secondary/5 transition-all open:border-primary/20">
                                <summary className="font-bold cursor-pointer list-none flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm">
                                        <Scissors className="w-4 h-4 text-green-500"/> 
                                        {t.guide.sections.sponsorblock}
                                    </span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-muted-foreground"/>
                                </summary>
                                <div className="pt-4 mt-2 text-sm text-muted-foreground space-y-2 border-t border-dashed border-border/50 whitespace-pre-wrap">
                                    <p>{t.guide.sections.sponsorblock_text}</p>
                                </div>
                        </details>
                        </div>
                    </section>
                    
                    {/* 4. Troubleshooting */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-2"><AlertCircle className="w-5 h-5 text-red-500"/> {t.guide.sections.troubleshoot}</h4>
                        
                        <div className="grid gap-3 text-sm text-muted-foreground">
                             {/* Manual Binary Section */}
                            <div className="p-3 border rounded-lg bg-secondary/20 whitespace-pre-line">
                                <strong className="text-foreground block mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Database className="w-3 h-3" /> Manual FFmpeg Setup (Offline)
                                </strong>
                                <p className="mb-2">If you already have FFmpeg and want to skip the download:</p>
                                <ol className="list-decimal pl-4 space-y-1 marker:text-primary">
                                    <li>Press <code className="bg-secondary px-1 rounded">Win + R</code></li>
                                    <li>Type <code className="bg-secondary px-1 rounded">%APPDATA%\clipscene\binaries</code> and hit Enter.</li>
                                    <li>Copy your <b>ffmpeg.exe</b> and <b>yt-dlp.exe</b> files into this folder.</li>
                                    <li>Restart the app.</li>
                                </ol>
                                <div className="mt-3 text-[10px] text-muted-foreground border-t border-border/50 pt-2 space-y-1">
                                    <p><span className="font-bold text-yellow-600 dark:text-yellow-500">Requirements:</span></p>
                                    <ul className="list-disc pl-4 marker:text-muted-foreground">
                                        <li><b>yt-dlp:</b> Must be 2023.xx.xx or newer (Crucial for YouTube changes).</li>
                                        <li><b>FFmpeg:</b> Version 4.4+ recommended (Old versions may fail merging).</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="p-3 border rounded-lg bg-red-500/5 border-red-500/10 whitespace-pre-line">
                                <strong className="text-red-500 block mb-1 text-xs uppercase tracking-wider">{t.guide.sections.ts_fail}</strong>
                                {t.guide.sections.ts_fail_text}
                            </div>
                            <div className="p-3 border rounded-lg bg-orange-500/5 border-orange-500/10">
                                <strong className="text-orange-500 block mb-1 text-xs uppercase tracking-wider">{t.guide.sections.ts_restart}</strong>
                                {t.guide.sections.ts_restart_text}
                            </div>
                            <div className="p-3 border rounded-lg bg-blue-500/5 border-blue-500/10 whitespace-pre-line">
                                <strong className="text-blue-500 block mb-1 text-xs uppercase tracking-wider">{t.guide.sections.auth_guide}</strong>
                                {t.guide.sections.auth_guide_text}
                            </div>
                        </div>
                    </section>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-secondary/20 flex justify-between items-center">
                    <button 
                        onClick={() => {
                            // Reset Onboarding
                            settings.hasSeenOnboarding = false // Optimistic update
                            useAppStore.getState().updateSettings({ ...settings, hasSeenOnboarding: false })
                            window.location.reload() // Force reload to trigger onboarding
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary/50"
                    >
                         <Rocket className="w-3.5 h-3.5" />
                         {t.guide.sections.replay_tour}
                    </button>

                    <button
                        onClick={() => dialogRef.current?.close()}
                        className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        {t.guide.sections.got_it}
                    </button>
                </div>
            </div>
        </dialog>
    )
})

GuideModal.displayName = "GuideModal"

