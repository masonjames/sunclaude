"use client"

import { useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Calendar, Github, FileText, Hash, Check, X, Loader2 } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  connectUrl?: string
  disconnectAction?: () => Promise<void>
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntegrationStatus()
  }, [session])

  const fetchIntegrationStatus = async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Check connection status for each integration
      const [gmailStatus, calendarStatus, githubStatus, notionStatus, slackStatus] = await Promise.all([
        checkIntegrationStatus('gmail'),
        checkIntegrationStatus('google/calendar'),
        checkIntegrationStatus('github'),
        checkIntegrationStatus('notion'),
        checkIntegrationStatus('slack'),
      ])

      setIntegrations([
        {
          id: 'gmail',
          name: 'Gmail',
          description: 'Access and manage your Gmail messages',
          icon: <Mail className="h-5 w-5" />,
          connected: gmailStatus,
          connectUrl: '/api/integrations/gmail/connect',
        },
        {
          id: 'calendar',
          name: 'Google Calendar',
          description: 'Sync events between tasks and Google Calendar',
          icon: <Calendar className="h-5 w-5" />,
          connected: calendarStatus,
          connectUrl: '/api/integrations/google/calendar/connect',
        },
        {
          id: 'github',
          name: 'GitHub',
          description: 'Create tasks from GitHub issues',
          icon: <Github className="h-5 w-5" />,
          connected: githubStatus,
          connectUrl: null, // Uses NextAuth
        },
        {
          id: 'notion',
          name: 'Notion',
          description: 'Import tasks from Notion databases',
          icon: <FileText className="h-5 w-5" />,
          connected: notionStatus,
          connectUrl: '/api/integrations/notion/connect',
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Share daily plans and manage tasks from Slack',
          icon: <Hash className="h-5 w-5" />,
          connected: slackStatus,
          connectUrl: '/api/integrations/slack/connect',
        },
      ])
    } catch (error) {
      console.error('Error fetching integration status:', error)
      toast({
        title: 'Error',
        description: 'Failed to load integration status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const checkIntegrationStatus = async (integration: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/${integration}/status`)
      if (response.ok) {
        const data = await response.json()
        return data.connected || false
      }
    } catch (error) {
      console.error(`Error checking ${integration} status:`, error)
    }
    return false
  }

  const handleConnect = async (integration: Integration) => {
    if (integration.id === 'github') {
      // GitHub uses NextAuth
      await signIn('github')
    } else if (integration.connectUrl) {
      // Redirect to OAuth flow
      window.location.href = integration.connectUrl
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}/disconnect`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Disconnected',
          description: `${integration.name} has been disconnected`,
        })
        await fetchIntegrationStatus()
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      toast({
        title: 'Error',
        description: `Failed to disconnect ${integration.name}`,
        variant: 'destructive',
      })
    }
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Please sign in to manage your integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signIn()}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your integrations and preferences</p>
      </div>

      <div className="grid gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Profile'}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect your favorite services</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        {integration.icon}
                      </div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.connected ? (
                        <>
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            Connected
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" />
                            Not connected
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleConnect(integration)}
                          >
                            Connect
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-create calendar events</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically create Google Calendar events for tasks with scheduled times
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Default calendar</p>
                  <p className="text-sm text-muted-foreground">
                    Choose which calendar to use for new events
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Select
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}