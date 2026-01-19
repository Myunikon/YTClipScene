import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../lib/utils'

interface Option {
    value: string
    label: string
}

interface SelectProps {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function Select({ value, onChange, options, placeholder, className, disabled }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setFocusedIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Scroll focused item into view
    useEffect(() => {
        if (isOpen && listRef.current && focusedIndex >= 0) {
            const list = listRef.current
            const element = list.children[focusedIndex] as HTMLElement
            if (element) {
                element.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [focusedIndex, isOpen])

    // Reset focused index when opening
    useEffect(() => {
        if (isOpen) {
            const index = options.findIndex(o => o.value === value)
            setFocusedIndex(index >= 0 ? index : 0)
        } else {
            setFocusedIndex(-1)
        }
    }, [isOpen, value, options])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (isOpen) {
                    if (focusedIndex >= 0 && focusedIndex < options.length) {
                        onChange(options[focusedIndex].value)
                        setIsOpen(false)
                    }
                } else {
                    setIsOpen(true)
                }
                break
            case 'ArrowDown':
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else {
                    setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev))
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else {
                    setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                break
            case 'Tab':
                if (isOpen) {
                    // Close on tab out
                    setIsOpen(false)
                }
                break
        }
    }

    const selectedOption = options.find(o => o.value === value)
    const displayLabel = selectedOption ? selectedOption.label : (placeholder || "Select...")

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-full flex items-center justify-between px-3 h-10 text-sm rounded-lg border focus:outline-none transition-all focus:ring-2 focus:ring-primary/50",
                    "bg-secondary/20 hover:bg-secondary/40 border-border/50 hover:border-primary/30",
                    "dark:bg-secondary/50 dark:hover:bg-secondary/70 dark:border-white/10",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "ring-2 ring-primary/20 border-primary/50 bg-secondary/40 dark:bg-secondary/80",
                    className
                )}
            >
                <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>{displayLabel}</span>
                <ChevronDown className={cn("w-4 h-4 opacity-50", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-xl">
                    <div ref={listRef} className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {options.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value)
                                    setIsOpen(false)
                                }}
                                onMouseEnter={() => setFocusedIndex(index)}
                                className={cn(
                                    "relative w-full cursor-default select-none py-2 pl-9 pr-3 text-sm rounded-lg outline-none text-left flex items-center",
                                    index === focusedIndex ? "bg-accent text-accent-foreground" : "text-popover-foreground",
                                    option.value === value ? "font-medium" : ""
                                )}
                            >
                                {option.value === value && (
                                    <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                                <span className="block truncate">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
