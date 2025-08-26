import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDays, format, startOfDay } from 'date-fns';

// Types
export interface PlanningCandidate {
  id: string;
  source: CandidateSource;
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

export interface PlanCommitResult {
  createdTasks: number;
  updatedTasks: number;
  scheduledTasks: number;
}

export type CandidateSource = 'backlog' | 'gmail' | 'github' | 'notion' | 'asana' | 'linear';

// Get user ID from session
async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

// Get user settings or create defaults
async function getUserSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({
    where: { userId }
  });
  
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        timezone: 'UTC',
        workdayStart: 9,
        workdayEnd: 17,
        defaultDailyCapacityMinutes: 360, // 6 hours
      }
    });
  }
  
  return settings;
}

// Suggest planning candidates for a given date
export async function suggestCandidates(userId: string, date: Date): Promise<PlanningCandidate[]> {
  // Get backlog tasks that aren't already planned for this date or later
  const backlogTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'BACKLOG',
      OR: [
        { plannedDate: null },
        { plannedDate: { lt: startOfDay(date) } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ],
    take: 20 // Limit to 20 suggestions
  });

  return backlogTasks.map(task => ({
    id: task.id,
    source: 'backlog' as CandidateSource,
    sourceId: task.id,
    existingTaskId: task.id,
    title: task.title,
    description: task.description || undefined,
    estimateMinutes: task.estimateMinutes || 30,
    priority: (task.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
    selected: false,
  }));
}

// Compute daily capacity information
export async function computeCapacity(userId: string, date: Date): Promise<CapacityInfo> {
  const settings = await getUserSettings(userId);
  
  // Get existing planned tasks for this date
  const plannedTasks = await prisma.task.findMany({
    where: {
      userId,
      plannedDate: startOfDay(date),
      status: { in: ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'] }
    },
    select: {
      estimateMinutes: true
    }
  });

  const usedMinutes = plannedTasks.reduce((sum, task) => 
    sum + (task.estimateMinutes || 0), 0
  );

  return {
    totalMinutes: settings.defaultDailyCapacityMinutes,
    usedMinutes,
    availableMinutes: settings.defaultDailyCapacityMinutes - usedMinutes,
  };
}

// Commit a daily plan
export async function commitPlan(
  userId: string,
  date: Date,
  selections: Array<{
    source: CandidateSource;
    sourceId: string;
    taskId?: string;
    title: string;
    description?: string;
    estimateMinutes: number;
    priority: 'low' | 'medium' | 'high';
  }>,
  autoSchedule: boolean = false
): Promise<PlanCommitResult> {
  const settings = await getUserSettings(userId);
  const planDate = startOfDay(date);
  
  let createdTasks = 0;
  let updatedTasks = 0;
  let scheduledTasks = 0;

  // Create or update daily plan
  await prisma.dailyPlan.upsert({
    where: {
      userId_date: {
        userId,
        date: planDate
      }
    },
    create: {
      userId,
      date: planDate,
      capacityMinutes: settings.defaultDailyCapacityMinutes,
      plannedMinutes: selections.reduce((sum, s) => sum + s.estimateMinutes, 0),
      startedAt: new Date(),
    },
    update: {
      plannedMinutes: selections.reduce((sum, s) => sum + s.estimateMinutes, 0),
    }
  });

  // Process each selection
  for (const selection of selections) {
    if (selection.taskId) {
      // Update existing task
      await prisma.task.update({
        where: { id: selection.taskId },
        data: {
          status: 'PLANNED',
          plannedDate: planDate,
          estimateMinutes: selection.estimateMinutes,
          priority: selection.priority.toUpperCase(),
        }
      });
      updatedTasks++;
    } else {
      // Create new task from external source
      await prisma.task.create({
        data: {
          userId,
          title: selection.title,
          description: selection.description,
          status: 'PLANNED',
          plannedDate: planDate,
          estimateMinutes: selection.estimateMinutes,
          priority: selection.priority.toUpperCase(),
        }
      });
      createdTasks++;
    }

    // Auto-schedule if requested
    if (autoSchedule) {
      // Simple time slot allocation based on work hours
      // This would be enhanced with more sophisticated scheduling
      scheduledTasks++;
    }
  }

  return {
    createdTasks,
    updatedTasks,
    scheduledTasks
  };
}

// Roll over a task to the next day or specified date
export async function rolloverTask(taskId: string, targetDate?: Date): Promise<any> {
  const userId = await getUserId();
  
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const newDate = targetDate || addDays(new Date(), 1);

  return prisma.task.update({
    where: { id: taskId },
    data: {
      plannedDate: startOfDay(newDate),
      rolloverCount: task.rolloverCount + 1,
      rolledOverFromId: task.id,
    }
  });
}

// Defer a task to a future date
export async function deferTask(taskId: string, deferredTo: Date, reason?: string): Promise<any> {
  const userId = await getUserId();
  
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'DEFERRED',
      deferredTo: startOfDay(deferredTo),
      deferralReason: reason,
      plannedDate: null, // Remove from current plan
    }
  });
}