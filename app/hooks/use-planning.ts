import { create } from 'zustand';

export interface PlanningCandidate {
  id: string;
  source: 'backlog' | 'gmail' | 'github' | 'notion' | 'asana' | 'linear';
  sourceId: string;
  existingTaskId?: string;
  title: string;
  description?: string;
  estimateMinutes: number;
  priority: 'low' | 'medium' | 'high';
  selected: boolean;
}

export interface CapacityInfo {
  totalMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
}

interface PlanningState {
  // Current wizard state
  currentStep: 'pick' | 'estimate' | 'prioritize' | 'schedule' | 'summary';
  date: string;
  
  // Data
  candidates: PlanningCandidate[];
  selectedCandidates: PlanningCandidate[];
  capacity: CapacityInfo | null;
  
  // Settings
  autoSchedule: boolean;
  
  // Computed
  availableMinutes: number;
  
  // Actions
  setStep: (step: PlanningState['currentStep']) => void;
  setDate: (date: string) => void;
  setCandidates: (candidates: PlanningCandidate[]) => void;
  setCapacity: (capacity: CapacityInfo) => void;
  toggleCandidate: (candidateId: string) => void;
  updateCandidateEstimate: (candidateId: string, minutes: number) => void;
  updateCandidatePriority: (candidateId: string, priority: 'low' | 'medium' | 'high') => void;
  setAutoSchedule: (enabled: boolean) => void;
  getTotalPlannedMinutes: () => number;
  isOverCapacity: () => boolean;
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  // Initial state
  currentStep: 'pick',
  date: '',
  candidates: [],
  selectedCandidates: [],
  capacity: null,
  autoSchedule: false,
  availableMinutes: 0,

  // Actions
  setStep: (step) => set({ currentStep: step }),
  
  setDate: (date) => set({ date }),
  
  setCandidates: (candidates) => {
    const selectedCandidates = candidates.filter(c => c.selected);
    set({ candidates, selectedCandidates });
  },
  
  setCapacity: (capacity) => set({ 
    capacity, 
    availableMinutes: capacity.availableMinutes 
  }),
  
  toggleCandidate: (candidateId) => {
    const { candidates } = get();
    const updatedCandidates = candidates.map(c => 
      c.id === candidateId ? { ...c, selected: !c.selected } : c
    );
    const selectedCandidates = updatedCandidates.filter(c => c.selected);
    set({ 
      candidates: updatedCandidates, 
      selectedCandidates 
    });
  },
  
  updateCandidateEstimate: (candidateId, minutes) => {
    const { candidates } = get();
    const updatedCandidates = candidates.map(c =>
      c.id === candidateId ? { ...c, estimateMinutes: minutes } : c
    );
    const selectedCandidates = updatedCandidates.filter(c => c.selected);
    set({ 
      candidates: updatedCandidates, 
      selectedCandidates 
    });
  },
  
  updateCandidatePriority: (candidateId, priority) => {
    const { candidates } = get();
    const updatedCandidates = candidates.map(c =>
      c.id === candidateId ? { ...c, priority } : c
    );
    const selectedCandidates = updatedCandidates.filter(c => c.selected);
    set({ 
      candidates: updatedCandidates, 
      selectedCandidates 
    });
  },
  
  setAutoSchedule: (enabled) => set({ autoSchedule: enabled }),
  
  getTotalPlannedMinutes: () => {
    const { selectedCandidates } = get();
    return selectedCandidates.reduce((sum, c) => sum + c.estimateMinutes, 0);
  },
  
  isOverCapacity: () => {
    const { capacity } = get();
    if (!capacity) return false;
    return get().getTotalPlannedMinutes() > capacity.availableMinutes;
  },
  
  reset: () => set({
    currentStep: 'pick',
    date: '',
    candidates: [],
    selectedCandidates: [],
    capacity: null,
    autoSchedule: false,
    availableMinutes: 0,
  }),
}));