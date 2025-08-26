'use client'

import React, { useEffect, useState } from 'react'
import { useToast, Toast as ToastType } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface NotificationProps {
  toast: ToastType
}

function Notification({ toast }: NotificationProps) {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Trigger enter animation with staggered timing for polish
    const enterTimer = setTimeout(() => setIsVisible(true), 100)
    
    // Progress bar animation
    const duration = toast.duration || 5000
    if (duration > 0) {
      const startTime = Date.now()
      const progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, duration - elapsed)
        setProgress((remaining / duration) * 100)
        
        if (remaining <= 0) {
          clearInterval(progressTimer)
        }
      }, 16) // ~60fps for smooth animation
      
      return () => {
        clearTimeout(enterTimer)
        clearInterval(progressTimer)
      }
    }
    
    return () => clearTimeout(enterTimer)
  }, [toast.duration])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 250) // Faster exit for responsiveness
  }

  const getIcon = () => {
    const iconProps = { className: "h-5 w-5 flex-shrink-0" }
    switch (toast.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
      case 'error':
        return <XCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      case 'info':
      default:
        return <Info {...iconProps} className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
    }
  }

  const getStyleClasses = () => {
    const baseClasses = "backdrop-blur-md border-2"
    switch (toast.type) {
      case 'success':
        return `${baseClasses} bg-emerald-50/90 border-emerald-200/50 dark:bg-emerald-950/90 dark:border-emerald-800/50`
      case 'error':
        return `${baseClasses} bg-red-50/90 border-red-200/50 dark:bg-red-950/90 dark:border-red-800/50`
      case 'warning':
        return `${baseClasses} bg-amber-50/90 border-amber-200/50 dark:bg-amber-950/90 dark:border-amber-800/50`
      case 'info':
      default:
        return `${baseClasses} bg-blue-50/90 border-blue-200/50 dark:bg-blue-950/90 dark:border-blue-800/50`
    }
  }

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-emerald-500 dark:bg-emerald-400'
      case 'error': return 'bg-red-500 dark:bg-red-400'
      case 'warning': return 'bg-amber-500 dark:bg-amber-400'
      case 'info':
      default: return 'bg-blue-500 dark:bg-blue-400'
    }
  }

  return (
    <div
      className={cn(
        'group pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl shadow-xl',
        'transform transition-all duration-300 ease-out',
        getStyleClasses(),
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : isLeaving 
          ? 'translate-x-full opacity-0 scale-95'
          : 'translate-x-full opacity-0 scale-95'
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <div 
            className={cn('h-full transition-all duration-75 ease-linear', getProgressColor())}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {toast.description}
              </p>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-start p-6 gap-3"
      aria-live="polite"
      aria-label="Notifications"
    >
      <div className="flex flex-col items-end gap-3 max-h-screen overflow-hidden">
        {toasts.slice(-5).map((toast, index) => (
          <div
            key={toast.id}
            className="transform transition-all duration-300 ease-out"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both'
            }}
          >
            <Notification toast={toast} />
          </div>
        ))}
      </div>
    </div>
  )
}