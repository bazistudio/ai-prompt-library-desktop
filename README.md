# AI Prompt Library Desktop

> A private, offline-first workspace for creating, organizing, testing, versioning, and managing reusable AI prompts.

AI Prompt Library is a developer-focused desktop and web application designed as a centralized, high-performance workspace for storing, organizing, and executing hundreds or thousands of AI prompts.

Built with **React 19**, **Vite**, **React Router**, **Tauri 2**, **Rust**, and **SQLite**.

---

## ⚡ Highlights

- 🧠 **Prompt Library & Version History**: Full prompt lifecycle management, markdown editing, versioning, and restore points.
- ✍️ **Rich Markdown Editor**: Seamless markdown editing with live syntax highlighting, variables, and bidirectional text support.
- 📁 **Categories, Projects & Workflows**: Multi-workspace organization, dynamic categories, tags, and multi-step chained workflow execution.
- 🤖 **Multi-Model AI Playground & Arena**: Live prompt testing with Google Gemini, OpenAI, and Anthropic Claude.
- 🎨 **Semantic Design System**: Dark/light theme toggling powered by CSS tokens and Tailwind CSS v4.
- 🔒 **Local-First Privacy & Security**: 100% offline-first. Your prompts and API keys stay on your machine.
- 💾 **SQLite Offline Storage**: Embedded, zero-latency local database storage.
- ⚡ **Lightweight Native Desktop App**: Fast start times and low memory footprint powered by Tauri 2 and Rust.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│             AI Prompt Library — Frontend               │
│                                                        │
│   React 19 + TypeScript + Vite + Tailwind CSS v4       │
│   React Router (SPA Navigation & Layouts)              │
│   Semantic Design Tokens & Theme Engine                │
└───────────────────────────┬────────────────────────────┘
                            │
              IPC / Native Bridge (Tauri 2)
                            │
┌───────────────────────────▼────────────────────────────┐
│               Native Desktop Shell (Rust)              │
│                                                        │
│   Tauri 2 Core + File System & Dialog Plugins          │
│   Local SQLite Database Engine                         │
│   Secure Local Storage & File Management               │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend & UI
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite (`@vitejs/plugin-react`, `@tailwindcss/vite`)
- **Routing**: React Router (`react-router-dom`)
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` configuration)
- **Icons**: Lucide React (`lucide-react`)
- **Data Visualization**: Recharts (`recharts`)

### Desktop Native Engine
- **Desktop Framework**: Tauri 2 (`@tauri-apps/api`, `@tauri-apps/cli`)
- **Core Language**: Rust (Tauri 2 runtime, `tauri-plugin-opener`, `tauri-plugin-dialog`)
- **Local Database**: Embedded SQLite (`better-sqlite3`, native SQLite)
- **Validation & Serialization**: Zod (`zod`), UUID (`uuid`), JSON

---

## 🎨 Design System & CSS Tokens

The application uses a centralized semantic color system defined in [`src/app/globals.css`](file:///f:/library/ai%20prompt%20library/src/app/globals.css). Components use semantic Tailwind utilities rather than hardcoded hex codes.

### Default Brand Palette
- **Primary**: `#1A016F` (`--color-primary-value`)
- **Primary Hover**: `color-mix(in srgb, var(--color-primary-value) 85%, #fff)`
- **Primary Foreground**: `#FCF4FF` (`--color-primary-foreground-value`)
- **Accent**: `#C5FFE5` (`--color-accent-value`)
- **Accent Foreground**: `#07150F` (`--color-accent-foreground-value`)

### Theme Color Specifications

| Token | Dark Theme (Default) | Light Theme | Utility Class |
| :--- | :--- | :--- | :--- |
| **Background** | `#0B0620` | `#F8F7FF` | `bg-background` / `text-foreground` |
| **Foreground** | `#FCF4FF` | `#120E24` | `text-foreground` |
| **Card** | `#130A2D` | `#FFFFFF` | `bg-card` / `text-card-foreground` |
| **Popover** | `#130A2D` | `#FFFFFF` | `bg-popover` |
| **Muted** | `#21163D` | `#EDE9FE` | `bg-muted` / `text-muted-foreground` |
| **Secondary** | `#21163D` | `#EDE9FE` | `bg-secondary` / `text-secondary-foreground` |
| **Border** | `#30234D` | `#DED6FA` | `border-border` |
| **Ring** | `#C5FFE5` | `#1A016F` | `focus:ring-ring` |

### Status Colors
- **Success**: `#059669` (`bg-success`, `text-success`)
- **Warning**: `#D97706` (`bg-warning`, `text-warning`)
- **Danger**: `#E11D48` (`bg-danger`, `text-danger`)
- **Info**: `#2563EB` (`bg-info`, `text-info`)

### Typography & Spacing
- **Sans Font**: Inter (`--font-inter`, sans-serif)
- **Mono Font**: Geist Mono (`--font-geist-mono`, monospace)
- **Border Radius**: `sm: 0.375rem` \| `md: 0.625rem` \| `lg: 0.875rem` \| `xl: 1.125rem` \| `2xl: 1.5rem`

---

## 🧭 Application Navigation & Routes

The application uses React Router to provide clean SPA routing across 20 paths:

### Public & Auth Routes
- `/`: Interactive landing page & feature showcase
- `/login`: Workspace authentication
- `/register`: Account creation

### Studio Core Routes (`AppShell` Layout)
- `/dashboard`: Analytics dashboard, prompt counts, and recent prompts
- `/prompts`: Searchable prompt grid/list with category and tag filtering
- `/prompts/new`: Prompt creator with variables, tags, and category selector
- `/prompts/:id`: Full prompt editor, version comparison, test runner, and markdown preview
- `/workflows`: Multi-step prompt sequence chains
- `/workflows/:id`: Interactive workflow execution canvas
- `/templates`: Built-in starter prompt templates across 6 domains
- `/arena`: Multi-model prompt battleground & side-by-side comparison
- `/settings`: Appearance, model API keys, storage location, and license activation

### Admin Routes (`AdminLayout`)
- `/admin/dashboard`: System overview & metrics
- `/admin/users`: User management & roles
- `/admin/settings`: Global instance settings
- `/admin/login`: Super admin portal
- `/admin/unauthorized`: Permission boundary guard

---

## 📁 Project Structure

```text
ai-prompt-library/
├── build/                               # Desktop build assets
│   └── icon.ico                         # Application icon
├── docs/                                # Project documentation & design specs
│   ├── architecture.md
│   ├── design-system.md
│   ├── development-rules.md
│   ├── roadmap.md
│   └── archive/                         # Preserved architectural legacy files
├── public/                              # Static public assets
│   ├── favicon.ico
│   ├── icons/
│   │   └── icon.ico
│   └── images/
│       ├── logo.png
│       └── screenshots/
├── src/                                 # Frontend source application
│   ├── App.tsx                          # Root React Router switch & layout wrappers
│   ├── main.tsx                         # React 19 entry point & theme provider
│   ├── app/                             # Application views & pages
│   │   ├── (admin)/                     # Admin pages & layout
│   │   ├── (auth)/                      # Login & registration views
│   │   ├── (dashboard)/                 # Dashboard, prompts, workflows, arena, settings
│   │   ├── api/                         # Backend API handlers & data processors
│   │   ├── globals.css                  # Global Tailwind CSS v4 design tokens
│   │   └── page.tsx                     # Landing page
│   ├── auth/                            # Offline & session authentication utilities
│   ├── components/                      # UI components
│   │   ├── analytics/                   # Stats & metrics charts
│   │   ├── categories/                  # Category management modals
│   │   ├── editor/                      # Rich Markdown editor & syntax renderer
│   │   ├── landing/                     # Landing page sections & navbar
│   │   ├── layout/                      # AppShell, Navbar, Sidebar, SidebarCategory
│   │   ├── modals/                      # Command palette, AI enhance modals
│   │   ├── prompts/                     # Prompt cards, runners, export/import modal
│   │   ├── storage/                     # File storage location picker
│   │   ├── theme/                       # Theme provider & theme toggler
│   │   ├── ui/                          # Button, Input, Modal, LogoutButton
│   │   └── workspaces/                  # Workspace / project dropdown switcher
│   ├── config/                          # Application configuration
│   ├── database/                        # Local SQLite schema & query layers
│   │   └── local/
│   │       ├── schema.ts                # Database tables & migration initializers
│   │       ├── promptQueries.ts         # Prompts & versions queries
│   │       └── categoryQueries.ts       # Category management queries
│   ├── lib/                             # Shared utilities, validation & crypto
│   ├── services/                        # Service layer (AI, prompts, categories, storage)
│   └── types/                           # TypeScript interfaces & definitions
├── src-tauri/                           # Tauri 2 Desktop Shell
│   ├── Cargo.toml                       # Rust package manifest & dependencies
│   ├── build.rs                         # Tauri build script
│   ├── tauri.conf.json                  # Desktop window & bundle configuration
│   ├── capabilities/                    # Tauri permission capabilities
│   │   └── default.json
│   ├── icons/                           # Native application icons
│   │   └── icon.ico
│   └── src/
│       └── main.rs                      # Native application entry point
├── .gitignore                           # Git ignore rules
├── index.html                           # Single-page application entry point
├── package.json                         # Project dependencies & scripts
├── read.md                              # Concise overview
├── README.md                            # Comprehensive documentation
├── tsconfig.json                        # TypeScript configuration
└── vite.config.ts                       # Vite bundler & plugin configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust & Cargo](https://rustup.rs/) (for Tauri 2 desktop builds)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd "ai-prompt-library"

# Install dependencies
npm install
```

### 💻 Running Development Server (Vite)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🖥️ Running Desktop Application (Tauri 2)
```bash
npm run tauri dev
```

### 🔨 Building for Production
```bash
# Build the Vite frontend
npm run build

# Build the native desktop installer (Windows .exe / .msi)
npm run tauri build
```

---

## 🔒 Privacy & Local-First Guarantees

- **No Mandatory Cloud**: Operates completely offline without connecting to external telemetry or third-party servers.
- **Your Data Stays Yours**: Prompts, categories, versions, and API keys are stored locally on your machine in embedded SQLite files.
- **Direct AI Provider Calls**: When configured, AI requests connect directly from your machine to official provider APIs (Gemini, OpenAI, Anthropic) using your own API keys.

---

## 📜 License

Private AI Prompt Workspace by **Bazi Studio**. All rights reserved.
