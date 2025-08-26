import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from 'react-hot-toast'
import { AuthProvider } from "@/components/auth-provider"
import { ToastProvider } from "@/contexts/ToastContext"
import { ToastContainer } from "@/components/ui/toast"
import { TaskStoreProvider } from "@/components/providers/TaskStoreProvider"

export const metadata = {
  title: 'Sunclaude - Task Management',
  description: 'A modern task management application with focus modes and integrations',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sunclaude'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Sunclaude',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <TaskStoreProvider>
                <SidebarProvider>
                  {children}
                </SidebarProvider>
              </TaskStoreProvider>
              <Toaster />
              <HotToaster 
                position="bottom-right"
                toastOptions={{
                  className: '',
                  duration: 4000,
                  style: {
                    background: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
              <ToastContainer />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
