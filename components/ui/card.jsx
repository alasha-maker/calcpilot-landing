import React from 'react'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}
