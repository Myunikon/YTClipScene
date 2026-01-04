import { useState, useEffect } from 'react'
import { AlertCircle, Plus, ImageOff } from 'lucide-react'
import { translations } from '../../lib/locales'

interface VideoPreviewProps {
    loading: boolean
    meta: {
        title: string
        thumbnail: string
    } | null
    error: boolean
    t: typeof translations['en']['dialog']
}

export function VideoPreview({ loading, meta, error, t }: VideoPreviewProps) {
    const [imgError, setImgError] = useState(false)

    // Reset error when thumbnail changes
    useEffect(() => {
        setImgError(false)
    }, [meta?.thumbnail])

    return (
        <div className="w-full h-40 bg-secondary/30 relative flex items-center justify-center text-center border-b border-white/5 shrink-0 overflow-hidden group">
            <div className="absolute inset-0 bg-black/5 z-0"></div>
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/20 backdrop-blur-sm animate-pulse">
                    <div className="w-full h-full absolute inset-0 bg-secondary/40"></div>
                    <div className="relative z-20 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/10 shadow-lg"></div>
                        <div className="h-4 w-48 bg-white/10 rounded-full"></div>
                        <div className="h-3 w-32 bg-white/5 rounded-full"></div>
                    </div>
                </div>
            ) : meta ? (
                <>
                    {!imgError ? (
                        <img 
                            src={meta.thumbnail} 
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 blur-[2px] group-hover:blur-0" 
                            alt="Thumbnail Background"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                            <ImageOff className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                    <div className="relative z-20 p-6 flex flex-col justify-end h-full w-full text-left">
                        <h4 className="font-bold text-white text-lg line-clamp-2 leading-tight drop-shadow-md">{meta.title}</h4>
                    </div>
                </>
            ) : error ? (
                <div className="text-red-500 flex flex-col items-center animate-in zoom-in opacity-80 px-4 z-10">
                    <AlertCircle className="w-8 h-8 mb-2 stroke-1" />
                    <p className="text-xs font-semibold">{t.preview.failed}</p>
                </div>
            ) : (
                <div className="text-muted-foreground/40 flex flex-col items-center z-10">
                    <Plus className="w-12 h-12 mb-2 stroke-1 opacity-50" />
                    <p className="text-xs font-medium">{t.preview.instruction}</p>
                </div>
            )}
        </div>
    )
}
