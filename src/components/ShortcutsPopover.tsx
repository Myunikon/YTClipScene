import { useRef, useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { translations } from '../lib/locales'

interface ShortcutsPopoverProps {
    isOpen: boolean
    onClose: () => void
    anchorRef?: React.RefObject<HTMLButtonElement>
}

const shortcuts = [
    { keys: ['Ctrl', 'N'], action: 'new_download' },
    { keys: ['Ctrl', ','], action: 'settings' },
    { keys: ['F12'], action: 'devtools' },
    { keys: ['Esc'], action: 'close_dialog' },
]

export function ShortcutsPopover({ isOpen, onClose }: ShortcutsPopoverProps) {
    const { settings } = useAppStore()
    const t = translations[settings.language as keyof typeof translations]
    const popoverRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    // Close on Esc
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
        }
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'new_download': return t.downloads.new_download
            case 'settings': return t.nav.settings
            case 'devtools': return 'DevTools'
            case 'close_dialog': return t.dialog?.cancel || 'Close'
            default: return action
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-14 right-24 z-50 w-64 p-4 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Keyboard className="w-4 h-4 text-primary" />
                            {t.guide?.sections?.shortcuts || 'Keyboard Shortcuts'}
                        </h3>
                        <button 
                            onClick={onClose}
                            className="p-1 hover:bg-secondary rounded-full transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        {shortcuts.map((shortcut, i) => (
                            <div 
                                key={i}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors"
                            >
                                <span className="text-xs text-muted-foreground">
                                    {getActionLabel(shortcut.action)}
                                </span>
                                <div className="flex items-center gap-1">
                                    {shortcut.keys.map((key, j) => (
                                        <kbd 
                                            key={j}
                                            className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px] font-mono font-medium"
                                        >
                                            {key}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
