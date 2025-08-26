# Sunclaude

A modern task management application built with Next.js, featuring focus modes and seamless third-party integrations.

## Features

### ✅ Production Ready
- **Kanban Board**: Full drag-and-drop task management with persistent ordering
- **Authentication**: Google OAuth integration with NextAuth
- **Light/Dark Mode**: System preference support with next-themes
- **Google Calendar**: One-way import and event creation from tasks
- **Task Management**: CRUD operations with status tracking (Planned → Scheduled → In Progress → Done)

### 🚧 Beta Features (Feature Flagged)
- **Calendar Bi-directional Sync**: Task updates don't propagate back to calendar yet
- **GitHub Integration**: OAuth configured, real API integration with @octokit/rest (behind flag)

### 📋 Planned Integrations
- Gmail (framework in place)
- Asana (framework in place)  
- Notion (framework in place)
- Linear (framework in place)

### 🎯 Roadmap
- Mobile-responsive layouts
- PWA features (offline support, push notifications)
- Performance optimizations (virtualization, caching)
- Real-time collaboration

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **Authentication**: NextAuth with Google/GitHub OAuth
- **Drag & Drop**: @dnd-kit for kanban functionality
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI Components**: Radix UI primitives
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide Icons
- **Integrations**: googleapis, @octokit/rest, @notionhq/client, asana, @linear/sdk

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sunclaude.git
   cd sunclaude
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and configure:
   - **Google OAuth** (required for authentication and calendar):
     - Go to [Google Cloud Console](https://console.cloud.google.com/)
     - Create project and enable Google Calendar API
     - Create OAuth 2.0 credentials with redirect: `http://localhost:3000/api/auth/callback/google`
   - **GitHub OAuth** (optional, for GitHub integration):
     - Go to GitHub Settings > Developer settings > OAuth Apps
     - Create app with callback: `http://localhost:3000/api/auth/callback/github`
   - **Feature Flags**: Set `NEXT_PUBLIC_ENABLE_*` flags to `true` only for production-ready features

4. Set up the database:
   ```bash
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `app/` - Application source code
- `app/components/` - Reusable UI components
- `app/lib/` - Utility functions and shared logic
- `public/` - Static assets

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
