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