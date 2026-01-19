import { motion, AnimatePresence } from 'framer-motion'
import { Download, Terminal as TerminalIcon, Scissors, Zap, Globe, AlertCircle, X, ExternalLink } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useState } from 'react'
import { Updater } from '../Updater'
import { useAppStore } from '../../store'
import { cn } from '../../lib/utils'

interface AboutSettingsProps {
    t: any
    addLog: (entry: any) => void
    setShowEasterEgg: (show: boolean) => void
}

export function AboutSettings({ t, addLog, setShowEasterEgg }: AboutSettingsProps) {
    const [selectedTech, setSelectedTech] = useState<any>(null)
    const { settings } = useAppStore()
    const isLowPerf = settings.lowPerformanceMode

    const techItems = [
        { id: 'yt-dlp', name: 'yt-dlp', role: t.settings.about_page.role_core, Icon: TerminalIcon, desc: t.settings.about_page.yt_desc, link: 'https://github.com/yt-dlp/yt-dlp', color: 'text-foreground', bg: 'bg-black/10 dark:bg-white/10' },
        { id: 'ffmpeg', name: 'FFmpeg', role: t.settings.about_page.role_media, Icon: Scissors, desc: t.settings.about_page.ff_desc, link: 'https://ffmpeg.org', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
        { id: 'tauri', name: 'Tauri', role: t.settings.about_page.role_framework, Icon: Zap, desc: t.settings.about_page.tauri_desc, link: 'https://tauri.app', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10' },
        {
            id: 'react', name: 'React', role: t.settings.about_page.role_ui, Icon: (props: any) => (
                <svg className={`w-6 h-6 ${props.className}`} viewBox="-11.5 -10.23174 23 20.46348">
                    <circle cx="0" cy="0" r="2.05" fill="currentColor" />
                    <g stroke="currentColor" strokeWidth="1" fill="none">
                        <ellipse rx="11" ry="4.2" />
                        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                    </g>
                </svg>
            ), desc: t.settings.about_page.react_desc, link: 'https://react.dev', color: 'text-cyan-500', bg: 'bg-cyan-500/10'
        },
        { id: 'lucide', name: 'Lucide', role: t.settings.about_page.role_icon, Icon: Globe, desc: t.settings.about_page.lucide_desc, link: 'https://lucide.dev', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
        { id: 'sponsorblock', name: 'SponsorBlock', role: t.settings.about_page.role_api, Icon: AlertCircle, desc: t.settings.about_page.sb_desc, link: 'https://sponsor.ajay.app', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
    ]

    return (
        <div className={cn("space-y-8", !isLowPerf && "animate-in fade-in slide-in-from-bottom-2")}>
            {/* Hero */}
            <div className="text-center space-y-4 py-8 relative">
                {isLowPerf ? (
                    <div
                        className="w-24 h-24 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl shadow-2xl shadow-primary/30 flex items-center justify-center mx-auto cursor-pointer hover:scale-105 active:scale-95"
                        onClick={() => {
                            const newCount = (window as any)._ee_count = ((window as any)._ee_count || 0) + 1
                            if (newCount === 5) {
                                addLog({ message: "🎉 EASTER EGG FOUND!", type: 'success' })
                                setShowEasterEgg(true)
                                    ; (window as any)._ee_count = 0
                            }
                        }}
                    >
                        <Download className="w-12 h-12 text-white drop-shadow-md" />
                    </div>
                ) : (
                    <motion.div
                        className="w-24 h-24 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl shadow-2xl shadow-primary/30 flex items-center justify-center mx-auto cursor-pointer"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            const newCount = (window as any)._ee_count = ((window as any)._ee_count || 0) + 1
                            if (newCount === 5) {
                                addLog({ message: "🎉 EASTER EGG FOUND!", type: 'success' })
                                setShowEasterEgg(true)
                                    ; (window as any)._ee_count = 0
                            }
                        }}
                    >
                        <Download className="w-12 h-12 text-white drop-shadow-md" />
                    </motion.div>
                )}

                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mt-4">
                        ClipScene<span className="text-primary">YT</span>
                    </h2>
                    <p className="text-sm font-mono text-muted-foreground mt-1 bg-secondary/50 inline-block px-2 py-0.5 rounded-md border border-border/50">
                        v1.0.0 (Stable)
                    </p>
                </div>

                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t.settings.about_page.desc}
                </p>
            </div>

            <Updater />

            {/* Tech Grid */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                    <span className="w-1 h-4 bg-primary rounded-full" />
                    {t.settings.about_page.core}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {techItems.map((item) => (
                        isLowPerf ? (
                            <div
                                key={item.id}
                                onClick={() => setSelectedTech(item)}
                                className="p-4 border rounded-xl bg-card/50 hover:bg-card group cursor-pointer relative overflow-hidden hover:scale-[1.02]"
                            >
                                <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                                    <item.Icon className={`w-6 h-6 ${item.color}`} />
                                </div>
                                <h4 className="font-bold">{item.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.role}</p>
                            </div>
                        ) : (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                onClick={() => setSelectedTech(item)}
                                className="p-4 border rounded-xl bg-card/50 hover:bg-card transition-all group cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.02, y: -2 }}
                            >
                                <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <item.Icon className={`w-6 h-6 ${item.color}`} />
                                </div>
                                <h4 className="font-bold">{item.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.role}</p>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        )
                    ))}
                </div>
            </section>

            {/* Modal */}
            {isLowPerf ? (
                selectedTech && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div onClick={() => setSelectedTech(null)} className="absolute inset-0 bg-black/60" />
                        <div className="bg-card border w-full max-w-sm p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
                            <button onClick={() => setSelectedTech(null)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className={`w-20 h-20 ${selectedTech.bg} rounded-2xl flex items-center justify-center shadow-inner`}>
                                    <selectedTech.Icon className={`w-10 h-10 ${selectedTech.color}`} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">{selectedTech.name}</h3>
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{selectedTech.role}</p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed px-2">{selectedTech.desc}</p>
                                <button
                                    onClick={() => openUrl(selectedTech.link)}
                                    className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 text-sm mt-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {t.settings.about_page.visit_website}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <AnimatePresence>
                    {selectedTech && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedTech(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                layoutId={selectedTech.id}
                                className="bg-card border w-full max-w-sm p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                            >
                                <button onClick={() => setSelectedTech(null)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <motion.div
                                        className={`w-20 h-20 ${selectedTech.bg} rounded-2xl flex items-center justify-center shadow-inner`}
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                    >
                                        <selectedTech.Icon className={`w-10 h-10 ${selectedTech.color}`} />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{selectedTech.name}</h3>
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{selectedTech.role}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed px-2">{selectedTech.desc}</p>
                                    <button
                                        onClick={() => openUrl(selectedTech.link)}
                                        className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm mt-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        {t.settings.about_page.visit_website}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            )}

            {/* Footer */}
            <section className="pt-8 pb-4 border-t border-dashed border-border/50 text-center space-y-4">
                <p className="text-sm font-medium flex items-center justify-center gap-1">
                    Made with <span className={cn("text-red-500", !isLowPerf && "animate-pulse")}>❤️</span> by
                    <button
                        onClick={() => openUrl('https://github.com/Myunikon')}
                        className="font-bold text-primary hover:underline decoration-wavy underline-offset-4 ml-1"
                    >
                        Myunikon
                    </button>
                </p>

                <div className="flex justify-center gap-4 opacity-50 text-xs font-mono uppercase tracking-widest">
                    <span>Design Thinking</span>
                    <span>•</span>
                    <span>Open Source</span>
                    <span>•</span>
                    <span>2025</span>
                </div>

                <div className="max-w-xs mx-auto text-xs text-muted-foreground/50 text-center leading-tight">
                    {t.settings.about_page.legal_text}
                </div>
            </section>
        </div>
    )
}
