import React from 'react'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const variantStyles = {
  default: 'bg-slate-900 text-white',
  ghost: 'bg-transparent',
  outline: 'border border-white/20 bg-transparent',
}

const sizeStyles = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base',
}

export function Button({ children, className, variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant] ?? variantStyles.default,
        sizeStyles[size] ?? sizeStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
