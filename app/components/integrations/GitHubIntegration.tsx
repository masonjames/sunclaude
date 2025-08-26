"use client"

import * as React from "react"
import { Github, GitPullRequest, Bug, Star, Eye, Users, Calendar, ExternalLink, Plus, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToastFeedback } from "@/hooks/use-toast-feedback"
import { useTaskStore } from "@/stores/task-store"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  language: string
  stargazers_count: number
  watchers_count: number
  open_issues_count: number
  private: boolean
  html_url: string
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  labels: Array<{
    id: number
    name: string
    color: string
    description?: string
  }>
  assignee?: {
    login: string
    avatar_url: string
  }
  milestone?: {
    title: string
    due_on?: string
  }
  created_at: string
  updated_at: string
  html_url: string
  repository: GitHubRepository
  pull_request?: {
    url: string
    merged_at?: string
    draft: boolean
  }
}

interface GitHubIntegrationProps {
  onItemSelected?: (item: GitHubIssue) => void
}

export function GitHubIntegration({ onItemSelected }: GitHubIntegrationProps) {
  const [repositories, setRepositories] = React.useState<GitHubRepository[]>([])
  const [issues, setIssues] = React.useState<GitHubIssue[]>([])
  const [pullRequests, setPullRequests] = React.useState<GitHubIssue[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedRepo, setSelectedRepo] = React.useState<string>('')
  const [filter, setFilter] = React.useState({
    state: 'open',
    assignee: '',
    labels: '',
    sort: 'updated',
    direction: 'desc'
  })
  const [isConnected, setIsConnected] = React.useState(false)

  const { optimisticToast } = useToastFeedback()
  const { addTaskOptimistic } = useTaskStore()

  // Check GitHub connection status
  React.useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/integrations/github/status')
      const data = await response.json()
      setIsConnected(data.connected)
      
      if (data.connected) {
        fetchRepositories()
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error)
    }
  }

  const connectToGitHub = async () => {
    try {
      // Redirect to GitHub OAuth
      window.location.href = '/api/integrations/github/oauth'
    } catch (error) {
      console.error('Error connecting to GitHub:', error)
    }
  }

  const fetchRepositories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations/github/repositories')
      if (!response.ok) throw new Error('Failed to fetch repositories')
      
      const data = await response.json()
      setRepositories(data.repositories || [])
      
      if (data.repositories?.length > 0 && !selectedRepo) {
        setSelectedRepo(data.repositories[0].full_name)
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchIssues = async (repo: string) => {
    if (!repo) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        state: filter.state,
        sort: filter.sort,
        direction: filter.direction,
        ...(filter.assignee && { assignee: filter.assignee }),
        ...(filter.labels && { labels: filter.labels })
      })
      
      const response = await fetch(`/api/integrations/github/repositories/${encodeURIComponent(repo)}/issues?${params}`)
      if (!response.ok) throw new Error('Failed to fetch issues')
      
      const data = await response.json()
      const allIssues = data.issues || []
      
      // Separate issues and pull requests
      const regularIssues = allIssues.filter((item: GitHubIssue) => !item.pull_request)
      const prs = allIssues.filter((item: GitHubIssue) => item.pull_request)
      
      setIssues(regularIssues)
      setPullRequests(prs)
    } catch (error) {
      console.error('Error fetching issues:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (selectedRepo && isConnected) {
      fetchIssues(selectedRepo)
    }
  }, [selectedRepo, filter, isConnected])

  const handleIssueToTask = async (issue: GitHubIssue) => {
    try {
      await optimisticToast(
        async () => {
          const priority = issue.labels.some(l => l.name.toLowerCase().includes('urgent')) ? 'HIGH' :
                          issue.labels.some(l => l.name.toLowerCase().includes('bug')) ? 'HIGH' :
                          issue.labels.some(l => l.name.toLowerCase().includes('feature')) ? 'MEDIUM' : 'LOW'
          
          await addTaskOptimistic({
            title: `${issue.repository.name}#${issue.number}: ${issue.title}`,
            description: `GitHub Issue: ${issue.body?.slice(0, 200)}${issue.body && issue.body.length > 200 ? '...' : ''}\n\nRepository: ${issue.repository.full_name}\nURL: ${issue.html_url}`,
            date: format(new Date(), 'yyyy-MM-dd'),
            status: 'PLANNED',
            priority: priority as any,
          })
          
          onItemSelected?.(issue)
        },
        {
          optimisticMessage: 'Converting issue to task...',
          successMessage: `Task created from issue #${issue.number}`,
          errorMessage: 'Failed to create task from issue'
        }
      )
    } catch (error) {
      // Error handled by toast
    }
  }

  const getLabelColor = (color: string) => {
    // Ensure color has # prefix
    const hex = color.startsWith('#') ? color : `#${color}`
    return {
      backgroundColor: hex,
      color: getContrastColor(hex)
    }
  }

  const getContrastColor = (hexcolor: string) => {
    // Convert hex to RGB
    const r = parseInt(hexcolor.substr(1, 2), 16)
    const g = parseInt(hexcolor.substr(3, 2), 16)
    const b = parseInt(hexcolor.substr(5, 2), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return format(date, 'MMM d, yyyy')
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Github className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Connect to GitHub</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your GitHub account to sync issues and pull requests
          </p>
        </div>
        <Button onClick={connectToGitHub} className="bg-gray-900 hover:bg-gray-800 text-white">
          <Github className="h-4 w-4 mr-2" />
          Connect GitHub Account
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <h3 className="text-lg font-semibold">GitHub Integration</h3>
        </div>
        <Button variant="outline" size="sm" onClick={checkConnection}>
          Refresh
        </Button>
      </div>

      {/* Repository Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Repository</label>
        <Select value={selectedRepo} onValueChange={setSelectedRepo}>
          <SelectTrigger>
            <SelectValue placeholder="Select a repository" />
          </SelectTrigger>
          <SelectContent>
            {repositories.map((repo) => (
              <SelectItem key={repo.id} value={repo.full_name}>
                <div className="flex items-center gap-2">
                  <span>{repo.full_name}</span>
                  {repo.private && <Badge variant="secondary" className="text-xs">Private</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filter.state} onValueChange={(value) => setFilter(prev => ({ ...prev, state: value }))}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.sort} onValueChange={(value) => setFilter(prev => ({ ...prev, sort: value }))}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="comments">Comments</SelectItem>
          </SelectContent>
        </Select>

        <Input 
          placeholder="Filter by labels..." 
          value={filter.labels}
          onChange={(e) => setFilter(prev => ({ ...prev, labels: e.target.value }))}
          className="w-40"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Github className="h-6 w-6 animate-pulse mx-auto mb-2" />
          Loading GitHub data...
        </div>
      ) : (
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Issues ({issues.length})
            </TabsTrigger>
            <TabsTrigger value="prs" className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4" />
              Pull Requests ({pullRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-3">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bug className="h-6 w-6 mx-auto mb-2" />
                No issues found
              </div>
            ) : (
              issues.map((issue) => (
                <Card key={issue.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Bug className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">#{issue.number} {issue.title}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          Updated {formatDate(issue.updated_at)}
                          {issue.assignee && (
                            <>
                              <span>•</span>
                              <span>Assigned to {issue.assignee.login}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.state === 'open' ? 'default' : 'secondary'}>
                          {issue.state}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIssueToTask(issue)}
                          title="Convert to task"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          title="View on GitHub"
                        >
                          <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {(issue.body || issue.labels.length > 0) && (
                    <CardContent className="pt-0">
                      {issue.body && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {issue.body}
                        </p>
                      )}
                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.map((label) => (
                            <Badge
                              key={label.id}
                              variant="outline"
                              className="text-xs"
                              style={getLabelColor(label.color)}
                            >
                              {label.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="prs" className="space-y-3">
            {pullRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitPullRequest className="h-6 w-6 mx-auto mb-2" />
                No pull requests found
              </div>
            ) : (
              pullRequests.map((pr) => (
                <Card key={pr.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <GitPullRequest className={cn(
                            "h-4 w-4 flex-shrink-0",
                            pr.pull_request?.merged_at ? "text-purple-600" : 
                            pr.state === 'open' ? "text-green-600" : "text-red-600"
                          )} />
                          <span className="truncate">#{pr.number} {pr.title}</span>
                          {pr.pull_request?.draft && (
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          Updated {formatDate(pr.updated_at)}
                          {pr.assignee && (
                            <>
                              <span>•</span>
                              <span>Assigned to {pr.assignee.login}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          pr.pull_request?.merged_at ? 'default' :
                          pr.state === 'open' ? 'default' : 'secondary'
                        }>
                          {pr.pull_request?.merged_at ? 'merged' : pr.state}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIssueToTask(pr)}
                          title="Convert to task"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          title="View on GitHub"
                        >
                          <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {(pr.body || pr.labels.length > 0) && (
                    <CardContent className="pt-0">
                      {pr.body && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {pr.body}
                        </p>
                      )}
                      {pr.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pr.labels.map((label) => (
                            <Badge
                              key={label.id}
                              variant="outline"
                              className="text-xs"
                              style={getLabelColor(label.color)}
                            >
                              {label.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}