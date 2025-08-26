"use client";

import { usePlanningStore } from '@/hooks/use-planning';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertCircle, CheckCircle2, Circle, Flag } from 'lucide-react';

const sourceIcons = {
  backlog: Circle,
  gmail: CheckCircle2,
  github: AlertCircle,
  notion: Flag,
  asana: CheckCircle2,
  linear: AlertCircle,
};

const sourceColors = {
  backlog: 'bg-gray-100 text-gray-800',
  gmail: 'bg-red-100 text-red-800',
  github: 'bg-purple-100 text-purple-800',
  notion: 'bg-gray-100 text-gray-800',
  asana: 'bg-orange-100 text-orange-800',
  linear: 'bg-blue-100 text-blue-800',
};

export function StepPickCandidates() {
  const {
    candidates,
    toggleCandidate,
    getTotalPlannedMinutes,
    availableMinutes,
    isOverCapacity,
  } = usePlanningStore();
  
  const totalMinutes = getTotalPlannedMinutes();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const capacityHours = Math.floor(availableMinutes / 60);
  const capacityMinutes = availableMinutes % 60;
  
  if (candidates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No planning candidates available for this date.
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
            <span className="text-sm font-medium">Selected Time</span>
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
      
      {/* Candidates list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {candidates.map((candidate) => {
            const Icon = sourceIcons[candidate.source] || Circle;
            return (
              <Card 
                key={candidate.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                  candidate.selected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => toggleCandidate(candidate.id)}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={candidate.selected}
                    onCheckedChange={() => toggleCandidate(candidate.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{candidate.title}</h4>
                        {candidate.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {candidate.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${sourceColors[candidate.source]}`}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {candidate.source}
                      </Badge>
                      
                      {candidate.priority && (
                        <Badge
                          variant={
                            candidate.priority === 'high' ? 'destructive' :
                            candidate.priority === 'medium' ? 'default' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {candidate.priority}
                        </Badge>
                      )}
                      
                      {candidate.estimateMinutes && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {candidate.estimateMinutes}m
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}