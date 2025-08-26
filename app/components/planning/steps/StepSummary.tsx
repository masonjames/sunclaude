"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Target,
  Timer
} from 'lucide-react';

export function StepSummary() {
  const {
    selectedCandidates,
    selectedDate,
    autoSchedule,
    availableMinutes,
    getTotalPlannedMinutes,
    isOverCapacity,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  const totalMinutes = getTotalPlannedMinutes();
  
  const highPriorityTasks = selectedTasks.filter(t => t.priority === 'high');
  const mediumPriorityTasks = selectedTasks.filter(t => t.priority === 'medium');
  const lowPriorityTasks = selectedTasks.filter(t => t.priority === 'low');
  
  const tasksBySource = selectedTasks.reduce((acc, task) => {
    acc[task.source] = (acc[task.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Planning Summary</h3>
        <p className="text-sm text-muted-foreground">
          Ready to commit your daily plan for {selectedDate}
        </p>
      </div>
      
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{selectedTasks.length}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className={`text-2xl font-bold ${isOverCapacity() ? 'text-destructive' : 'text-green-600'}`}>
                {isOverCapacity() ? '-' : '+'}{Math.abs(availableMinutes - totalMinutes)}m
              </div>
              <div className="text-xs text-muted-foreground">
                {isOverCapacity() ? 'Over' : 'Under'} Capacity
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                {autoSchedule ? 'Auto' : 'Manual'}
              </div>
              <div className="text-xs text-muted-foreground">Scheduling</div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Priority breakdown */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Priority Breakdown</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-destructive" />
              <span className="text-sm">High Priority</span>
            </div>
            <div className="text-sm font-medium">{highPriorityTasks.length} tasks</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="text-sm font-medium">{mediumPriorityTasks.length} tasks</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Low Priority</span>
            </div>
            <div className="text-sm font-medium">{lowPriorityTasks.length} tasks</div>
          </div>
        </div>
      </Card>
      
      {/* Source breakdown */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Task Sources</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tasksBySource).map(([source, count]) => (
            <Badge key={source} variant="secondary">
              {source}: {count}
            </Badge>
          ))}
        </div>
      </Card>
      
      {/* Tasks list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Selected Tasks</h4>
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {selectedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="flex-1 truncate">{task.title}</span>
                <Badge
                  variant={
                    task.priority === 'high' ? 'destructive' :
                    task.priority === 'medium' ? 'default' :
                    'secondary'
                  }
                  className="text-xs h-4"
                >
                  {task.priority}
                </Badge>
                <span className="text-muted-foreground">
                  {task.estimateMinutes}m
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {isOverCapacity() && (
        <Card className="p-3 border-destructive bg-destructive/5">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Warning:</span>
            <span>Your plan exceeds available capacity by {totalMinutes - availableMinutes} minutes</span>
          </div>
        </Card>
      )}
    </div>
  );
}