"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, Smartphone } from 'lucide-react'
import { useToastFeedback } from "@/hooks/use-toast-feedback"

interface PWAProviderProps {
  children: React.ReactNode
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false)
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [isStandalone, setIsStandalone] = React.useState(false)
  const [updateAvailable, setUpdateAvailable] = React.useState(false)

  const { success: showSuccess, error: showError } = useToastFeedback()

  React.useEffect(() => {
    // Check if app is already installed or running in standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      
      // Show install prompt after a delay if not already installed
      if (!isStandaloneMode) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 5000) // Show after 5 seconds
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      showSuccess('App installed successfully!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [showSuccess])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered:', registration)

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        console.log('Message from service worker:', event.data)
        
        if (event.data.type === 'CACHE_UPDATED') {
          showSuccess('App updated! Refresh to see changes.')
        }
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setShowInstallPrompt(false)
        showSuccess('App is being installed...')
      } else {
        showError('Installation cancelled')
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Installation failed:', error)
      showError('Installation failed')
    }
  }

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      })
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true')
  }

  return (
    <>
      {children}
      
      {/* Install App Prompt */}
      {showInstallPrompt && deferredPrompt && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Install Sunclaude</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissInstallPrompt}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-3">
                Install the app for a better experience with offline access and notifications.
              </CardDescription>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInstallApp} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </Button>
                <Button size="sm" variant="outline" onClick={dismissInstallPrompt}>
                  Maybe Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* App Update Available */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <Card className="shadow-lg border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Update Available
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                    A new version is ready to install
                  </p>
                </div>
                <Button size="sm" onClick={handleUpdateApp}>
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* iOS/Safari specific install hint */}
      {!isStandalone && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Add to Home Screen</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap the share button and select "Add to Home Screen" for the best experience.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const card = document.querySelector('[data-ios-hint]')
                    if (card) card.remove()
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}