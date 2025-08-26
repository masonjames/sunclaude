import { create } from 'zustand';
import { PlanningCandidate } from '@/services/planning';

export type WizardStep = 'pick' | 'estimate' | 'prioritize' | 'schedule' | 'summary';

export type SelectedCandidate = PlanningCandidate & {
  id: string;
  selected: boolean;
  estimateMinutes: number;
  priority: 'low' | 'medium' | 'high';
};

interface PlanningState {
  // Current wizard state
  currentStep: WizardStep;
  selectedDate: string;
  
  // Capacity information
  capacityMinutes: number;
  busyMinutes: number;
  availableMinutes: number;
  
  // Candidates and selections
  candidates: PlanningCandidate[];
  selectedCandidates: SelectedCandidate[];
  
  // Scheduling
  autoSchedule: boolean;
  
  // Actions
  setStep: (step: WizardStep) => void;
  setDate: (date: string) => void;
  setCapacity: (capacity: { capacityMinutes: number; busyMinutes: number; availableMinutes: number }) => void;
  setCandidates: (candidates: PlanningCandidate[]) => void;
  toggleCandidate: (candidateId: string) => void;
  updateCandidateEstimate: (candidateId: string, minutes: number) => void;
  updateCandidatePriority: (candidateId: string, priority: 'low' | 'medium' | 'high') => void;
  setAutoSchedule: (autoSchedule: boolean) => void;
  reset: () => void;
  
  // Computed
  getTotalPlannedMinutes: () => number;
  getRemainingCapacity: () => number;
  isOverCapacity: () => boolean;
}

const initialState = {
  currentStep: 'pick' as WizardStep,
  selectedDate: new Date().toISOString().split('T')[0],
  capacityMinutes: 480,
  busyMinutes: 0,
  availableMinutes: 480,
  candidates: [],
  selectedCandidates: [],
  autoSchedule: true,
};

export const usePlanningStore = create<PlanningState>((set, get) => ({
  ...initialState,
  
  setStep: (step) => set({ currentStep: step }),
  
  setDate: (date) => set({ selectedDate: date }),
  
  setCapacity: (capacity) => set({
    capacityMinutes: capacity.capacityMinutes,
    busyMinutes: capacity.busyMinutes,
    availableMinutes: capacity.availableMinutes,
  }),
  
  setCandidates: (candidates) => {
    const selectedCandidates = candidates.map((candidate, index) => ({
      ...candidate,
      id: `${candidate.source}-${candidate.sourceId || index}`,
      selected: false,
      estimateMinutes: candidate.estimateMinutes || 30,
      priority: candidate.priority || 'medium' as 'low' | 'medium' | 'high',
    }));
    set({ candidates, selectedCandidates });
  },
  
  toggleCandidate: (candidateId) => {
    const { selectedCandidates } = get();
    const updated = selectedCandidates.map(c =>
      c.id === candidateId ? { ...c, selected: !c.selected } : c
    );
    set({ selectedCandidates: updated });
  },
  
  updateCandidateEstimate: (candidateId, minutes) => {
    const { selectedCandidates } = get();
    const updated = selectedCandidates.map(c =>
      c.id === candidateId ? { ...c, estimateMinutes: minutes } : c
    );
    set({ selectedCandidates: updated });
  },
  
  updateCandidatePriority: (candidateId, priority) => {
    const { selectedCandidates } = get();
    const updated = selectedCandidates.map(c =>
      c.id === candidateId ? { ...c, priority } : c
    );
    set({ selectedCandidates: updated });
  },
  
  setAutoSchedule: (autoSchedule) => set({ autoSchedule }),
  
  reset: () => set(initialState),
  
  getTotalPlannedMinutes: () => {
    const { selectedCandidates } = get();
    return selectedCandidates
      .filter(c => c.selected)
      .reduce((sum, c) => sum + c.estimateMinutes, 0);
  },
  
  getRemainingCapacity: () => {
    const { availableMinutes } = get();
    const totalPlanned = get().getTotalPlannedMinutes();
    return availableMinutes - totalPlanned;
  },
  
  isOverCapacity: () => {
    return get().getRemainingCapacity() < 0;
  },
}))