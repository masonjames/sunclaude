"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function StepPrioritize() {
  const {
    selectedCandidates,
    updateCandidatePriority,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  
  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks selected. Please go back and select tasks to prioritize.
      </div>
    );
  }
  
  const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Set priorities for your selected tasks to help with scheduling and focus.
      </div>
      
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
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {task.source}
                    </Badge>
                    {task.estimateMinutes && (
                      <Badge variant="outline" className="text-xs">
                        {task.estimateMinutes}m
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {priorities.map((priority) => (
                      <Button
                        key={priority}
                        variant={task.priority === priority ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateCandidatePriority(task.id, priority)}
                        className={`text-xs ${
                          priority === 'high' ? 'data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground' :
                          priority === 'medium' ? 'data-[state=active]:bg-orange-500 data-[state=active]:text-white' :
                          'data-[state=active]:bg-secondary'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}