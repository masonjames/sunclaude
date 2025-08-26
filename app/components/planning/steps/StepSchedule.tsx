"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar } from 'lucide-react';

export function StepSchedule() {
  const {
    selectedCandidates,
    autoSchedule,
    setAutoSchedule,
    getTotalPlannedMinutes,
    availableMinutes,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  const totalMinutes = getTotalPlannedMinutes();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Scheduling Options</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-schedule"
            checked={autoSchedule}
            onCheckedChange={setAutoSchedule}
          />
          <Label htmlFor="auto-schedule" className="text-sm">
            Auto-schedule tasks based on priority and work hours
          </Label>
        </div>
        
        {autoSchedule && (
          <div className="mt-3 text-xs text-muted-foreground">
            Tasks will be automatically scheduled during your work hours (9 AM - 5 PM) 
            based on their priority and estimated time.
          </div>
        )}
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time Summary</span>
          </div>
          <div className="text-sm">
            <span>{hours}h {minutes}m</span>
            <span className="text-muted-foreground"> total planned</span>
          </div>
        </div>
      </Card>
      
      <div className="text-sm font-medium">Selected Tasks ({selectedTasks.length})</div>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {selectedTasks
            .sort((a, b) => {
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
            .map((task, index) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Badge variant="outline" className="text-xs">
                      {task.estimateMinutes}m
                    </Badge>
                  </div>
                </div>
              </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}