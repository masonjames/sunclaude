import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: 'Sunclaude - Task Management',
  description: 'To Do App with Focus Modes and Simple Integrations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
