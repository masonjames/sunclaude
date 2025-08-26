"use client"

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Github, Mail, MessageCircle, FileText, RefreshCw } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface IntegrationStatus {
  google: {
    connected: boolean
    hasCalendar: boolean
    hasGmail: boolean
  }
  github: {
    connected: boolean
  }
  notion: {
    connected: boolean
  }
  slack: {
    connected: boolean
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    fetchIntegrationStatus()
  }, [session])

  const fetchIntegrationStatus = async () => {
    if (!session) return

    try {
      const response = await fetch('/api/integrations/status')
      const data = await response.json()
      setStatus(data.integrationStatus)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch integration status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (provider: string) => {
    if (provider === 'google' || provider === 'github') {
      await signIn(provider, { callbackUrl: '/settings' })
    }
    // For other providers, we'd implement their specific OAuth flows
  }

  const handleSync = async (integration: string) => {
    setSyncing(integration)
    try {
      if (integration === 'calendar') {
        const response = await fetch('/api/integrations/google/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarId: 'primary' }),
        })
        
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Calendar Synced",
            description: `Synced ${result.syncedTasks} tasks from calendar`,
          })
        }
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with the integration",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  const integrations = [
    {
      id: 'google',
      name: 'Google',
      description: 'Connect Google Calendar and Gmail',
      icon: Calendar,
      connected: status?.google.connected || false,
      features: [
        { name: 'Calendar', connected: status?.google.hasCalendar, syncable: true },
        { name: 'Gmail', connected: status?.google.hasGmail, syncable: false },
      ]
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Import issues as tasks',
      icon: Github,
      connected: status?.github.connected || false,
      features: [
        { name: 'Issues', connected: status?.github.connected, syncable: false },
      ]
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Import pages and databases',
      icon: FileText,
      connected: status?.notion.connected || false,
      features: [
        { name: 'Pages', connected: status?.notion.connected, syncable: false },
      ]
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Daily summaries and notifications',
      icon: MessageCircle,
      connected: status?.slack.connected || false,
      features: [
        { name: 'Notifications', connected: status?.slack.connected, syncable: false },
      ]
    },
  ]

  return (
    <div className="container mx-auto p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect your favorite apps to streamline your workflow</p>
        </div>

        <div className="grid gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <integration.icon className="h-8 w-8" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {integration.name}
                        {integration.connected && (
                          <Badge variant="secondary">Connected</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConnect(integration.id)}
                    disabled={integration.connected}
                    variant={integration.connected ? "outline" : "default"}
                  >
                    {integration.connected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              </CardHeader>
              
              {integration.connected && integration.features.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Available Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <div key={feature.name} className="flex items-center gap-2">
                          <Badge variant={feature.connected ? "default" : "outline"}>
                            {feature.name}
                          </Badge>
                          {feature.syncable && feature.connected && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSync(feature.name.toLowerCase())}
                              disabled={syncing === feature.name.toLowerCase()}
                            >
                              <RefreshCw className={`h-3 w-3 ${syncing === feature.name.toLowerCase() ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}