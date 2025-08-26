"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export function StepSummary() {
  const {
    selectedCandidates,
    autoSchedule,
    getTotalPlannedMinutes,
    availableMinutes,
    isOverCapacity,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  const totalMinutes = getTotalPlannedMinutes();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const capacityHours = Math.floor(availableMinutes / 60);
  const capacityMinutes = availableMinutes % 60;
  
  const priorityCounts = selectedTasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks selected. Please go back and select tasks to review.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-sm font-medium">{selectedTasks.length} Tasks Selected</div>
              <div className="text-xs text-muted-foreground">Ready to plan</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isOverCapacity() ? 'text-destructive' : 'text-blue-600'}`} />
            <div>
              <div className="text-sm font-medium">
                {hours}h {minutes}m Total
              </div>
              <div className="text-xs text-muted-foreground">
                {isOverCapacity() ? (
                  <span className="text-destructive">Over capacity</span>
                ) : (
                  `${Math.floor((availableMinutes - totalMinutes) / 60)}h ${(availableMinutes - totalMinutes) % 60}m remaining`
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Capacity warning */}
      {isOverCapacity() && (
        <Card className="p-4 border-destructive bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <div className="text-sm font-medium text-destructive">Over Capacity</div>
              <div className="text-xs text-muted-foreground">
                Your planned tasks exceed daily capacity by {Math.abs(availableMinutes - totalMinutes)} minutes.
                Consider removing some tasks or increasing estimates.
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Schedule settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Schedule Settings</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {autoSchedule ? (
            <>Tasks will be auto-scheduled during work hours based on priority</>
          ) : (
            <>Tasks will be added to your backlog without specific time slots</>
          )}
        </div>
      </Card>
      
      {/* Priority breakdown */}
      {Object.keys(priorityCounts).length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-3">Priority Breakdown</div>
          <div className="flex gap-2">
            {Object.entries(priorityCounts).map(([priority, count]) => (
              <Badge
                key={priority}
                variant={
                  priority === 'high' ? 'destructive' :
                  priority === 'medium' ? 'default' :
                  'secondary'
                }
                className="text-xs"
              >
                {priority}: {count}
              </Badge>
            ))}
          </div>
        </Card>
      )}
      
      {/* Tasks list */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-3">Selected Tasks</div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {selectedTasks
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              })
              .map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </div>
                    )}
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
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}