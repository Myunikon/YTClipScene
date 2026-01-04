import { Globe, Shield, Zap, Wifi } from 'lucide-react'
import { AppSettings } from '../../store/slices/types'


interface NetworkSettingsProps {
    settings: AppSettings
    setSetting: (key: string, val: any) => void
    t: any
}

export function NetworkSettings({ settings, setSetting, t }: NetworkSettingsProps) {
    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary"/> {t.settings.network?.connection || "Connection"}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.network?.concurrent_downloads || "Max Concurrent Downloads"}</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="10" 
                            className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                            value={settings.concurrentDownloads}
                            onChange={(e) => setSetting('concurrentDownloads', parseInt(e.target.value) || 1)}
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.network?.speed_limit || "Speed Limit"}</label>
                         <input 
                            className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                            value={settings.speedLimit}
                            onChange={(e) => setSetting('speedLimit', e.target.value)}
                         placeholder={t.settings?.network?.placeholders?.speed}
                        />
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Shield className="w-3 h-3"/> {t.settings.network?.proxy || "Proxy Server"}
                    </label>
                    <input 
                        className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={settings.proxy}
                        onChange={(e) => setSetting('proxy', e.target.value)}
                        placeholder={t.settings?.network?.placeholders?.proxy}
                    />
                </div>

                <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Globe className="w-3 h-3"/> {t.settings.network?.user_agent || t.settings?.network?.placeholders?.ua}
                    </label>
                    <input 
                        className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={settings.userAgent}
                        onChange={(e) => setSetting('userAgent', e.target.value)}
                        placeholder={t.settings?.network?.placeholders?.ua}
                    />
                </div>
            </section>

            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary"/> {t.settings.network?.performance || "Performance"}
                </h3>
                
                <div className="space-y-4 pt-2">
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-2"><Wifi className="w-3 h-3 text-blue-400"/> {t.settings.network?.concurrent_fragments}</span>
                            <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-[10px]">{settings.concurrentFragments || 4} chunks</span>
                        </label>
                        
                        <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border/50">
                             <input 
                                type="range" 
                                min="1" 
                                max="16" 
                                step="1"
                                className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                                value={settings.concurrentFragments || 4}
                                onChange={(e) => setSetting('concurrentFragments', parseInt(e.target.value))}
                            />
                            
                            <div className="text-[10px] text-muted-foreground space-y-2 border-t border-border/50 pt-3">
                                <p className="font-medium text-foreground/80 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-500" />
                                    {t.settings.network?.perf_tuning}
                                </p>
                                <ul className="list-disc pl-4 space-y-1 opacity-80">
                                    <li><strong>{t.settings.network?.perf_safe?.split(':')[0]}:</strong> {t.settings.network?.perf_safe?.split(':')[1]}</li>
                                    <li><strong>{t.settings.network?.perf_fast?.split(':')[0]}:</strong> {t.settings.network?.perf_fast?.split(':')[1]}</li>
                                    <li><strong>{t.settings.network?.perf_aggressive?.split(':')[0]}:</strong> {t.settings.network?.perf_aggressive?.split(':')[1]}</li>
                                </ul>
                                <p className="text-red-400/80 italic mt-1">
                                    {t.settings.network?.perf_warning}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
