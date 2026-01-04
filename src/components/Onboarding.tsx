import { useState } from 'react'
import { Rocket, Download, FolderOpen, Zap, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

export function Onboarding() {
    const { settings, setSetting } = useAppStore()
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1) // 1 for forward, -1 for back

    if (settings.hasSeenOnboarding) return null

    const steps = [
        {
            title: "Welcome to ClipSceneYT",
            desc: "The ultimate video downloader with precision clipping, smart queue management, and lightning-fast downloads.",
            icon: Rocket,
            gradient: "from-violet-500 to-purple-600",
            bgGlow: "bg-violet-500/20"
        },
        {
            title: "One-Click Downloads",
            desc: "Just copy any video URL and paste it. We auto-detect links from your clipboard and handle everything else.",
            icon: Download,
            gradient: "from-blue-500 to-cyan-500",
            bgGlow: "bg-blue-500/20"
        },
        {
            title: "Smart Queue System",
            desc: "Track active downloads in real-time. Access completed files instantly from History with one click.",
            icon: FolderOpen,
            gradient: "from-orange-500 to-amber-500",
            bgGlow: "bg-orange-500/20"
        },
        {
            title: "Precision Clipping",
            desc: "Download only the parts you need. Set exact timestamps to trim videos down to the perfect clip.",
            icon: Zap,
            gradient: "from-yellow-500 to-orange-500",
            bgGlow: "bg-yellow-500/20"
        },
        {
            title: "Ready to Go!",
            desc: "Customize your experience in Settings. Choose your theme, language, and download preferences.",
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-green-500",
            bgGlow: "bg-emerald-500/20"
        }
    ]

    const handleNext = () => {
        if (step < steps.length - 1) {
            setDirection(1)
            setStep(step + 1)
        } else {
            setSetting('hasSeenOnboarding', true)
        }
    }

    const handleBack = () => {
        if (step > 0) {
            setDirection(-1)
            setStep(step - 1)
        }
    }

    const current = steps[step]

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className={cn("absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl", current.bgGlow)}
                />
                <motion.div 
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className={cn("absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl", current.bgGlow)}
                />
            </div>

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-background/80 backdrop-blur-2xl w-[480px] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
                {/* Close Button */}
                <button 
                    onClick={() => setSetting('hasSeenOnboarding', true)}
                    className="absolute top-5 right-5 p-2 hover:bg-white/10 rounded-full text-muted-foreground transition-all hover:rotate-90 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-10 pb-6 flex flex-col items-center text-center min-h-[340px]">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="flex flex-col items-center"
                        >
                            {/* Icon with gradient background */}
                            <motion.div 
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                                className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl relative",
                                    `bg-gradient-to-br ${current.gradient}`
                                )}
                            >
                                <current.icon className="w-10 h-10 text-white drop-shadow-lg" />
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-2xl bg-white/20"
                                />
                            </motion.div>
                            
                            {/* Title */}
                            <motion.h2 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15 }}
                                className="text-2xl font-bold mb-4 tracking-tight flex items-center gap-2"
                            >
                                {current.title}
                                {step === 0 && <Sparkles className="w-5 h-5 text-yellow-500" />}
                            </motion.h2>
                            
                            {/* Description */}
                            <motion.p 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-muted-foreground text-sm leading-relaxed max-w-[340px]"
                            >
                                {current.desc}
                            </motion.p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer / Navigation */}
                <div className="px-10 pb-8 pt-4 flex items-center justify-between border-t border-white/5">
                    {/* Progress Dots */}
                    <div className="flex gap-2">
                        {steps.map((s, i) => (
                            <motion.button
                                key={i}
                                onClick={() => {
                                    setDirection(i > step ? 1 : -1)
                                    setStep(i)
                                }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300 cursor-pointer",
                                    i === step 
                                        ? `w-8 bg-gradient-to-r ${s.gradient}` 
                                        : "w-2 bg-white/20 hover:bg-white/40"
                                )}
                            />
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-3">
                        {step > 0 && (
                            <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Back
                            </motion.button>
                        )}
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNext}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg text-white",
                                `bg-gradient-to-r ${current.gradient} hover:shadow-xl`
                            )}
                        >
                            {step === steps.length - 1 ? "Get Started" : "Continue"}
                            {step !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
