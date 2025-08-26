import { PrismaClient, Task, DailyPlan, UserSettings } from '@prisma/client';
import { startOfDay, endOfDay, addHours, parseISO, format } from 'date-fns';

const prisma = new PrismaClient();

export type CandidateSource = 'backlog' | 'gmail' | 'github' | 'notion' | 'asana' | 'linear';

export type PlanningCandidate = {
  source: CandidateSource;
  sourceId: string;
  title: string;
  description?: string;
  estimateMinutes?: number;
  priority?: 'low' | 'medium' | 'high';
  suggestedDate?: string;
  existingTaskId?: string;
};

export type TimeSlot = {
  start: Date;
  end: Date;
  available: boolean;
  taskId?: string;
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        defaultDailyCapacityMinutes: 480,
        timezone: 'UTC',
        workingHours: '09:00-17:00',
      },
    });
  }

  return settings;
}

export async function computeCapacity(
  userId: string,
  date: Date
): Promise<{
  capacityMinutes: number;
  busyMinutes: number;
  availableMinutes: number;
}> {
  const settings = await getUserSettings(userId);
  
  // TODO: Integrate with calendar to get busy blocks
  const busyMinutes = 0; // Placeholder - will integrate with calendar
  
  const capacityMinutes = settings.defaultDailyCapacityMinutes;
  const availableMinutes = capacityMinutes - busyMinutes;
  
  return {
    capacityMinutes,
    busyMinutes,
    availableMinutes,
  };
}

export async function suggestCandidates(
  userId: string,
  date: Date
): Promise<PlanningCandidate[]> {
  const candidates: PlanningCandidate[] = [];
  
  // Fetch backlog tasks
  const backlogTasks = await prisma.task.findMany({
    where: {
      status: 'BACKLOG',
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });
  
  // Convert backlog tasks to candidates
  backlogTasks.forEach(task => {
    candidates.push({
      source: 'backlog',
      sourceId: task.id,
      title: task.title,
      description: task.description || undefined,
      estimateMinutes: task.estimateMinutes || undefined,
      priority: (task.priority as 'low' | 'medium' | 'high') || undefined,
      existingTaskId: task.id,
    });
  });
  
  // TODO: Fetch from Gmail (flagged emails)
  // TODO: Fetch from GitHub (recent issues)
  // TODO: Fetch from Notion (todo database rows)
  // TODO: Fetch from Asana
  // TODO: Fetch from Linear
  
  return candidates;
}

export async function allocateTimes(
  userId: string,
  date: Date,
  tasks: { id: string; estimateMinutes: number; priority?: string }[]
): Promise<{ id: string; scheduledStart: Date; scheduledEnd: Date }[]> {
  const settings = await getUserSettings(userId);
  const [startHour, endHour] = settings.workingHours.split('-').map(time => 
    parseInt(time.split(':')[0])
  );
  
  const dayStart = addHours(startOfDay(date), startHour);
  const dayEnd = addHours(startOfDay(date), endHour);
  
  // Get existing scheduled tasks for this day
  const existingTasks = await prisma.task.findMany({
    where: {
      plannedDate: {
        gte: startOfDay(date),
        lt: endOfDay(date),
      },
      scheduledStart: { not: null },
      scheduledEnd: { not: null },
    },
    orderBy: { scheduledStart: 'asc' },
  });
  
  // Build time slots
  const timeSlots: TimeSlot[] = [];
  let currentTime = dayStart;
  
  existingTasks.forEach(task => {
    if (task.scheduledStart && task.scheduledEnd) {
      // Add available slot before this task
      if (currentTime < task.scheduledStart) {
        timeSlots.push({
          start: currentTime,
          end: task.scheduledStart,
          available: true,
        });
      }
      
      // Add busy slot for this task
      timeSlots.push({
        start: task.scheduledStart,
        end: task.scheduledEnd,
        available: false,
        taskId: task.id,
      });
      
      currentTime = task.scheduledEnd;
    }
  });
  
  // Add final available slot if there's time left
  if (currentTime < dayEnd) {
    timeSlots.push({
      start: currentTime,
      end: dayEnd,
      available: true,
    });
  }
  
  // Sort tasks by priority (high to low)
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return bPriority - aPriority;
  });
  
  // Allocate tasks to available slots
  const allocations: { id: string; scheduledStart: Date; scheduledEnd: Date }[] = [];
  
  for (const task of sortedTasks) {
    let remainingMinutes = task.estimateMinutes;
    
    for (const slot of timeSlots) {
      if (!slot.available || remainingMinutes <= 0) continue;
      
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
      
      if (slotDuration >= remainingMinutes) {
        // Task fits entirely in this slot
        const taskStart = slot.start;
        const taskEnd = new Date(taskStart.getTime() + remainingMinutes * 60 * 1000);
        
        allocations.push({
          id: task.id,
          scheduledStart: taskStart,
          scheduledEnd: taskEnd,
        });
        
        // Update slot to reflect the allocation
        slot.start = taskEnd;
        if (slot.start >= slot.end) {
          slot.available = false;
        }
        
        remainingMinutes = 0;
        break;
      }
    }
  }
  
  return allocations;
}

export async function createOrUpdateDailyPlan(
  userId: string,
  date: Date
): Promise<DailyPlan> {
  const startDate = startOfDay(date);
  
  let dailyPlan = await prisma.dailyPlan.findUnique({
    where: { date: startDate },
  });
  
  if (!dailyPlan) {
    const capacity = await computeCapacity(userId, date);
    dailyPlan = await prisma.dailyPlan.create({
      data: {
        userId,
        date: startDate,
        capacityMinutes: capacity.capacityMinutes,
        plannedMinutes: 0,
        actualMinutes: 0,
      },
    });
  }
  
  return dailyPlan;
}

export async function rolloverTask(
  taskId: string,
  newDate?: Date
): Promise<Task> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  const targetDate = newDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day
  
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      plannedDate: targetDate,
      rolloverCount: task.rolloverCount + 1,
      rolledOverFromId: task.rolledOverFromId || taskId,
      status: 'PLANNED',
    },
  });
  
  return updatedTask;
}

export async function deferTask(
  taskId: string,
  deferredTo: Date,
  reason?: string
): Promise<Task> {
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'DEFERRED',
      deferredTo,
      deferReason: reason,
      plannedDate: null,
      scheduledStart: null,
      scheduledEnd: null,
    },
  });
  
  return updatedTask;
}

export async function commitPlan(
  userId: string,
  date: Date,
  selections: {
    source: CandidateSource;
    sourceId?: string;
    taskId?: string;
    title?: string;
    description?: string;
    estimateMinutes: number;
    priority: 'low' | 'medium' | 'high';
  }[],
  autoSchedule: boolean = false
): Promise<{
  planId: string;
  plannedTasks: Task[];
}> {
  const dailyPlan = await createOrUpdateDailyPlan(userId, date);
  const plannedTasks: Task[] = [];
  const tasksToSchedule: { id: string; estimateMinutes: number; priority: string }[] = [];
  
  for (const selection of selections) {
    let task: Task;
    
    if (selection.taskId) {
      // Update existing task
      task = await prisma.task.update({
        where: { id: selection.taskId },
        data: {
          plannedDate: startOfDay(date),
          estimateMinutes: selection.estimateMinutes,
          priority: selection.priority,
          status: 'PLANNED',
          dailyPlanId: dailyPlan.id,
        },
      });
    } else {
      // Create new task
      task = await prisma.task.create({
        data: {
          title: selection.title || 'Untitled Task',
          description: selection.description,
          plannedDate: startOfDay(date),
          date: format(date, 'yyyy-MM-dd'),
          estimateMinutes: selection.estimateMinutes,
          priority: selection.priority,
          status: 'PLANNED',
          source: selection.source,
          sourceId: selection.sourceId,
          dailyPlanId: dailyPlan.id,
        },
      });
    }
    
    plannedTasks.push(task);
    
    if (autoSchedule) {
      tasksToSchedule.push({
        id: task.id,
        estimateMinutes: task.estimateMinutes || 30,
        priority: task.priority || 'medium',
      });
    }
  }
  
  // Auto-schedule if requested
  if (autoSchedule && tasksToSchedule.length > 0) {
    const allocations = await allocateTimes(userId, date, tasksToSchedule);
    
    for (const allocation of allocations) {
      const taskIndex = plannedTasks.findIndex(t => t.id === allocation.id);
      if (taskIndex !== -1) {
        const updatedTask = await prisma.task.update({
          where: { id: allocation.id },
          data: {
            scheduledStart: allocation.scheduledStart,
            scheduledEnd: allocation.scheduledEnd,
          },
        });
        plannedTasks[taskIndex] = updatedTask;
      }
    }
  }
  
  // Update daily plan totals
  const totalPlannedMinutes = plannedTasks.reduce(
    (sum, task) => sum + (task.estimateMinutes || 0),
    0
  );
  
  await prisma.dailyPlan.update({
    where: { id: dailyPlan.id },
    data: { plannedMinutes: totalPlannedMinutes },
  });
  
  return {
    planId: dailyPlan.id,
    plannedTasks,
  };
}