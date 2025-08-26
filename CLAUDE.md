# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - starts Next.js development server on localhost:3000
- **Build**: `npm run build` - creates production build
- **Production server**: `npm start` - serves production build
- **Lint**: `npm run lint` - runs ESLint with Next.js configuration
- **Database operations**:
  - Generate Prisma client: `npx prisma generate`
  - Database migration: `npx prisma db push`
  - Seed database: `npm run prisma:seed` or `npx prisma db seed`
  - View database: `npx prisma studio`

## Architecture Overview

This is a Next.js 15 task management application with third-party integrations, using the App Router architecture.

### Key Architecture Patterns

- **App Router Structure**: Uses Next.js App Router with layout.tsx for global providers
- **Server Components by Default**: Most components are server components unless client interactivity is needed
- **Database Layer**: Prisma ORM with SQLite database (dev.db) for task storage
- **API Routes**: RESTful endpoints in `app/api/` for external integrations and task operations
- **Component Architecture**: 
  - UI components in `app/components/ui/` (shadcn/ui based)
  - Feature components in `app/components/`
  - Integration-specific components in `app/components/integrations/`

### Core Application Structure

- **Main Layout**: Three-panel layout with collapsible sidebars (MainSidebar, TaskBoard, IntegrationsSidebar)
- **Task System**: Kanban-style board with drag-and-drop using @dnd-kit
- **Integration Services**: Modular services in `app/services/` for external APIs (Gmail, Asana, Linear, Notion, Calendar)
- **Theme System**: Dark/light mode support with next-themes and CSS custom properties

### Database Schema

Single `Task` model with:
- Basic task fields (title, description, priority, dueTime, date)
- Uses cuid() for IDs
- SQLite for simplicity in development

### Import Aliases

- `@/*` maps to `./app/*` for clean imports

### Key Dependencies

- **UI**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom animations and theming
- **Database**: Prisma with SQLite
- **Integrations**: Specific SDKs for each service (@linear/sdk, @notionhq/client, etc.)
- **Drag & Drop**: @dnd-kit for task reordering
- **Forms**: react-hook-form with zod validation

## Implementation Status

### ✅ Completed Features (P0 & P1)

#### P0: Core Kanban Functionality (Completed)
- **Drag & Drop System**: Full @dnd-kit implementation with useSortable hooks
  - TaskCard properly integrated with drag system (`app/components/TaskCard.tsx`)
  - TaskColumn with SortableContext per status lane (`app/components/TaskColumn.tsx`)
  - TaskBoard with sophisticated container resolution and drop handling (`app/components/TaskBoard.tsx`)
- **Task Persistence**: 
  - Added `sortOrder` field to Prisma schema for proper task ordering
  - Created `/api/tasks/reorder` endpoint for batch task updates with transactions
  - Fixed task status handling (PLANNED, SCHEDULED, IN_PROGRESS, DONE)
- **Date Navigation**: Fixed scroll positioning to center on current date
- **Dark Theme**: Enhanced color palette for proper contrast in dark mode
- **Task Visibility**: Resolved task display issues and status lane mapping

#### P1: Integration System (Completed)
- **TabbedIntegrationPanel**: Complete tabbed UI for integrations (`app/components/integrations/TabbedIntegrationPanel.tsx`)
  - Gmail, Calendar, GitHub, Asana tabs with individual loading states
  - Badge counters showing item counts per integration
  - Individual sync buttons with proper feedback
- **Drag-to-Import**: Seamless drag-and-drop from integration items to Kanban lanes
  - Integration items are draggable with proper data structure
  - TaskBoard handles integration drops and creates tasks with correct metadata
- **Enhanced Sync System**: 
  - Upgraded sync functions with proper error handling and user feedback
  - Success/error messages for each integration sync
  - Background sync triggers for Calendar integration
- **API Endpoints**: Created/fixed integration endpoints
  - `/api/integrations/gmail` - Returns mock Gmail data
  - `/api/integrations/google/calendar` - Returns mock Calendar events  
  - `/api/integrations/github` - Returns mock GitHub issues
  - `/api/integrations/asana` - Returns mock Asana tasks
  - Fixed response formats to return arrays instead of wrapped objects
- **Sync-Engine Integration**: Wired sync-engine to actual services (`app/services/sync-engine.ts`)
  - Connected Gmail, Asana, Notion, and Google Calendar real service functions
  - Added proper error handling and access token validation
  - Enhanced priority handling (Calendar > Asana > Others)
  - Added Asana support to sync job types

### 🔄 Current Status
- **Functional Kanban Board**: Full drag-and-drop with persistence
- **Working Integrations UI**: Tabbed interface with sync functionality
- **Mock Data Integration**: All integrations working with mock data
- **Real Service Framework**: Sync-engine ready for production tokens

### 📋 Remaining TODOs (P2 & P3)

#### P2: State Management & Performance
- [ ] **Centralized Task Store**: Implement Zustand for global task state
  - Replace prop drilling with centralized state management
  - Add optimistic updates for better UX
  - Implement proper state persistence
- [ ] **Loading & Error States**: Add skeleton loaders and better error handling
  - Skeleton components for task loading states
  - Toast notifications for operations
  - Retry mechanisms for failed operations
- [ ] **Real-time Sync**: WebSocket or polling for live updates
  - Sync state across multiple browser tabs
  - Live collaboration features

#### P3: Polish & Production Readiness
- [ ] **Calendar Integration Polish**: 
  - Event creation from tasks
  - Bi-directional sync with Google Calendar
  - Time-block scheduling features
- [ ] **GitHub Integration**: Replace mock data with real GitHub API
  - OAuth integration with GitHub
  - Real issue and PR synchronization
- [ ] **Authentication Enhancement**:
  - Complete OAuth flows for all integrations
  - Token refresh handling
  - Integration status indicators
- [ ] **Performance Optimization**:
  - Virtual scrolling for large task lists
  - Lazy loading for integration data
  - Bundle size optimization
- [ ] **Testing**: 
  - Unit tests for core components
  - Integration tests for API endpoints
  - E2E tests for critical user flows

### 🔧 Technical Debt
- [ ] Replace mock data flags with proper environment configuration
- [ ] Add proper TypeScript types for all integration responses
- [ ] Implement proper error boundaries for integration failures
- [ ] Add comprehensive logging for sync operations
- [ ] Set up proper database migrations for production

### 🚀 Future Enhancements
- [ ] Mobile responsiveness improvements
- [ ] Keyboard shortcuts for power users
- [ ] Advanced filtering and search
- [ ] Custom integration support
- [ ] Team collaboration features
- [ ] Analytics and productivity insights