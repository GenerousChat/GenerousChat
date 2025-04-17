# Generous [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build applications visually with your team and AI assistance in real-time. Collaborate, prototype, and create together on a shared canvas.

[Live Demo (Example)](https://generous.rocks) <!-- Replace with actual demo link if different -->

![Generous Screenshot (Placeholder)](./placeholder-screenshot.png) <!-- Replace with an actual screenshot -->

## Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

## About The Project

Generous is a web-based platform designed for collaborative application development and prototyping. It leverages a visual canvas interface combined with real-time communication features and AI assistance to streamline the building process for teams.

Users can interact within chat rooms, visualize components or workflows on a canvas, and receive AI-generated responses or code suggestions, fostering a dynamic and efficient development environment.

## Key Features

- **Real-time Collaboration:** Chat rooms and potentially shared canvas interactions powered by Pusher.
- **AI Assistance:** Integrates with AI models (OpenAI, Google, XAI) to provide responses and potentially code generation within the chat context.
- **Visual Canvas:** Includes canvas components for visualization (details inferred, needs confirmation).
- **User Authentication:** Secure sign-up, sign-in, and password management using Supabase Auth.
- **Audio Rooms:** Integration with Dyte SDK for potential audio/video communication.
- **Text-to-Speech (TTS):** Provides audio playback for messages or AI responses.
- **Responsive Design:** Adapts to various screen sizes with light and dark theme support.
- **Profile Management:** Users can manage their profiles (details inferred).

## Tech Stack

**Frontend:**

- [Next.js](https://nextjs.org/) (v14+ App Router)
- [React](https://react.dev/) (v19)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/) (likely, based on component structure)
- [Framer Motion](https://www.framer.com/motion/) (for animations)
- [Pusher-JS](https://pusher.com/docs/channels/getting_started/javascript/)
- [Dyte React UI Kit & Web Core](https://docs.dyte.io/react-ui-kit)

**Backend & Services:**

- [Supabase](https://supabase.com/) (Database, Auth, Realtime)
- [Pusher Channels](https://pusher.com/channels/) (Realtime Messaging)
- [AI SDK](https://sdk.vercel.ai/) (integrating OpenAI, Google Gemini, XAI Grok)
- Node.js (for the worker)
- Express.js (in the worker)

**Worker Process:**

- Handles bridging Supabase real-time events (DB changes) to Pusher.
- Triggers AI response generation.
- Built with TypeScript, run using `tsx` (dev) or compiled JS (prod).

## Project Structure

```
/app/                # Next.js App Router pages and layouts
  (auth-pages)/     # Authentication related pages
  api/              # API routes
  chat/             # Chat features (main and room-specific)
  profile/          # User profile section
  layout.tsx        # Root layout
  page.tsx          # Landing page
/components/        # Reusable React components
  audio/            # Audio room components (Dyte)
  canvas/           # Canvas related components
  chat/             # Chat specific components
  ui/               # General UI components (likely Shadcn/ui based)
/public/            # Static assets (images, fonts, icons)
/utils/             # Utility functions (Supabase clients, contexts)
/worker/            # Backend worker process (Supabase -> Pusher bridge, AI triggers)
  services/         # Services used by the worker (AI, Pusher, Supabase Admin)
  routes/           # API routes for the worker's Express server
  index.ts          # Worker entry point
.env                # Local environment variables (!!! IMPORTANT - Not committed)
Dockerfile          # Docker configuration
next.config.mjs     # Next.js configuration
package.json        # Project dependencies and scripts
tailwind.config.ts  # Tailwind CSS configuration
tsconfig.json       # TypeScript configuration
README.md           # This file
```

## Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables. Obtain the necessary keys and secrets from the respective service providers (Supabase, Pusher, OpenAI, etc.).

```bash
# Supabase (Obtain from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key # !!! Keep this secret - Used by the worker

# Pusher (Obtain from your Pusher Channels dashboard)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_app_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret # !!! Keep this secret - Used by the worker

# AI Providers (Obtain API keys from the respective platforms)
OPENAI_API_KEY=your_openai_api_key # Required if using OpenAI models
GOOGLE_API_KEY=your_google_api_key # Required if using Google Gemini models
XAI_API_KEY=your_xai_api_key       # Required if using XAI Grok models

# Dyte (If using audio/video features - Obtain from Dyte dashboard)
# DYTE_ORG_ID=your_dyte_org_id
# DYTE_API_KEY=your_dyte_api_key

# Optional: Worker Configuration
PORT=3001 # Port for the worker process (default: 3001)
# HTML_CONTENT_CHANCE=90 # Chance (in %) for AI to generate HTML (default: 90)
MESSAGES_TABLE=messages # Name of the Supabase table for chat messages (default: messages)
```

**Important:** The `SUPABASE_SERVICE_KEY` and `PUSHER_SECRET` are highly sensitive and should never be exposed publicly.

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) account and project.
- A [Pusher Channels](https://pusher.com/channels/) account and app.
- API keys for the AI providers you intend to use (OpenAI, Google, XAI).
- (Optional) A [Dyte](https://dyte.io/) account if using audio/video features.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/generouschat/generous.git # Replace with your repo URL if different
    cd generous
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the project root.
    - Copy the variables listed in the [Environment Variables](#environment-variables) section into your `.env` file.
    - Fill in the values with your actual keys and credentials from Supabase, Pusher, AI providers, etc.

4.  **Set up Supabase Database:**

    - You might need to run SQL migrations provided by the project (if any) or set up the required tables (`chat_rooms`, `messages`, `room_participants`, potentially others) manually in your Supabase dashboard based on the code (`app/chat/[roomId]/page.tsx`, `worker/services/supabase.ts`).
    - Ensure RLS (Row Level Security) policies are appropriately configured for security.
    - Enable the `realtime` functionality for the tables the worker listens to (`messages`, `room_participants`).

5.  **Build the worker:**
    ```bash
    npm run worker:build
    ```

## Running the Application

To run the application in development mode, you need to start both the Next.js frontend and the backend worker process.

1.  **Start the Next.js development server:**

    ```bash
    npm run dev
    ```

    This will typically start the frontend on `http://localhost:3000`.

2.  **Start the worker process (in a separate terminal):**
    ```bash
    npm run worker:dev
    ```
    This will start the worker, usually on port 3001 (or the `PORT` specified in `.env`). Watch this terminal for logs from the worker, including Supabase connection status, Pusher events, and AI interactions.

Now you can access the application in your browser at `http://localhost:3000`.

## Available Scripts

- `npm run dev`: Starts the Next.js frontend in development mode.
- `npm run build`: Builds the Next.js frontend for production.
- `npm run start`: Starts the Next.js frontend production server.
- `npm run worker:dev`: Starts the worker process in development mode using `tsx` (with hot-reloading).
- `npm run worker:build`: Compiles the worker TypeScript code to JavaScript (`dist/` directory).
- `npm run worker:start`: Starts the compiled worker process from the `dist/` directory (for production).

## Contributing

Contributions are welcome! Please follow standard fork/pull request procedures. (Add more specific contribution guidelines if desired).

## License

Distributed under the MIT License. See `LICENSE` file for more information (if a LICENSE file exists).
