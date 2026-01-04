import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Cpu, MemoryStick, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface SystemStats {
    cpu_usage: number
    memory_used: number
    memory_total: number
    memory_percent: number
    download_speed: number
    upload_speed: number
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes.toFixed(0)} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`
}

export function StatusBar() {
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let isMounted = true
        
        const fetchStats = async () => {
            try {
                const result = await invoke<SystemStats>('get_system_stats')
                if (isMounted) {
                    setStats(result)
                    setError(false)
                }
            } catch (e) {
                console.error('Failed to get system stats:', e)
                if (isMounted) setError(true)
            }
        }

        fetchStats()
        const interval = setInterval(fetchStats, 2000) // Update every 2 seconds

        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [])

    if (error || !stats) {
        return null // Don't show if unavailable
    }

    // Colors for usage levels
    const cpuColor = stats.cpu_usage > 80 ? 'text-red-500' : stats.cpu_usage > 50 ? 'text-yellow-500' : 'text-green-500'
    const memColor = stats.memory_percent > 80 ? 'text-red-500' : stats.memory_percent > 60 ? 'text-yellow-500' : 'text-green-500'

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-t border-border/50 px-4 py-1.5">
            <div className="w-full flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap">
                {/* CPU & RAM */}
                <div className="flex items-center gap-1.5" title={`CPU Usage: ${stats.cpu_usage.toFixed(1)}%`}>
                    <Cpu className={`w-3.5 h-3.5 ${cpuColor}`} />
                    <span className={cpuColor}>{stats.cpu_usage.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5" title={`RAM: ${formatBytes(stats.memory_used)} / ${formatBytes(stats.memory_total)}`}>
                    <MemoryStick className={`w-3.5 h-3.5 ${memColor}`} />
                    <span className={memColor}>{stats.memory_percent.toFixed(0)}%</span>
                    <span className="text-muted-foreground/50 hidden sm:inline">
                        ({formatBytes(stats.memory_used)})
                    </span>
                </div>

                {/* Separator */}
                <div className="h-3 w-px bg-border hidden sm:block"></div>

                {/* Network */}
                <div className="flex items-center gap-1.5" title="Download Speed">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-500">{formatSpeed(stats.download_speed)}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Upload Speed">
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">{formatSpeed(stats.upload_speed)}</span>
                </div>
            </div>
        </div>
    )
}
