# NeuraIDE - Fresh Start Implementation Plan

## Project Overview

Rebuild NeuraIDE (a VS Code-inspired AI-powered desktop IDE) from scratch using Electron, HTML, CSS, and Vanilla JavaScript. The goal is to create a clean, modular, production-quality codebase that fully implements all features listed in Features_needed.md.

---

## Architecture Overview

### Technology Stack
- Electron v27+ - Desktop application framework
- Monaco Editor - Code editor component
- xterm.js - Terminal emulator
- Font Awesome - Icons
- Vanilla JavaScript - Business logic (no frameworks)
- CSS Custom Properties - Theming system
- Node.js fs API - File system operations (via Electron IPC)

### Application Layer Architecture
`
main.js (Electron Main)
  - Window management
  - IPC handlers for file operations
  - Process spawning for terminal

preload.js (Context Bridge)
  - Secure API exposure to renderer
  - File system APIs, dialogs, config

index.html (Entry Point)
  - UI layout structure
  - Monaco Editor container
  - Terminal container
  - AI chat interface

app.js (Core)
  - Component bootstrapping
  - State management (event bus pattern)
  - Keyboard shortcut handling

Component Modules (js/)
  - editor.js: Monaco Editor wrapper
  - explorer.js: File explorer & tree view
  - tabs.js: Tab management
  - terminal.js: xterm.js integration
  - preview.js: HTML preview system
  - ai.js: AI system & providers
  - settings.js: Settings management
  - models.js: Model manager
  - commandPalette.js: VS Code-style command palette
  - notifications.js: Toast notification system
  - filesystem.js: File operations wrapper
`

---

## File Structure

`
NeuraIDE/
|-- main.js                    # Electron main process
|-- preload.js                 # Context bridge for security
|-- package.json               # Updated with proper dependencies
|
|-- src/
|   |-- index.html             # Main entry point
|   |
|   |-- css/
|   |   |-- main.css           # Root styles, variables
|   |   |-- layout.css         # VS Code-like layout
|   |   |-- themes.css         # Dark/light theme definitions
|   |   |-- components.css     # Component-specific styles
|   |
|   |-- js/
|   |   |-- app.js             # Application bootstrap & state
|   |   |-- editor.js          # Monaco Editor wrapper
|   |   |-- explorer.js        # File explorer & tree view
|   |   |-- tabs.js            # Tab management
|   |   |-- terminal.js        # xterm.js integration
|   |   |-- preview.js         # HTML preview system
|   |   |-- ai.js              # AI system & providers
|   |   |-- settings.js        # Settings panel
|   |   |-- models.js          # Model manager
|   |   |-- commandPalette.js  # Command palette
|   |   |-- notifications.js   # Notification system
|   |   |-- filesystem.js      # File operations wrapper
|   |
|   |-- assets/
|   |   |-- icons/             # File type icons (SVG)
|   |
|   |-- data/
|       |-- config.json        # Default configuration
|       |-- models.json        # Default providers & models
`

---

## Component Design

### 1. Application Core (app.js)

Responsibilities:
- Bootstrap all components in correct order
- Maintain global state (theme, open files, workspace)
- Handle keyboard shortcuts (Ctrl+S, Ctrl+Shift+P, etc.)
- Event bus for component communication
- Auto-refresh coordination

### 2. Monaco Editor Wrapper (editor.js)

Responsibilities:
- Initialize Monaco with proper configuration
- Handle language detection from file extension
- Manage editor settings (fontSize, tabSize, wordWrap)
- Provide API for content operations
- Minimap and syntax highlighting support

### 3. File Explorer (explorer.js)

Responsibilities:
- Render file tree with lazy loading
- Handle folder expansion/collapse
- Context menu for file operations
- Drag and drop support
- File type icons
- Auto-refresh via polling

### 4. Tab System (tabs.js)

Responsibilities:
- Manage multiple open files
- Dirty state tracking
- Context menu per tab
- Close, Close Others, Close Saved
- Keyboard navigation

### 5. Terminal (terminal.js)

Responsibilities:
- Initialize xterm.js with FitAddon
- Handle shell process spawning
- Command history (arrow up/down)
- Multi-tab terminal support
- Clear, resize, focus functionality

### 6. AI System (ai.js)

Responsibilities:
- Provider abstraction (Groq, OpenRouter, Ollama, Mistral, Custom)
- Chat message handling
- Code context extraction
- Quick actions (explain, refactor, fix, generate)
- Streaming response support

Provider Structure:
`javascript
{
  name: string,             // User-defined name
  endpoint: string,         // API base URL
  apiKey: string,           // Optional for local models
  type: 'ollama' | 'openai' | 'groq' | 'mistral' | 'custom'
}
`

### 7. Settings Manager (settings.js)

Responsibilities:
- Settings UI rendering
- Real-time preview of changes
- Import/Export settings
- Validation of settings values

### 8. Model Manager (models.js)

Responsibilities:
- CRUD operations for providers/models
- Active provider/model selection
- Test connection to providers
- Import/Export configurations

### 9. Command Palette (commandPalette.js)

Responsibilities:
- Register commands with metadata
- Filter/search commands
- Execute command actions
- Keyboard navigation

Commands:
| Command | Shortcut | Action |
|---------|----------|--------|
| Open Folder | Ctrl+K Ctrl+O | File dialog |
| New File | Ctrl+N | Create empty file |
| New Folder | - | Create folder |
| Save | Ctrl+S | Save current file |
| Save All | Ctrl+K S | Save all tabs |
| Toggle Terminal | Ctrl+ | Show/hide terminal |
| Toggle AI | Ctrl+Shift+A | Show/hide AI panel |

### 10. Notifications (notifications.js)

Responsibilities:
- Toast-style notifications
- Auto-dismiss after timeout
- Manual close option
- Type styling (success, error, warning)

### 11. Preview System (preview.js)

Responsibilities:
- HTML/CSS/JS live preview
- Auto-refresh option
- Open in external browser

---

## UI Layout Structure

`
+---------------------------------------------------------------+
| Title Bar                                                      |
+-----+----------------------------------------------------------+
| AB  | TAB BAR                                                   |
|     | +------------------------------------------------------+ |
|     | | Editor Content (Monaco)                              | |
|     | |                                                      | |
+-----+ +------------------------------------------------------+ |
| EX  | TERMINAL PANEL                                          | |
|     | +------------------------------------------------------+ |
|     | |                                                      | |
|     | +------------------------------------------------------+ |
|       STATUS BAR                                               |
+---------------------------------------------------------------+
| AI PANEL (Right sidebar, collapsible)                           |
+---------------------------------------------------------------+
`

AB = Activity Bar
EX = Explorer/Sidebar

---

## Implementation Phases

### Phase 1: Core Infrastructure
- Remove all src/*.js files (keep node_modules)
- Create directory structure
- Write main.js with complete IPC handlers
- Write preload.js with secure API exposure
- Create src/index.html with basic VS Code-like layout
- Create base CSS files (main.css, layout.css, themes.css, components.css)

### Phase 2: Editor & File System
- Implement editor.js - Monaco integration
- Implement explorer.js - File tree with IPC
- Implement tabs.js - Tab management
- Implement filesystem.js - File operation abstraction

### Phase 3: Terminal & Preview
- Implement terminal.js - xterm.js + shell
- Implement preview.js - HTML preview system

### Phase 4: AI System
- Implement ai.js - Provider abstraction
- Implement models.js - Model management
- Implement settings.js - Settings integration

### Phase 5: UX Enhancements
- Implement commandPalette.js - Command palette
- Implement notifications.js - Notifications
- Add resizable panels
- Add keyboard shortcuts
- Add theme switching

### Phase 6: Polish & Documentation
- Add file icons for all types
- Add loading states
- Add proper error handling
- Create configuration defaults
- Test all features

---

## Key Technical Decisions

### 1. State Management
- Centralized state in app.js
- Components receive state updates via callbacks
- No global state pollution

### 2. Event Communication
- Custom events for component-to-component
- IPC events for main-renderer communication
- Event delegation for DOM events

### 3. Theming
- CSS custom properties for all colors
- data-theme attribute on body
- Two themes: dark (default) and light
- Monaco theme automatically switches

### 4. Security
- Context isolation enabled
- Preload script for API exposure
- No nodeIntegration in renderer
- API key storage in userData directory

---

## Existing Codebase Issues

The current codebase has several issues that justify a complete rewrite:

1. Mixed Concerns - HTML references both src/css/main.css and src/index.html
2. Redundant files - Both root index.html and src/index.html exist
3. Missing filesystem.js - File operations scattered across files
4. No commandPalette.js - Command palette logic in app.js
5. No notifications.js - Notification logic in app.js
6. Incomplete IPC - Some IPC channels missing from preload.js
7. CSS organization - Layout and themes mixed in same file
8. Browser fallback inconsistencies - Mixed localStorage/electron logic
9. Missing drag and drop - Not fully implemented in explorer
10. Configuration loading - Fetches from non-existent path in browser mode

---

## Success Criteria

- [ ] All features from Features_needed.md working
- [ ] Clean modular code structure
- [ ] Production-ready error handling
- [ ] Cross-platform compatibility (Windows/Mac/Linux)
- [ ] Real file system operations in Electron
- [ ] AI providers configurable and working
- [ ] VS Code-like user experience
- [ ] No console errors
- [ ] Proper packaging with electron-builder

Features Required:
Core IDE

✅ Monaco Editor

✅ Multiple open tabs

✅ File explorer

✅ Open folder

✅ Open file

✅ Save file

✅ Save all files

✅ Create file

✅ Create folder

✅ Rename file

✅ Delete file

✅ Drag & drop files

✅ Real filesystem support using Electron FS

✅ Auto refresh explorer

VS Code Style UI

✅ Activity bar

📁 Explorer
🔍 Search
🌿 Git
🤖 AI
📦 Extensions
⚙ Settings

✅ Sidebar

✅ Tab bar

✅ Editor area

✅ Bottom terminal

✅ Status bar

✅ Right AI panel

✅ Resizable panels

✅ Collapsible panels

Editor Features

✅ Monaco Editor

✅ Syntax highlighting

✅ Minimap

✅ Word wrap toggle

✅ Font size setting

✅ Tab size setting

✅ Multiple cursors

✅ Theme switching

✅ Auto save

✅ Search in file

✅ Replace in file

Terminal

✅ xterm.js

✅ Embedded terminal

✅ Execute commands

✅ Multiple terminal tabs

✅ Clear terminal

AI System

✅ AI chat

✅ AI code generation

✅ AI file generation

✅ AI explain code

✅ AI refactor code

✅ AI fix errors

✅ AI improve code

✅ AI create project

✅ AI create components

✅ AI edit selected code

✅ AI edit current file

AI Providers

✅ Groq

✅ OpenRouter

✅ Ollama

✅ Mistral

✅ Custom OpenAI-compatible endpoint

Model Manager

✅ Add model

✅ Remove model

✅ Edit model

✅ Add provider

✅ Remove provider

✅ API key storage

✅ Provider selection

✅ Model selection

Settings

✅ Theme

✅ Font size

✅ Word wrap

✅ Tab size

✅ Autosave

✅ Terminal font size

✅ Default AI provider

✅ Default AI model

✅ Sidebar width

✅ Editor preferences

Command Palette

Ctrl+Shift+P

Commands:

Open Folder
New File
New Folder
Save
Save All
Toggle Terminal
Toggle AI
Change Theme
Switch Model
Ask AI
File Icons
HTML
CSS
JS
TS
JSON
MD
PY
JAVA
CPP
C
TXT
PNG
SVG
Search

✅ Search files

✅ Search project

✅ Replace project-wide

Preview System

✅ HTML preview

✅ Live preview

✅ Refresh preview

Notifications

✅ Success

✅ Error

✅ Warning

✅ Loading

Keyboard Shortcuts
Ctrl+S
Ctrl+Shift+S
Ctrl+P
Ctrl+Shift+P
Ctrl+F
Ctrl+H
Ctrl+N
Ctrl+W
