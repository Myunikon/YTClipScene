import { Clipboard, List, Link, X, Globe } from 'lucide-react'
import { translations } from '../../lib/locales'
import { cn } from '../../lib/utils'

interface UrlInputProps {
    url: string
    onChange: (val: string) => void
    onPaste: () => void
    t: typeof translations['en']['dialog']
    batchMode?: boolean
    onBatchModeChange?: (batch: boolean) => void
}

export function UrlInput({ url, onChange, onPaste, t, batchMode = false, onBatchModeChange }: UrlInputProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" />
                    {t.url_label}
                </label>
                {onBatchModeChange && (
                    <button
                        type="button"
                        onClick={() => onBatchModeChange(!batchMode)}
                        className={cn(
                            "text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all font-medium border",
                            batchMode 
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                                : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'
                        )}
                        title={batchMode ? "Switch to single URL" : "Switch to batch mode (multiple URLs)"}
                    >
                        {batchMode ? <List className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                        {batchMode ? 'Batch Mode Active' : 'Single URL'}
                    </button>
                )}
            </div>
            
            <div className="relative group">
                {batchMode ? (
                    <div className="relative">
                        <textarea
                            required
                            className="w-full h-32 p-4 pl-11 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 resize-none font-mono leading-relaxed"
                            placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=..."
                            value={url}
                            onChange={e => onChange(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute left-4 top-4 text-muted-foreground/50">
                            <List className="w-4 h-4" />
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                            <Link className="w-4 h-4" />
                        </div>
                        <input 
                            required
                            type="url" 
                            className="w-full p-4 pl-11 pr-12 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                            placeholder="https://youtube.com/watch?v=..."
                            value={url}
                            onChange={e => onChange(e.target.value)}
                            autoFocus
                        />
                        {url && (
                             <button 
                                type="button"
                                onClick={() => onChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {!url && (
                            <button 
                                type="button"
                                onClick={onPaste}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-all border border-white/5 hover:border-white/10"
                                title="Paste from Clipboard"
                            >
                                <Clipboard className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
            {batchMode && (
                <p className="text-[10px] text-muted-foreground/70 pl-1">
                    Paste multiple URLs, one per line.
                </p>
            )}
        </div>
    )
}
