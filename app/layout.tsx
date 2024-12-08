import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TaskProvider } from '@/context/task-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SunClaude - Task Management',
  description: 'Easy To Dos and Focused Task Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TaskProvider>
          {children}
        </TaskProvider>
      </body>
    </html>
  )
}