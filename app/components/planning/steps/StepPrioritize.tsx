"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

const priorityIcons = {
  high: ArrowUp,
  medium: ArrowRight,
  low: ArrowDown,
};

const priorityColors = {
  high: 'text-destructive',
  medium: 'text-primary',
  low: 'text-muted-foreground',
};

export function StepPrioritize() {
  const {
    selectedCandidates,
    updateCandidatePriority,
  } = usePlanningStore();
  
  const selectedTasks = selectedCandidates.filter(c => c.selected);
  
  // Sort tasks by priority for display
  const sortedTasks = [...selectedTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks selected. Please go back and select tasks to prioritize.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Set priorities for your selected tasks. High priority tasks will be scheduled first.
      </div>
      
      <ScrollArea className="h-[450px]">
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const Icon = priorityIcons[task.priority];
            const colorClass = priorityColors[task.priority];
            
            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
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
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {Math.floor(task.estimateMinutes / 60)}h {task.estimateMinutes % 60}m
                        </div>
                      </div>
                      
                      <Select
                        value={task.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          updateCandidatePriority(task.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <ArrowUp className="h-4 w-4 text-destructive" />
                              High
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-primary" />
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <ArrowDown className="h-4 w-4 text-muted-foreground" />
                              Low
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Priority summary */}
      <Card className="p-3">
        <div className="flex items-center justify-around text-xs">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-destructive" />
            <span>High: {selectedTasks.filter(t => t.priority === 'high').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span>Medium: {selectedTasks.filter(t => t.priority === 'medium').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
            <span>Low: {selectedTasks.filter(t => t.priority === 'low').length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}