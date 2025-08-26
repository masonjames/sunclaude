"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlanningStore } from '@/hooks/use-planning';
import { StepPickCandidates } from './steps/StepPickCandidates';
import { StepEstimate } from './steps/StepEstimate';
import { StepPrioritize } from './steps/StepPrioritize';
import { StepSchedule } from './steps/StepSchedule';
import { StepSummary } from './steps/StepSummary';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface PlanningWizardProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  onPlanCommitted: () => void;
}

const steps = [
  { id: 'pick', label: 'Select Tasks', component: StepPickCandidates },
  { id: 'estimate', label: 'Estimate Time', component: StepEstimate },
  { id: 'prioritize', label: 'Set Priorities', component: StepPrioritize },
  { id: 'schedule', label: 'Schedule', component: StepSchedule },
  { id: 'summary', label: 'Review', component: StepSummary },
] as const;

export function PlanningWizard({
  open,
  onClose,
  selectedDate,
  onPlanCommitted,
}: PlanningWizardProps) {
  const {
    currentStep,
    setStep,
    setDate,
    setCandidates,
    setCapacity,
    selectedCandidates,
    autoSchedule,
    reset,
  } = usePlanningStore();
  
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const CurrentStepComponent = steps[currentStepIndex].component;
  
  // Initialize wizard data
  useEffect(() => {
    if (open) {
      setDate(format(selectedDate, 'yyyy-MM-dd'));
      fetchPlanningData();
    } else {
      reset();
    }
  }, [open, selectedDate]);
  
  async function fetchPlanningData() {
    setLoading(true);
    try {
      // Fetch capacity
      const capacityRes = await fetch(`/api/planning/capacity?date=${format(selectedDate, 'yyyy-MM-dd')}`);
      if (capacityRes.ok) {
        const capacity = await capacityRes.json();
        setCapacity(capacity);
      }
      
      // Fetch candidates
      const candidatesRes = await fetch(`/api/planning/suggestions?date=${format(selectedDate, 'yyyy-MM-dd')}`);
      if (candidatesRes.ok) {
        const candidates = await candidatesRes.json();
        setCandidates(candidates);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
      toast({
        title: "Error",
        description: "Failed to load planning data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function commitPlan() {
    setCommitting(true);
    try {
      const selections = selectedCandidates
        .filter(c => c.selected)
        .map(c => ({
          source: c.source,
          sourceId: c.sourceId,
          taskId: c.existingTaskId,
          title: c.title,
          description: c.description,
          estimateMinutes: c.estimateMinutes,
          priority: c.priority,
        }));
      
      const response = await fetch('/api/planning/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          selections,
          autoSchedule,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Plan Committed",
          description: `Successfully planned ${selections.length} tasks`,
        });
        onPlanCommitted();
        onClose();
      } else {
        throw new Error('Failed to commit plan');
      }
    } catch (error) {
      console.error('Error committing plan:', error);
      toast({
        title: "Error",
        description: "Failed to commit plan",
        variant: "destructive",
      });
    } finally {
      setCommitting(false);
    }
  }
  
  function handleNext() {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1].id);
    } else {
      commitPlan();
    }
  }
  
  function handleBack() {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1].id);
    }
  }
  
  const selectedCount = selectedCandidates.filter(c => c.selected).length;
  const canProceed = selectedCount > 0 || currentStepIndex >= 1;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Daily Planning for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center flex-1"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${index <= currentStepIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm font-medium
                  ${index === currentStepIndex 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                  }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4
                    ${index < currentStepIndex 
                      ? 'bg-primary' 
                      : 'bg-muted'
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Step content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading planning data...</div>
            </div>
          ) : (
            <CurrentStepComponent />
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || loading || committing}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && `${selectedCount} tasks selected`}
          </div>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed || loading || committing}
          >
            {currentStepIndex === steps.length - 1 ? (
              committing ? 'Committing...' : 'Commit Plan'
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}