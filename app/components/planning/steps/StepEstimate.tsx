"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const presetTimes = [15, 30, 45, 60, 90, 120];

export function StepEstimate() {
  const {
    selectedCandidates,
    updateCandidateEstimate,
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
  
  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks selected. Please go back and select tasks to estimate.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Capacity indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Estimated Time</span>
          </div>
          <div className="text-sm">
            <span className={isOverCapacity() ? 'text-destructive font-bold' : ''}>
              {hours}h {minutes}m
            </span>
            <span className="text-muted-foreground"> / {capacityHours}h {capacityMinutes}m</span>
          </div>
        </div>
        {isOverCapacity() && (
          <div className="mt-2 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Over capacity by {Math.abs(availableMinutes - totalMinutes)} minutes
          </div>
        )}
      </Card>
      
      {/* Tasks list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {selectedTasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`estimate-${task.id}`} className="text-xs">
                    Estimated time (minutes)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`estimate-${task.id}`}
                      type="number"
                      min="5"
                      max="480"
                      step="5"
                      value={task.estimateMinutes}
                      onChange={(e) => updateCandidateEstimate(task.id, parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <div className="flex gap-1">
                      {presetTimes.map((time) => (
                        <Button
                          key={time}
                          variant="outline"
                          size="sm"
                          onClick={() => updateCandidateEstimate(task.id, time)}
                          className="text-xs"
                        >
                          {time}m
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.floor(task.estimateMinutes / 60)}h {task.estimateMinutes % 60}m
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {task.source}
                  </Badge>
                  {task.priority && (
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
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}