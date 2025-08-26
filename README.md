# Sunclaude

A modern task management application built with Next.js, featuring focus modes and seamless third-party integrations.

## Features

- Light/Dark mode with system preference support
- Responsive design with collapsible sidebars
- Integration support for:
  - Gmail
  - Asana
  - Notion
  - Linear
- Focus mode for distraction-free work
- Daily and weekly task views
- Notification system for updates across integrations

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Theme**: next-themes
- **Icons**: Lucide Icons

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
   
   Then edit `.env.local` and add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set authorized origins: `http://localhost:3000`
   - Set authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret to your `.env.local`

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
