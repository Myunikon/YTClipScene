import { Globe, Shield, Zap, Wifi } from 'lucide-react'
import { Switch } from '../Switch'
import { Select } from '../Select'
import { AppSettings } from '../../store/slices/types'
import { cn } from '../../lib/utils'

interface NetworkSettingsProps {
    settings: AppSettings
    setSetting: (key: string, val: any) => void
    t: any
}

export function NetworkSettings({ settings, setSetting, t }: NetworkSettingsProps) {
    const activeProfile = settings.concurrentFragments === 1 ? 'safe'
        : settings.concurrentFragments === 4 ? 'fast'
            : settings.concurrentFragments >= 8 ? 'aggressive'
                : 'custom'

    return (
        <div className={cn("space-y-4", !settings.lowPerformanceMode && "animate-in slide-in-from-right-4 duration-300")}>
            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> {t.settings.network?.connection || "Connection"}
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
                            onChange={(e) => {
                                const val = parseInt(e.target.value)
                                if (!isNaN(val)) setSetting('concurrentDownloads', val)
                            }}
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
                        <Shield className="w-3 h-3" /> {t.settings.network?.proxy || "Proxy Server"}
                    </label>
                    <input
                        className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={settings.proxy}
                        onChange={(e) => setSetting('proxy', e.target.value)}
                        placeholder={t.settings?.network?.placeholders?.proxy}
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <Globe className="w-3 h-3" /> {t.settings.network?.user_agent || "Enable Imposter Mode (User Agent)"}
                            </label>
                            <p className="text-[10px] text-muted-foreground/70">
                                {t.settings.network?.ua_desc || "Masquerade as Chrome to avoid 429 errors."}
                            </p>
                        </div>
                        <Switch
                            checked={settings.userAgent !== " "}
                            onCheckedChange={(checked: boolean) => setSetting('userAgent', checked ? "" : " ")}
                        />
                    </div>

                    {settings.userAgent !== " " && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                            <input
                                className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                                value={settings.userAgent}
                                onChange={(e) => setSetting('userAgent', e.target.value)}
                                placeholder={t.settings?.network?.placeholders?.ua}
                            />
                        </div>
                    )}
                </div>
            </section>

            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> {t.settings.network?.performance || "Performance"}
                </h3>

                <div className="space-y-4 pt-2">
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-2"><Wifi className="w-3 h-3 text-blue-400" /> {t.settings.network?.concurrent_fragments}</span>
                            <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-xs">{settings.concurrentFragments || 4} chunks</span>
                        </label>

                        <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border/50">
                            {/* Preset Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Performance Profile</label>
                                <Select
                                    value={activeProfile}
                                    onChange={(val) => {
                                        if (val === 'safe') setSetting('concurrentFragments', 1)
                                        else if (val === 'fast') setSetting('concurrentFragments', 4)
                                        else if (val === 'aggressive') setSetting('concurrentFragments', 8)
                                    }}
                                    options={[
                                        { value: 'safe', label: `Safe (1 Chunk) - ${t.settings.network?.perf_safe_title}` },
                                        { value: 'fast', label: `Fast (4 Chunks) - ${t.settings.network?.perf_fast_title}` },
                                        { value: 'aggressive', label: `Aggressive (8 Chunks) - ${t.settings.network?.perf_aggressive_title}` },
                                        { value: 'custom', label: 'Custom' }
                                    ]}
                                />
                            </div>

                            <input
                                type="range"
                                min="1"
                                max="16"
                                step="1"
                                className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                                value={settings.concurrentFragments || 4}
                                onChange={(e) => setSetting('concurrentFragments', parseInt(e.target.value))}
                            />

                            <div className="text-xs text-muted-foreground space-y-2 border-t border-border/50 pt-3">
                                <p className="font-medium text-foreground/80 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-500" />
                                    {t.settings.network?.perf_tuning}
                                </p>
                                <p className="opacity-80 leading-relaxed">
                                    {activeProfile === 'safe' && t.settings.network?.perf_safe_desc}
                                    {activeProfile === 'fast' && t.settings.network?.perf_fast_desc}
                                    {activeProfile === 'aggressive' && t.settings.network?.perf_aggressive_desc}
                                    {activeProfile === 'custom' && "Manual configuration mode."}
                                </p>
                                {activeProfile === 'aggressive' && (
                                    <p className="text-red-400/80 italic mt-1">
                                        {t.settings.network?.perf_warning}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
