import { Settings, Plus } from 'lucide-react'
import { Select } from '../Select'
import { Switch } from '../Switch'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { AppSettings } from '../../store/slices/types'

interface DownloadSettingsProps {
    settings: AppSettings
    setSetting: (key: string, val: any) => void
    t: any
}

export function DownloadSettings({ settings, setSetting, t }: DownloadSettingsProps) {
    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary"/> {t.settings.downloads.storage}
                </h3>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.downloads.path}</label>
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 rounded-md border bg-background/50 font-mono text-xs" value={settings.downloadPath || 'Downloads'} readOnly />
                        <button onClick={async () => {
                            const p = await openDialog({ directory: true })
                            if(p) setSetting('downloadPath', p)
                        }} className="px-3 border rounded-md hover:bg-secondary transition-colors">{t.settings.downloads.change}</button>
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                    <Switch checked={settings.alwaysAskPath} onCheckedChange={val => setSetting('alwaysAskPath', val)} />
                    <span>{t.settings.downloads.always_ask}</span>
                </label>

                <div className="pt-2 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                        <Switch checked={settings.embedMetadata} onCheckedChange={val => setSetting('embedMetadata', val)} />
                        <span>{t.settings.downloads.embed_metadata}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                        <Switch checked={settings.embedThumbnail} onCheckedChange={val => setSetting('embedThumbnail', val)} />
                        <span>{t.settings.downloads.embed_thumbnail}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                        <Switch checked={settings.disablePlayButton} onCheckedChange={val => setSetting('disablePlayButton', val)} />
                        <span>{t.settings.downloads.disable_play_button || 'Disable Play Button'}</span>
                    </label>
                </div>
            </section>
            
            <section className="p-5 border rounded-xl bg-card/30 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary"/> {t.settings.downloads.defaults}
                </h3>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.downloads.filename_template}</label>
                    <input className="w-full p-2 rounded-md border bg-background/50 font-mono text-xs focus:ring-1 focus:ring-primary outline-none" 
                        value={settings.filenameTemplate} 
                        onChange={e => setSetting('filenameTemplate', e.target.value)} 
                        placeholder="{Title}.{ext}"    
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                        {['{Title}', '{Uploader}', '{Ext}', '{Id}', '{Width}', '{Height}'].map(variable => (
                            <button 
                                key={variable}
                                onClick={() => setSetting('filenameTemplate', settings.filenameTemplate + variable)}
                                className="px-2 py-1 bg-secondary hover:bg-primary/20 text-[10px] font-mono rounded border transition-colors"
                            >
                                {variable}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.downloads.resolution}</label>
                        <Select 
                            value={settings.resolution} 
                            onChange={val => setSetting('resolution', val)}
                            options={[
                                { value: "Best", label: t.settings.downloads.best },
                                { value: "2160", label: "4K (2160p)" },
                                { value: "1080", label: "1080p" },
                                { value: "720", label: "720p" },
                                { value: "360", label: "360p" },
                                { value: "audio", label: t.settings.downloads.audio },
                            ]}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t.settings.downloads.container}</label>
                        <Select 
                            value={settings.container} 
                            onChange={val => setSetting('container', val)}
                            options={[
                                { value: "mp4", label: "MP4 (Compatible)" },
                                { value: "mkv", label: "MKV (Robust)" }
                            ]}
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}
