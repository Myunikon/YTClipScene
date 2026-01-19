import { useState, useEffect } from 'react'
import { AlertCircle, Plus, ImageOff, X, ExternalLink, ZoomIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { openUrl } from '@tauri-apps/plugin-opener'

interface VideoPreviewProps {
    loading: boolean
    meta: {
        title: string
        thumbnail: string
    } | null
    error: boolean
    t: any
    url?: string
}

export function VideoPreview({ loading, meta, error, t, url }: VideoPreviewProps) {
    const [imgError, setImgError] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [focusedElementBeforePreview, setFocusedElementBeforePreview] = useState<HTMLElement | null>(null)

    // Focus Management
    useEffect(() => {
        if (isPreviewOpen) {
            // Save current focus
            setFocusedElementBeforePreview(document.activeElement as HTMLElement)
        } else if (focusedElementBeforePreview) {
            // Restore focus
            focusedElementBeforePreview.focus()
            setFocusedElementBeforePreview(null)
        }
    }, [isPreviewOpen])

    const imageSrc = meta?.thumbnail

    const handleOpenLink = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (url) {
            try {
                await openUrl(url)
            } catch (err) {
                console.error("Failed to open URL", err)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (meta && !imgError) setIsPreviewOpen(true)
        }
    }

    return (
        <>
            {/* --- 1. PREVIEW KECIL (THUMBNAIL) --- */}
            <button
                type="button"
                className={`w-full relative flex items-center justify-center text-center border-b border-white/5 shrink-0 overflow-hidden group bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset transition-colors ${loading || !meta || error ? 'h-40' : 'min-h-[160px]'}`}
                onClick={() => meta && !imgError && setIsPreviewOpen(true)}
                onKeyDown={handleKeyDown}
                disabled={loading || error || !meta}
            >
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
                            <div className="relative w-full h-full cursor-zoom-in group">
                                <img
                                    src={imageSrc}
                                    referrerPolicy="no-referrer"
                                    className="max-h-[350px] w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                                    alt="Thumbnail"
                                    draggable={false}
                                    onError={() => setImgError(true)}
                                />

                                {/* PERBAIKAN 1: GRADASI LEBIH HALUS
                                    - Mengurangi 'from-black/90' menjadi 'from-black/80'
                                    - Menghapus 'via-black/20' agar tidak kotor di tengah
                                    - Gradasi hanya fokus di bagian paling bawah untuk teks
                                */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80 transition-opacity duration-300 pointer-events-none"></div>

                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                    <div className="bg-black/50 backdrop-blur-md p-3 rounded-full text-white shadow-xl border border-white/10">
                                        <ZoomIn className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 text-left space-y-1.5">
                                    <h4 className="font-bold text-white text-lg line-clamp-2 leading-tight drop-shadow-md pointer-events-none">
                                        {meta.title}
                                    </h4>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-secondary/80 to-muted/80 dark:from-secondary/20 dark:to-muted/10 p-6 text-center animate-in fade-in duration-500">
                                <div className="p-4 bg-background/50 dark:bg-white/5 rounded-full mb-3 backdrop-blur-sm shadow-sm ring-1 ring-white/10">
                                    <ImageOff className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground/70 max-w-[200px] line-clamp-2 leading-relaxed">
                                    {t.preview.no_thumbnail || meta.title}
                                </span>
                            </div>
                        )}
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
            </button>

            {/* --- 2. LIGHTBOX (PREVIEW BESAR) --- */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isPreviewOpen && meta && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8"
                            onClick={() => setIsPreviewOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative max-w-5xl w-full max-h-screen flex flex-col gap-6"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black/50 border border-white/10 group">
                                    <img
                                        src={imageSrc}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                                        alt={meta.title}
                                        draggable={false}
                                    />

                                    <button
                                        onClick={() => setIsPreviewOpen(false)}
                                        className="absolute top-4 right-4 p-2.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-md border border-white/10 shadow-lg"
                                        title="Close Preview (Esc)"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="text-center text-white space-y-3 px-4">
                                    <h3 className="text-2xl font-bold leading-tight drop-shadow-lg">{meta.title}</h3>

                                    {/* PERBAIKAN 2: LINK TEKS SIMPEL (Tanpa Background)
                                        - text-white/60: Warna default (abu keputihan)
                                        - hover:text-blue-400: Berubah jadi biru saat hover
                                        - transition-colors: Animasi perubahan warna halus
                                    */}
                                    {url && (
                                        <button
                                            onClick={handleOpenLink}
                                            className="inline-flex items-center justify-center gap-2 text-sm text-white/60 hover:text-blue-400 transition-colors py-2 hover:underline underline-offset-4 decoration-blue-400/30"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="truncate max-w-lg">{url}</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    )
}