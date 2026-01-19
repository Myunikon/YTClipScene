import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { Download, HardDrive, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeftPanel } from './add-dialog/LeftPanel'
import { RightPanel } from './add-dialog/RightPanel'
import { useAddDialog } from './add-dialog/useAddDialog'
import { parseTime, cn } from '../lib/utils'

interface AddDialogProps {
    addTask: (url: string, opts: any) => any
    initialUrl?: string
    previewLang?: string | null
    isOffline?: boolean
}

export type AddDialogHandle = {
    showModal: () => void
    close: () => void
    quickDownload: (url: string) => Promise<boolean>
}

export const AddDialog = forwardRef<AddDialogHandle, AddDialogProps>((props, ref) => {
    const {
        isOpen, setIsOpen,
        url, setUrl,
        options, setters,
        meta, loadingMeta, errorMeta,
        availableResolutions, availableAudioBitrates, availableVideoCodecs, availableAudioCodecs, availableLanguages,
        handleSubmit, browse, handlePaste, quickDownload,
        t,
        formatFileSize,
        estimatedSize,
        settings,
        resetForm,
        isDiskFull,
        diskFreeSpace
    } = useAddDialog(props)



    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        showModal: () => setIsOpen(true),
        close: () => {
            resetForm()
            setIsOpen(false)
        },
        quickDownload
    }))

    // Styles
    const isLowPerf = settings.lowPerformanceMode
    const backdropClass = isLowPerf
        ? 'absolute inset-0 bg-black/80'
        : 'absolute inset-0 bg-black/60 backdrop-blur-sm'

    // Dialog class logic
    const hasMeta = !!meta
    const dialogClass = isLowPerf
        ? `relative z-10 w-full ${hasMeta ? 'md:max-w-5xl' : 'md:max-w-lg'} md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden shadow-2xl flex flex-col md:max-h-[90vh] max-h-[85vh] border border-border bg-background mt-auto md:mt-0`
        : `glass-strong relative z-10 w-full ${hasMeta ? 'md:max-w-5xl' : 'md:max-w-lg'} md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden shadow-2xl flex flex-col md:max-h-[90vh] max-h-[85vh] border border-white/10 mt-auto md:mt-0`

    // Animation Variants
    const desktopVariants = {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 10 }
    }

    const mobileVariants = {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" }
    }

    // Determine if mobile (dynamic listener)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])


    const formClass = isLowPerf
        ? 'flex flex-col flex-1 overflow-hidden bg-background'
        : 'flex flex-col flex-1 overflow-hidden bg-background dark:bg-background/40 dark:backdrop-blur-md'

    const formattedSize = formatFileSize(estimatedSize || 0)

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, pointerEvents: 'none' }}
                    animate={{ opacity: 1, pointerEvents: 'auto' }}
                    exit={{ opacity: 0, pointerEvents: 'none' }}
                    className="fixed inset-0 z-50 flex md:items-center items-end justify-center md:p-4 p-0"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className={backdropClass}
                    />

                    <motion.div
                        variants={isMobile ? mobileVariants : desktopVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        className={dialogClass}
                    >
                        <form onSubmit={handleSubmit} className={formClass}>

                            {/* --- HEADER --- */}
                            <div className="flex items-center justify-between p-4 border-b border-border dark:border-white/5 bg-background dark:bg-black/20">
                                <h2 className="text-xl font-bold tracking-tight text-foreground">
                                    {meta ? t.customize_download : t.new_download}
                                </h2>

                                <div className="flex items-center gap-2">


                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetForm()
                                            setIsOpen(false)
                                        }}
                                        className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Main Split Layout */}
                            <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden overflow-y-auto scrollbar-thin">

                                <LeftPanel
                                    url={url} setUrl={setUrl}
                                    handlePaste={handlePaste}
                                    t={t}
                                    loadingMeta={loadingMeta} meta={meta} errorMeta={errorMeta}
                                    options={options} setters={setters}
                                    browse={browse}
                                />

                                <RightPanel
                                    url={url} hasMeta={hasMeta} meta={meta} t={t}

                                    options={options} setters={setters}
                                    availableResolutions={availableResolutions}
                                    availableAudioBitrates={availableAudioBitrates}
                                    availableVideoCodecs={availableVideoCodecs}
                                    availableAudioCodecs={availableAudioCodecs}
                                    availableLanguages={availableLanguages}
                                    isLowPerf={settings.lowPerformanceMode}
                                />
                            </div>

                            <div className="flex justify-between items-center p-6 border-t border-border dark:border-white/10 bg-muted/50 dark:bg-card/95 shrink-0 gap-4 z-20">
                                <div className="flex-1 min-w-0">
                                    {(estimatedSize || (meta?.formats)) && hasMeta && (
                                        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Size</span>
                                            <div className="flex items-center gap-2 text-sm font-mono font-medium text-foreground overflow-hidden h-5">
                                                <HardDrive className={cn("w-3.5 h-3.5", isDiskFull ? "text-red-500" : "text-primary")} />
                                                <span className={cn("block min-w-[3ch]", isDiskFull ? "text-red-500" : "")}>
                                                    {formattedSize}
                                                </span>
                                                {options.isClipping && <span className="text-orange-500 text-xs font-bold px-1.5 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">TRIMMED</span>}
                                                {isDiskFull && (
                                                    <span className="text-red-500 text-xs flex items-center gap-1 animate-pulse ml-2">
                                                        <span className="font-bold">⚠️ Insufficient Disk Space</span>
                                                        <span className="opacity-70">({formatFileSize(diskFreeSpace || 0)} free)</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => {
                                        resetForm()
                                        setIsOpen(false)
                                    }} className="px-6 py-3 hover:bg-secondary/50 rounded-xl font-medium transition-colors text-sm text-muted-foreground hover:text-foreground">{t.cancel}</button>
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit()}
                                        disabled={!hasMeta || props.isOffline || (options.isClipping && !!options.rangeStart && !!options.rangeEnd && parseTime(options.rangeStart) >= parseTime(options.rangeEnd)) || isDiskFull}
                                        className={cn(
                                            "relative isolate overflow-hidden group px-8 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2.5 transform active:scale-[0.98] border border-white/20",
                                            isDiskFull
                                                ? "bg-red-500/20 text-red-500 border-red-500/20"
                                                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                                        )}
                                    >
                                        {!isDiskFull && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />}
                                        <Download className="w-4 h-4 drop-shadow-sm" />
                                        <span className="relative drop-shadow-sm tracking-wide">{options.batchMode ? t.download_all : t.download}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
AddDialog.displayName = 'AddDialog'
