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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Calendar Integration</h3>
        </div>
        <div className="flex gap-2">
          <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
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
              <Button size="sm">
                <Clock className="h-4 w-4 mr-2" />
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
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-6 w-6 animate-pulse mx-auto mb-2" />
            Loading calendar events...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            No events found for this date
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3" />
                      {formatEventTime(event.start, event.end, event.isAllDay)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getEventStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEventToTask(event)}
                      title="Convert to task"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(event.description || event.location || event.attendees?.length) && (
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {event.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {event.meetingUrl && (
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
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