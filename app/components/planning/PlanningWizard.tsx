"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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
        
        {/* Enhanced Progress indicator */}
        <div className="mb-6 space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {currentStepIndex + 1} of {steps.length}</span>
              <span className="text-muted-foreground">{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete</span>
            </div>
            <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-2" />
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center flex-1"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium border-2 transition-all duration-200
                      ${index < currentStepIndex 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : index === currentStepIndex
                        ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-background border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40'
                      }`}
                  >
                    {index < currentStepIndex ? '✓' : index + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center max-w-[80px] leading-tight
                      ${index === currentStepIndex 
                        ? 'text-foreground' 
                        : index < currentStepIndex
                        ? 'text-primary'
                        : 'text-muted-foreground'
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-20px] transition-all duration-200
                      ${index < currentStepIndex 
                        ? 'bg-primary' 
                        : 'bg-muted'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
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
        
        {/* Enhanced Navigation */}
        <div className="flex items-center justify-between pt-6 border-t bg-muted/20 -mx-6 px-6 -mb-6 pb-6 mt-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || loading || committing}
              className="transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                {selectedCount} task{selectedCount === 1 ? '' : 's'} selected
              </div>
            )}
          </div>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed || loading || committing}
            className={`transition-all duration-200 min-w-[120px] ${
              currentStepIndex === steps.length - 1 
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                : ''
            }`}
          >
            {currentStepIndex === steps.length - 1 ? (
              committing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Committing...
                </>
              ) : (
                'Commit Plan'
              )
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