# Generous [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md) [![GitHub Stars](https://img.shields.io/github/stars/generouschat/generous)](https://github.com/generouschat/generous/stargazers) [![GitHub Issues](https://img.shields.io/github/issues/generouschat/generous)](https://github.com/generouschat/generous/issues)

<div align="center">
  <img src="./public/logo.svg" alt="Generous Logo" width="400" />

Build applications visually with your team and AI assistance in real-time. Collaborate, prototype, and create together on a shared canvas.

</div>

<div align="center">

[Live Demo](https://generous.rocks) | [Documentation](README.md) | [Report Bug](https://github.com/generouschat/generous/issues) | [Request Feature](https://github.com/generouschat/generous/issues)

</div>

![Generous Screenshot (Placeholder)](./placeholder-screenshot.png) <!-- Replace with an actual screenshot of the application -->

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Key Features](#-key-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running the Application](#-running-the-application)
- [Available Scripts](#-available-scripts)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Security](#-security)
- [Code of Conduct](#-code-of-conduct)
- [Support](#-support)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

## 🚀 About The Project

Generous is a web-based platform designed for collaborative application development and prototyping. It leverages a visual canvas interface combined with real-time communication features and AI assistance to streamline the building process for teams.

Users can interact within chat rooms, visualize components or workflows on a canvas, and receive AI-generated responses or code suggestions, fostering a dynamic and efficient development environment.

### 💡 Motivation

The Generous platform was created to address the challenges of remote collaborative development. By combining visual tools, AI assistance, and real-time communication, we aim to make development more accessible and efficient for teams of all sizes.

## ✨ Key Features

- **Real-time Collaboration:** Chat rooms with shared canvas interactions powered by Pusher Channels
- **AI Assistance:** Integration with multiple AI models:
  - OpenAI (GPT models) for sophisticated text responses
  - Google Gemini for alternative AI capabilities
  - XAI (Grok) for additional AI functionality
- **Visual Canvas:** Interactive visualization components for prototyping and ideation
- **User Authentication:** Secure sign-up, sign-in, and password management using Supabase Auth
- **Audio Communication:** Integration with Dyte SDK for real-time audio/video conversations
- **Text-to-Speech (TTS):** Audio playback for messages and AI responses
- **Responsive Design:** Fully responsive UI with light and dark theme support
- **Profile Management:** Customizable user profiles and settings

## 🔧 Demo

Check out our live demo at [https://generous.rocks](https://generous.rocks) to experience the platform firsthand.

[View Demo →](https://generous.rocks)

## 🔧 Tech Stack

**Frontend:**

- [Next.js](https://nextjs.org/) (App Router) - React framework
- [React](https://react.dev/) (v19) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - UI component system
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Pusher-JS](https://pusher.com/docs/channels/getting_started/javascript/) - Real-time client
- [Dyte React UI Kit & Web Core](https://docs.dyte.io/react-ui-kit) - Audio/video components

**Backend & Services:**

- [Supabase](https://supabase.com/) - PostgreSQL database, Auth, and Realtime
- [Pusher Channels](https://pusher.com/channels/) - Reliable real-time messaging
- [AI SDK](https://sdk.vercel.ai/) - Integration with OpenAI, Google Gemini, and XAI Grok
- [Node.js](https://nodejs.org/) - JavaScript runtime for the worker
- [Express.js](https://expressjs.com/) - Web framework for the worker

**Worker Process:**

- Handles bridging Supabase real-time events (DB changes) to Pusher
- Triggers AI response generation with multiple models
- Built with TypeScript, run using `tsx` (dev) or compiled JS (prod)
- Manages real-time data synchronization and event handling

## 📁 Project Structure

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

## 🔐 Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables. Obtain the necessary keys and secrets from the respective service providers (Supabase, Pusher, OpenAI, etc.).

> ⚠️ **Security Notice**: Never commit your `.env` file to version control. It contains sensitive information that should remain private.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key # !!! Keep this secret - Used by the worker
SUPABASE_URL=your_supabase_project_url              # Same as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY=your_supabase_anon_key            # Same as NEXT_PUBLIC_SUPABASE_ANON_KEY

# Pusher Configuration
NEXT_PUBLIC_PUSHER_KEY=your_pusher_app_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
NEXT_PUBLIC_PUSHER_APP_ID=your_pusher_app_id
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key          # Same as NEXT_PUBLIC_PUSHER_KEY
PUSHER_SECRET=your_pusher_secret    # !!! Keep this secret - Used by the worker
PUSHER_CLUSTER=your_pusher_cluster  # Same as NEXT_PUBLIC_PUSHER_CLUSTER

# AI Provider Keys
OPENAI_API_KEY=your_openai_api_key             # Required if using OpenAI models
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key  # Required if using Google Gemini models
XAI_API_KEY=your_xai_api_key                   # Required if using XAI Grok models
USE_XAI=true                                   # Set to "true" to enable XAI (Grok) models
DEBUG_MODEL=gpt-4o-mini                        # Specify model for debugging

# Dyte Audio/Video Configuration
DYTE_ORG_ID=your_dyte_org_id
DYTE_API_KEY=your_dyte_api_key
DYTE_AUTH_HEADER=your_dyte_auth_header         # Usually Basic + base64 encoded credentials
DYTE_BASE_URL=https://api.dyte.io/v2           # Dyte API endpoint
NEXT_PUBLIC_DYTE_API_KEY=your_dyte_api_key     # Same as DYTE_API_KEY
NEXT_PUBLIC_DYTE_ORG_ID=your_dyte_org_id       # Same as DYTE_ORG_ID
NEXT_PUBLIC_DYTE_AUTH_HEADER=your_dyte_auth_header  # Same as DYTE_AUTH_HEADER
NEXT_PUBLIC_DYTE_PRESET_NAME=group_call_participant # Dyte preset configuration

# Database Configuration
MESSAGES_TABLE=messages                        # Name of the Supabase table for chat messages
NEXT_PUBLIC_MESSAGES_TABLE=messages            # Same as MESSAGES_TABLE

# Worker Configuration
PORT=3001                                      # Port for the worker process (default: 3001)
```

**Important Security Notes:**

- The `SUPABASE_SERVICE_KEY` and `PUSHER_SECRET` are highly sensitive and should never be exposed publicly
- We recommend using environment-specific `.env` files (`.env.development`, `.env.production`) for different settings
- Consider using a secrets manager for production deployments

## 🚦 Getting Started

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

## 🏃‍♂️ Running the Application

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

## 📜 Available Scripts

- `npm run dev`: Starts the Next.js frontend in development mode.
- `npm run build`: Builds the Next.js frontend for production.
- `npm run start`: Starts the Next.js frontend production server.
- `npm run worker:dev`: Starts the worker process in development mode using `tsx` (with hot-reloading).
- `npm run worker:build`: Compiles the worker TypeScript code to JavaScript (`dist/` directory).
- `npm run worker:start`: Starts the compiled worker process from the `dist/` directory (for production).

## 🗺️ Roadmap

- [ ] Enhanced visualization capabilities
- [ ] Additional AI model integrations
- [ ] Advanced code generation features
- [ ] Mobile application
- [ ] Plugin ecosystem

See the [open issues](https://github.com/generouschat/generous/issues) for a complete list of proposed features and known issues.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

## 🔒 Security

We take the security of Generous seriously. If you believe you have found a security vulnerability, please follow our responsible disclosure guidelines in [SECURITY.md](SECURITY.md).

**DO NOT** disclose security vulnerabilities publicly until they have been addressed by the team.

## 📝 Code of Conduct

We expect all contributors and users to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand what actions will and will not be tolerated.

## 💬 Support

Have questions? Need help? Join our community channels:

- [GitHub Discussions](https://github.com/generouschat/generous/discussions)
- [Discord Server](https://discord.gg/generous) <!-- Replace with actual Discord link if available -->

## 📄 License

Distributed under the MIT License. This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Pusher](https://pusher.com/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- All the open source libraries and tools that made this project possible
