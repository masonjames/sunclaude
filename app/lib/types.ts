// Type definitions matching the Prisma schema

// Task Status enum (matches Prisma schema)
export type TaskStatus = 
  | 'BACKLOG'
  | 'PLANNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'DEFERRED'
  | 'CANCELED';

// Task Priority enum (matches Prisma schema)
export type TaskPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

// Integration provider types
export type IntegrationProvider = 
  | 'google_calendar'
  | 'gmail'
  | 'github'
  | 'notion'
  | 'slack';

// Sync direction for external items
export type SyncDirection = 
  | 'import'
  | 'export'
  | 'two-way';

// User interface
export interface User {
  id: string;
  email: string;
  name?: string | null;
  tasks?: Task[];
  timeEntries?: TimeEntry[];
  dailyPlans?: DailyPlan[];
  externalItems?: ExternalItem[];
  calendarEvents?: CalendarEvent[];
  googleSyncState?: GoogleSyncState[];
  settings?: UserSettings | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task interface with full Sunsama-like features
export interface Task {
  id: string;
  userId: string;
  user?: User;
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  status: TaskStatus;
  plannedDate?: Date | null;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimateMinutes?: number | null;
  actualMinutes?: number | null;
  order: number;
  parentId?: string | null;
  parent?: Task | null;
  subtasks?: Task[];
  externalLinks?: ExternalItem[];
  calendarEvent?: CalendarEvent | null;
  timeEntries?: TimeEntry[];
  rolloverCount: number;
  rolledOverFromId?: string | null;
  deferredTo?: Date | null;
  deferralReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Time tracking entry
export interface TimeEntry {
  id: string;
  userId: string;
  user?: User;
  taskId: string;
  task?: Task;
  startedAt: Date;
  endedAt?: Date | null;
  durationMinutes?: number | null;
  createdAt: Date;
}

// Daily planning and capacity tracking
export interface DailyPlan {
  id: string;
  userId: string;
  user?: User;
  date: Date;
  capacityMinutes: number;
  plannedMinutes: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
}

// External integration item
export interface ExternalItem {
  id: string;
  userId: string;
  user?: User;
  provider: IntegrationProvider;
  externalId: string;
  externalUrl?: string | null;
  direction: SyncDirection;
  data?: any;
  lastSyncedAt?: Date | null;
  taskId?: string | null;
  task?: Task | null;
  createdAt: Date;
}

// Calendar event synchronization
export interface CalendarEvent {
  id: string;
  userId: string;
  user?: User;
  taskId: string;
  task?: Task;
  provider: string;
  calendarId: string;
  eventId: string;
  iCalUID?: string | null;
  start: Date;
  end: Date;
  etag?: string | null;
  sequence?: number | null;
  lastSyncedAt?: Date | null;
  createdAt: Date;
}

// Google Calendar sync state
export interface GoogleSyncState {
  id: string;
  userId: string;
  user?: User;
  resourceId: string;
  channelId: string;
  calendarId: string;
  expiration: Date;
  syncToken?: string | null;
  createdAt: Date;
}

// User settings and preferences
export interface UserSettings {
  userId: string;
  user?: User;
  timezone: string;
  workdayStart: number;
  workdayEnd: number;
  weekStart: number;
  defaultDailyCapacityMinutes: number;
  dailyShutdownHour: number;
  autoSyncCalendar: boolean;
  autoCreateCalendarEvents: boolean;
}

// Create/Update DTOs (without relations and auto-generated fields)
export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  plannedDate?: Date | string;
  dueDate?: Date | string;
  scheduledStart?: Date | string;
  scheduledEnd?: Date | string;
  estimateMinutes?: number;
  order?: number;
  parentId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus;
  plannedDate?: Date | string | null;
  dueDate?: Date | string | null;
  scheduledStart?: Date | string | null;
  scheduledEnd?: Date | string | null;
  estimateMinutes?: number | null;
  actualMinutes?: number | null;
  order?: number;
  parentId?: string | null;
  rolloverCount?: number;
  rolledOverFromId?: string | null;
  deferredTo?: Date | string | null;
  deferralReason?: string | null;
}

export interface CreateTimeEntryDto {
  taskId: string;
  startedAt?: Date | string;
}

export interface UpdateTimeEntryDto {
  endedAt?: Date | string;
  durationMinutes?: number;
}

export interface CreateDailyPlanDto {
  date: Date | string;
  capacityMinutes?: number;
  notes?: string;
}

export interface UpdateDailyPlanDto {
  capacityMinutes?: number;
  plannedMinutes?: number;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  notes?: string | null;
}

export interface CreateExternalItemDto {
  provider: IntegrationProvider;
  externalId: string;
  externalUrl?: string;
  direction: SyncDirection;
  data?: any;
  taskId?: string;
}

export interface UpdateExternalItemDto {
  externalUrl?: string;
  direction?: SyncDirection;
  data?: any;
  lastSyncedAt?: Date | string;
  taskId?: string | null;
}

// Helper types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Date helper type for frontend (string representation)
export type DateString = string; // ISO 8601 format

// Task with string dates for frontend usage
export interface TaskDto extends Omit<Task, 'plannedDate' | 'dueDate' | 'scheduledStart' | 'scheduledEnd' | 'deferredTo' | 'createdAt' | 'updatedAt'> {
  plannedDate?: DateString | null;
  dueDate?: DateString | null;
  scheduledStart?: DateString | null;
  scheduledEnd?: DateString | null;
  deferredTo?: DateString | null;
  createdAt: DateString;
  updatedAt: DateString;
}