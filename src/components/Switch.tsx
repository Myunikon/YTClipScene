import { cn } from '../lib/utils'

interface SwitchProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            data-state={checked ? 'checked' : 'unchecked'}
            disabled={disabled}
            onClick={() => !disabled && onCheckedChange(!checked)}
            className={cn(
                "w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 border-2 border-transparent",
                checked 
                    ? "bg-blue-500 dark:bg-blue-400" 
                    : "bg-neutral-300 dark:bg-neutral-600",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <span
                data-state={checked ? 'checked' : 'unchecked'}
                className={cn(
                    "block w-5 h-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    )
}
