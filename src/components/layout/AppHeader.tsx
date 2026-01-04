import { Download, FolderOpen, Settings, HelpCircle, Plus, Keyboard } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { translations } from '../../lib/locales'

type Translations = typeof translations.en

interface AppHeaderProps {
  activeTab: string
  setActiveTab: (tab: any) => void
  t: Translations
  openDialog: () => void
  onOpenGuide: () => void
  onOpenShortcuts: () => void
}

export function AppHeader({ activeTab, setActiveTab, t, openDialog, onOpenGuide, onOpenShortcuts }: AppHeaderProps) {
  return (
    <header className="relative h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">ClipScene<span className="text-primary">YT</span></h1>
        </div>

        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-secondary/50 rounded-full p-1 border">
        {[
            { id: 'downloads', label: t.nav.downloads, icon: Download },
            { id: 'history', label: t.history.title, icon: FolderOpen },
            { id: 'settings', label: t.nav.settings, icon: Settings }
        ].map((tab) => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                    "relative px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-colors flex items-center gap-2 z-10",
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {activeTab === tab.id && (
                    <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-background shadow rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 z-10 relative" /> 
                <span className="relative z-10 hidden lg:inline">{tab.label}</span>
            </button>
        ))}
        </nav>

        <div className="flex items-center gap-1">
            <button 
            onClick={onOpenShortcuts}
            className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title={t.guide?.sections?.shortcuts || 'Keyboard Shortcuts'}
            >
            <Keyboard className="w-5 h-5" />
            </button>
            <button 
            onClick={onOpenGuide}
            className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title={t.guide.title}
            >
            <HelpCircle className="w-5 h-5" />
            </button>
            <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openDialog}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-2 shadow-lg shadow-primary/20 text-[10px] sm:text-sm font-bold whitespace-nowrap"
            >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.downloads.new_download}</span>
            <span className="sm:hidden">New</span>
            </motion.button>
        </div>
    </header>
  )
}
