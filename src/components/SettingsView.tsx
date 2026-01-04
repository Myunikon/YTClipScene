import { useState, useEffect } from 'react'
import { Settings, Download, Globe, Zap, Database, Terminal as TerminalIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAppStore } from '../store'
import { translations } from '../lib/locales'
import { TerminalView } from './TerminalView'

// NEW HEADER IMPORTS
import { GeneralSettings } from './settings/GeneralSettings'
import { DownloadSettings } from './settings/DownloadSettings'
import { NetworkSettings } from './settings/NetworkSettings'
import { AdvancedSettings } from './settings/AdvancedSettings'
import { AboutSettings } from './settings/AboutSettings'

interface SettingsViewProps {
    toggleTheme: () => void
    setPreviewLang: (lang: string | null) => void
}

export function SettingsView({ toggleTheme, setPreviewLang }: SettingsViewProps) {
    const { settings, updateSettings, addLog } = useAppStore()
    const [showEasterEgg, setShowEasterEgg] = useState(false)
    
    // Auto-Save: Direct Store Updates
    const setSetting = (key: string, val: string | boolean | number | string[]) => {
        updateSettings({ ...settings, [key]: val })
    }

    // Derived computations (Language Preview)
    const t = translations[settings.language]

    // Sync language preview to Global App
    useEffect(() => {
        setPreviewLang(settings.language)
        return () => setPreviewLang(null) 
    }, [settings.language])

    const [activeTab, setActiveTab] = useState<'general' | 'downloads' | 'network' | 'advanced' | 'about' | 'logs'>('general')

    const tabs = [
        { id: 'general', label: t.settings.tabs.general, icon: Settings },
        { id: 'downloads', label: t.settings.tabs.downloads, icon: Download },
        { id: 'network', label: t.settings.tabs.network, icon: Globe },
        { id: 'advanced', label: t.settings.tabs.advanced, icon: Zap },
        { id: 'logs', label: "Logs", icon: TerminalIcon },
        { id: 'about', label: t.settings.tabs.about, icon: Database },
    ] as const

    return (
        <div className="p-6 max-w-4xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
             {/* Easter Egg Modal Overlay */}
             <AnimatePresence>
                {showEasterEgg && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-center">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEasterEgg(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0.5, rotate: 10, opacity: 0 }}
                            className="bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-500/30 p-8 rounded-3xl shadow-2xl relative z-10 text-center max-w-sm w-full mx-auto"
                        >
                            <motion.div 
                                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-6xl mb-4 select-none"
                            >
                                🐣
                            </motion.div>
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                                {t.settings.about_page.secret_found}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {t.settings.about_page.secret_desc} <br/>
                                <span className="text-xs opacity-50">{t.settings.about_page.secret_sub}</span>
                            </p>
                            <button 
                                onClick={() => setShowEasterEgg(false)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25"
                            >
                                {t.settings.about_page.awesome}
                            </button>
                        </motion.div>
                         {/* Simple CSS Confetti Particles */}
                         {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 rounded-full pointer-events-none"
                                style={{ 
                                    backgroundColor: ['#f0f', '#0ff', '#ff0', '#0f0'][i % 4],
                                    left: '50%', top: '50%' 
                                }}
                                animate={{ 
                                    x: (Math.random() - 0.5) * 500,
                                    y: (Math.random() - 0.5) * 500,
                                    opacity: [1, 0],
                                    scale: [0, 1.5]
                                }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        ))}
                    </div>
                )}
             </AnimatePresence>
            
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-primary/20">
                    <Settings className="w-6 h-6 text-white"/> 
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {t.settings.title}
                </span>
            </h2>
            
            {/* Tabs Navigation */}
            <div className="flex glass p-1.5 rounded-2xl mb-8 shrink-0 border border-white/5 shadow-xl shadow-black/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 z-10",
                            activeTab === tab.id ? "text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="settings-pill"
                                className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-xl -z-10 shadow-lg shadow-primary/25"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                         <tab.icon className="w-4 h-4 relative z-10" /> 
                         <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
                {activeTab === 'general' && (
                    <GeneralSettings 
                        settings={settings} 
                        setSetting={setSetting} 
                        toggleTheme={toggleTheme} 
                        t={t} 
                    />
                )}

                {activeTab === 'downloads' && (
                    <DownloadSettings 
                        settings={settings} 
                        setSetting={setSetting} 
                        t={t} 
                    />
                )}

                {activeTab === 'network' && (
                    <NetworkSettings 
                        settings={settings} 
                        setSetting={setSetting} 
                        t={t} 
                    />
                )}


                {activeTab === 'advanced' && (
                    <AdvancedSettings 
                        settings={settings} 
                        setSetting={setSetting} 
                        updateSettings={updateSettings} 
                        t={t}
                    />
                )}

                {activeTab === 'logs' && (
                    <div className="h-[calc(100vh-200px)] min-h-[400px] animate-in fade-in slide-in-from-bottom-2">
                        <TerminalView />
                    </div>
                )}

                {activeTab === 'about' && (
                    <AboutSettings 
                        t={t} 
                        addLog={addLog} 
                        setShowEasterEgg={setShowEasterEgg} 
                    />
                )}
            </div>
        </div>
    )
}
