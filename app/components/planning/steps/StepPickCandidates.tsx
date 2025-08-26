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
    selectedCandidates,
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
  
  return (
    <div className="space-y-4">
      {/* Capacity indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Capacity</span>
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
        <div className="space-y-2">
          {selectedCandidates.map((candidate) => {
            const Icon = sourceIcons[candidate.source];
            const colorClass = sourceColors[candidate.source];
            
            return (
              <Card
                key={candidate.id}
                className={`p-3 cursor-pointer transition-colors ${
                  candidate.selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleCandidate(candidate.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={candidate.selected}
                    onCheckedChange={() => toggleCandidate(candidate.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight">
                          {candidate.title}
                        </h4>
                        {candidate.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {candidate.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={colorClass}>
                          <Icon className="h-3 w-3 mr-1" />
                          {candidate.source}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {candidate.estimateMinutes} min
                      </div>
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
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      
      {selectedCandidates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No candidates available for planning
        </div>
      )}
    </div>
  );
}