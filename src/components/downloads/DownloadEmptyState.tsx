import { Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface DownloadEmptyStateProps {
    t: any
}

export function DownloadEmptyState({ t }: DownloadEmptyStateProps) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-transparent">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-md w-full text-center space-y-6"
            >
                {/* Icon Container - Minimal */}
                <div className="relative inline-block group">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative w-16 h-16 mx-auto bg-secondary/30 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-secondary/50 transition-colors duration-300">
                        <Download className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </div>
                </div>

                {/* Text Content - Subtle */}
                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-foreground/80">
                        {t.empty || "No downloads yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
                        {(t.empty_description || "Paste a link or press Ctrl+N to start.").split("Ctrl+N").map((part: string, i: number, arr: string[]) => (
                             <span key={i}>
                                {part}
                                {i < arr.length - 1 && <span className="font-mono text-primary/80">Ctrl+N</span>}
                             </span>
                        ))}
                    </p>
                </div>

                {/* Minimal Platform Indicators */}
                <div className="pt-4 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-300">
                     {[
                        { color: "text-red-500", label: "YT" },
                        { color: "text-purple-500", label: "IG" },
                        { color: "text-cyan-500", label: "TK" }
                    ].map((platform, i) => (
                        <span key={i} className={`text-[10px] font-mono ${platform.color} bg-secondary/50 px-1.5 py-0.5 rounded`}>
                            {platform.label}
                        </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground pl-1">{t.plus_more || "+1000 more"}</span>
                </div>
            </motion.div>
        </div>
    )
}
