"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, Info } from 'lucide-react';

export function StepSchedule() {
  const {
    selectedCandidates,
    autoSchedule,
    setAutoSchedule,
    availableMinutes,
    getTotalPlannedMinutes,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  const totalMinutes = getTotalPlannedMinutes();
  
  // Sort tasks by priority for preview
  const sortedTasks = [...selectedTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks selected. Please go back and select tasks to schedule.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-schedule" className="text-base font-medium">
                Auto-Schedule Tasks
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically allocate time slots based on priority and estimates
              </p>
            </div>
            <Switch
              id="auto-schedule"
              checked={autoSchedule}
              onCheckedChange={setAutoSchedule}
            />
          </div>
          
          {autoSchedule && (
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Tasks will be scheduled in priority order (High → Medium → Low)</p>
                  <p>Time slots will be allocated based on your working hours and existing commitments</p>
                  <p>You can manually adjust the schedule after planning is complete</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Schedule Preview</h3>
        <ScrollArea className="h-[350px]">
          <div className="space-y-2">
            {sortedTasks.map((task, index) => {
              // Simple time allocation preview
              const startTime = 9 * 60; // 9 AM in minutes
              const previousTasks = sortedTasks.slice(0, index);
              const cumulativeMinutes = previousTasks.reduce((sum, t) => sum + t.estimateMinutes, 0);
              const taskStart = startTime + cumulativeMinutes;
              const taskEnd = taskStart + task.estimateMinutes;
              
              const formatTime = (minutes: number) => {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
              };
              
              return (
                <Card key={task.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {autoSchedule && (
                      <div className="text-xs text-muted-foreground min-w-[80px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(taskStart)}
                        </div>
                        <div className="ml-4 text-[10px]">
                          to {formatTime(taskEnd)}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                task.priority === 'high' ? 'destructive' :
                                task.priority === 'medium' ? 'default' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(task.estimateMinutes / 60)}h {task.estimateMinutes % 60}m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      {/* Capacity summary */}
      <Card className="p-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Total scheduled time</span>
          </div>
          <div>
            <span className={totalMinutes > availableMinutes ? 'text-destructive font-bold' : ''}>
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </span>
            <span className="text-muted-foreground">
              {' '}/ {Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m available
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}