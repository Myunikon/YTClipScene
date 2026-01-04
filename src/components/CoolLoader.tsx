import { motion } from "framer-motion";

export function CoolLoader({ text = "Initializing..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 z-50">
      {/* Animation Container */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        
        {/* Core Glow */}
        <motion.div
          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer Orbit */}
        <motion.div
            className="absolute inset-0 rounded-full border border-primary/20 border-t-primary/60 border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner Orbit - Reverse */}
        <motion.div
            className="absolute inset-4 rounded-full border border-purple-500/20 border-b-purple-500/60 border-r-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Central Breathing Orb */}
        <motion.div
          className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-purple-600 shadow-lg shadow-primary/30"
          animate={{ 
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
             <div className="absolute inset-0 bg-white/20 rounded-full blur-[1px]" />
        </motion.div>
      </div>

      {/* Elegant Text */}
      <div className="flex flex-col items-center gap-2">
        <motion.p 
            className="text-sm font-medium tracking-[0.2em] text-foreground/80 uppercase"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
            {text}
        </motion.p>
        <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
}
