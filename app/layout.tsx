import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/components/auth-provider"
import { ToastProvider } from "@/contexts/ToastContext"
import { ToastContainer } from "@/components/ui/notification"
import { TaskStoreProvider } from "@/components/providers/TaskStoreProvider"
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider"

export const metadata = {
  title: 'Sunclaude - Task Management',
  description: 'A modern task management application with focus modes and integrations',
  manifest: '/manifest.json',
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3b82f6'
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
                <KeyboardShortcutsProvider>
                  <SidebarProvider>
                    {children}
                  </SidebarProvider>
                </KeyboardShortcutsProvider>
              </TaskStoreProvider>
              <ToastContainer />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
