"use client"

import * as React from "react"
import { Calendar, Clock, Plus, ExternalLink, MapPin, Users, Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToastFeedback } from "@/hooks/use-toast-feedback"
import { CalendarSkeleton } from "@/components/ui/skeleton"
import { useTaskStore } from "@/stores/task-store"
import { Task } from "@/types/task"
import { format, addMinutes, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurrence?: string
  reminders?: number[]
  meetingUrl?: string
  calendarId: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface CalendarIntegrationProps {
  task?: Task
  selectedDate?: Date
  onEventCreated?: (event: CalendarEvent) => void
  onTimeBlocked?: (start: Date, end: Date, title: string) => void
}

export function CalendarIntegration({ 
  task, 
  selectedDate, 
  onEventCreated, 
  onTimeBlocked 
}: CalendarIntegrationProps) {
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [loading, setLoading] = React.useState(false)
  const [createEventOpen, setCreateEventOpen] = React.useState(false)
  const [timeBlockOpen, setTimeBlockOpen] = React.useState(false)
  const [newEvent, setNewEvent] = React.useState({
    title: task?.title || '',
    description: task?.description || '',
    duration: 60,
    location: '',
    attendees: '',
    isAllDay: false,
    reminders: [15],
    calendarId: 'primary'
  })

  const { optimisticToast } = useToastFeedback()
  const { addTaskOptimistic } = useTaskStore()

  // Fetch calendar events for the selected date
  const fetchCalendarEvents = React.useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const response = await fetch(`/api/integrations/google/calendar/events?date=${dateStr}`)
      if (!response.ok) throw new Error('Failed to fetch calendar events')
      
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load events when date changes
  React.useEffect(() => {
    if (selectedDate) {
      fetchCalendarEvents(selectedDate)
    }
  }, [selectedDate, fetchCalendarEvents])

  // Create calendar event from task
  const handleCreateEvent = async () => {
    if (!selectedDate || !newEvent.title.trim()) return

    const startTime = new Date(selectedDate)
    startTime.setHours(9, 0, 0, 0) // Default to 9 AM

    const endTime = addMinutes(startTime, newEvent.duration)

    const eventData = {
      title: newEvent.title,
      description: newEvent.description,
      start: newEvent.isAllDay ? format(selectedDate, 'yyyy-MM-dd') : startTime.toISOString(),
      end: newEvent.isAllDay ? format(selectedDate, 'yyyy-MM-dd') : endTime.toISOString(),
      location: newEvent.location || undefined,
      attendees: newEvent.attendees.split(',').map(email => email.trim()).filter(Boolean),
      isAllDay: newEvent.isAllDay,
      reminders: newEvent.reminders,
      calendarId: newEvent.calendarId
    }

    try {
      await optimisticToast(
        async () => {
          const response = await fetch('/api/integrations/google/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          })
          
          if (!response.ok) throw new Error('Failed to create calendar event')
          
          const createdEvent = await response.json()
          setEvents(prev => [...prev, createdEvent])
          onEventCreated?.(createdEvent)
          
          return createdEvent
        },
        {
          optimisticMessage: 'Creating calendar event...',
          successMessage: `Event "${newEvent.title}" created successfully`,
          errorMessage: 'Failed to create calendar event'
        }
      )

      setCreateEventOpen(false)
      setNewEvent({
        title: '',
        description: '',
        duration: 60,
        location: '',
        attendees: '',
        isAllDay: false,
        reminders: [15],
        calendarId: 'primary'
      })
    } catch (error) {
      // Error handled by toast
    }
  }

  // Block time for focused work
  const handleTimeBlock = async () => {
    if (!selectedDate || !newEvent.title.trim()) return

    const startTime = new Date(selectedDate)
    startTime.setHours(9, 0, 0, 0) // Default to 9 AM
    const endTime = addMinutes(startTime, newEvent.duration)

    try {
      await optimisticToast(
        async () => {
          // Create a "busy" event for time blocking
          const blockEvent = {
            title: `🔒 ${newEvent.title} (Focus Time)`,
            description: `Time blocked for focused work: ${newEvent.description}`,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            calendarId: 'primary',
            status: 'busy',
            transparency: 'opaque'
          }

          const response = await fetch('/api/integrations/google/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blockEvent)
          })
          
          if (!response.ok) throw new Error('Failed to block time')
          
          const createdBlock = await response.json()
          setEvents(prev => [...prev, createdBlock])
          onTimeBlocked?.(startTime, endTime, newEvent.title)
          
          // Create corresponding task if not from existing task
          if (!task) {
            await addTaskOptimistic({
              title: newEvent.title,
              description: newEvent.description,
              date: format(selectedDate, 'yyyy-MM-dd'),
              status: 'SCHEDULED',
              priority: 'HIGH',
              dueTime: format(startTime, 'HH:mm')
            })
          }
          
          return createdBlock
        },
        {
          optimisticMessage: 'Blocking time...',
          successMessage: `Time blocked for "${newEvent.title}"`,
          errorMessage: 'Failed to block time'
        }
      )

      setTimeBlockOpen(false)
    } catch (error) {
      // Error handled by toast
    }
  }

  // Convert calendar event to task
  const handleEventToTask = async (event: CalendarEvent) => {
    try {
      await optimisticToast(
        async () => {
          const eventStart = parseISO(event.start)
          
          await addTaskOptimistic({
            title: event.title,
            description: event.description || `Imported from calendar event`,
            date: format(eventStart, 'yyyy-MM-dd'),
            status: 'SCHEDULED',
            priority: 'MEDIUM',
            dueTime: event.isAllDay ? undefined : format(eventStart, 'HH:mm')
          })
        },
        {
          optimisticMessage: 'Converting event to task...',
          successMessage: `Task created from "${event.title}"`,
          errorMessage: 'Failed to create task from event'
        }
      )
    } catch (error) {
      // Error handled by toast
    }
  }

  const formatEventTime = (start: string, end: string, isAllDay?: boolean) => {
    if (isAllDay) return 'All Day'
    
    const startTime = parseISO(start)
    const endTime = parseISO(end)
    
    return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'tentative': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100/60 dark:border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100/50 dark:bg-blue-950/30 border border-blue-200/30 dark:border-blue-800/30">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Calendar Integration</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Schedule events and block focus time</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 hover:shadow-sm transition-all duration-200">
                <Plus className="h-4 w-4" />
                Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
                <DialogDescription>
                  Create a new event {task ? `for task "${task.title}"` : 'on your calendar'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Event description (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="all-day"
                      checked={newEvent.isAllDay}
                      onCheckedChange={(checked) => setNewEvent(prev => ({ ...prev, isAllDay: checked }))}
                    />
                    <Label htmlFor="all-day">All day</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Location (optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateEventOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEvent} disabled={!newEvent.title.trim()}>
                  Create Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={timeBlockOpen} onOpenChange={setTimeBlockOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200">
                <Clock className="h-4 w-4" />
                Block Time
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Block Focus Time</DialogTitle>
                <DialogDescription>
                  Block time on your calendar for focused work
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="block-title">Focus Session Title</Label>
                  <Input
                    id="block-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What will you focus on?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block-duration">Duration (minutes)</Label>
                  <Select 
                    value={newEvent.duration.toString()}
                    onValueChange={(value) => setNewEvent(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTimeBlockOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTimeBlock} disabled={!newEvent.title.trim()}>
                  Block Time
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Events List */}
      <div className="space-y-4">
        {loading ? (
          <CalendarSkeleton variant="shimmer" />
        ) : events.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mx-auto w-16 h-16 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl flex items-center justify-center mb-4 border border-gray-200/50 dark:border-gray-700/50">
              <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No events scheduled</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create an event or block focus time to get started</p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateEventOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </div>
          </div>
        ) : (
          events.map((event) => (
            <Card 
              key={event.id} 
              className="group border-2 border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm hover:border-gray-300/60 dark:hover:border-gray-700/60 hover:shadow-lg hover:bg-white/90 dark:hover:bg-gray-950/90 transition-all duration-300 ease-out hover:scale-[1.01]"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <Clock className="h-3.5 w-3.5" />
                        {formatEventTime(event.start, event.end, event.isAllDay)}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge className={cn(getEventStatusColor(event.status), "text-xs font-semibold px-2.5 py-1 border")}>
                      {event.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEventToTask(event)}
                      title="Convert to task"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(event.description || event.location || event.attendees?.length || event.meetingUrl) && (
                <CardContent className="pt-0 border-t border-gray-100/50 dark:border-gray-800/50">
                  <div className="space-y-3 text-sm">
                    {event.description && (
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-medium">{event.location}</span>
                        </div>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium">{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {event.meetingUrl && (
                        <a
                          href={event.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-lg border border-blue-200/40 dark:border-blue-800/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition-colors duration-200 font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Join Meeting
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}