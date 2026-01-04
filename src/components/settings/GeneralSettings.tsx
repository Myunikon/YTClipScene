import { Moon, Sun, Globe } from 'lucide-react'
import { Select } from '../Select'
import { Switch } from '../Switch'
import { AppSettings } from '../../store/slices/types'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'
import { enable, disable } from '@tauri-apps/plugin-autostart'

interface GeneralSettingsProps {
    settings: AppSettings
    setSetting: (key: string, val: any) => void
    toggleTheme: () => void
    t: any
}

export function GeneralSettings({ settings, setSetting, toggleTheme, t }: GeneralSettingsProps) {
    const handleAutostart = async (enabled: boolean) => {
        try {
            if (enabled) {
                await enable()
            } else {
                await disable()
            }
            setSetting('launchAtStartup', enabled)
        } catch (e) {
            console.error('Autostart toggle failed:', e)
        }
    }

    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary"/> {t.settings.general.language_theme}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.general.language}</label>
                        <Select 
                            value={settings.language}
                            onChange={(val) => setSetting('language', val)}
                            options={[
                                { value: "en", label: "English" },
                                { value: "id", label: "Indonesia" },
                                { value: "ms", label: "Melayu" },
                                { value: "zh", label: "Chinese" }
                            ]}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.general.theme}</label>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleTheme} className="flex-1 p-2 border rounded-md bg-background/50 hover:bg-secondary flex items-center justify-center gap-2 transition-colors">
                                {settings.theme === 'dark' ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
                                <span className="capitalize">{settings.theme === 'dark' ? t.settings.general.theme_dark : t.settings.general.theme_light}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="pt-2 border-t border-border/50">
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{t.settings.general.low_perf_mode}</span>
                            <span className="text-xs text-muted-foreground">{t.settings.general.low_perf_desc}</span>
                        </div>
                        <Switch checked={settings.lowPerformanceMode} onCheckedChange={val => setSetting('lowPerformanceMode', val)} />
                    </label>
                </div>
            </section>

            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    {t.settings.general.startup}
                </h3>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-secondary/30 rounded-lg">
                    <span>{t.settings.general.launch_startup}</span>
                    <Switch checked={settings.launchAtStartup} onCheckedChange={handleAutostart} />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-secondary/30 rounded-lg">
                    <span>{t.settings.general.start_minimized}</span>
                    <Switch checked={settings.startMinimized} onCheckedChange={val => setSetting('startMinimized', val)} />
                </label>
                
                <div className="space-y-3 pt-4 border-t border-border/50">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.general.close_action}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { value: 'minimize', label: t.settings.general.minimize_tray, icon: <div className="w-4 h-4 border-b-2 border-current mb-1" /> },
                            { value: 'quit', label: t.settings.general.quit_app, icon: <X className="w-4 h-4" /> }
                        ].map((opt) => (
                            <label 
                                key={opt.value}
                                className={cn(
                                    "flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group",
                                    settings.closeAction === opt.value
                                        ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                        : "bg-card hover:bg-secondary/80 border-input hover:border-primary/30"
                                )}
                            >
                                <input 
                                    type="radio" 
                                    name="closeAct" 
                                    className="hidden" 
                                    checked={settings.closeAction === opt.value} 
                                    onChange={() => setSetting('closeAction', opt.value)} 
                                />
                                {settings.closeAction === opt.value && (
                                    <motion.div 
                                        layoutId="closeAction"
                                        className="absolute inset-0 bg-white/10"
                                    />
                                )}
                                <div className="relative z-10 flex items-center gap-2">
                                    {opt.icon}
                                    <span className="font-medium text-sm">{opt.label}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
