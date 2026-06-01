# NeuraIDE

NeuraIDE is a VS Code-inspired Electron IDE built with HTML, CSS, and vanilla JavaScript. It includes Monaco editing, tabs, a real filesystem explorer, integrated terminal, live HTML/CSS/JS preview, in-editor settings, drop-in HTML extensions, Git command helpers, and configurable AI providers.

## Run

```bash
npm install
npm start
```

If local Monaco/xterm assets are unavailable, the renderer falls back to CDN assets for development.

## Features

- Electron desktop shell with a secure preload bridge.
- Monaco editor with syntax highlighting, minimap, word wrap, font size, tab size, search, replace, multiple cursors, and theme switching.
- Multi-tab editing with dirty tracking, save, save all, close, close saved, and close others foundation.
- Real filesystem support: open folder/file, create file/folder, rename, delete, move by drag/drop, and explorer auto refresh.
- VS Code-style layout: activity bar, sidebar, tab bar, editor area, bottom terminal, status bar, right AI panel, collapsible/resizable panels.
- xterm.js terminal backed by `node-pty` when available, with a shell-process fallback.
- Git sidebar that sends common/custom `git` commands to the integrated terminal.
- HTML preview that inlines relative CSS and JavaScript references and adds a `file://` base for local assets.
- AI chat and quick actions for explain, fix, refactor, improve, edit selection, edit file, and generate file.
- AI providers: Groq, Ollama Local, Ollama Cloud, OpenRouter, OpenAI, Mistral, DeepSeek, Gemini OpenAI-compatible, and custom OpenAI-compatible endpoints.
- In-editor Settings with navigation for editor, AI providers, credits, terminal, and extensions.
- Model manager with add/remove/edit providers and models, user API key entry, provider/model selection, import/export, and connection testing.
- Development credits system for providers without user API keys. Default deployment keys live in `src/data/default-keys.json`.
- Single-file HTML extensions: drop or add an HTML file in the Extensions sidebar; each extension appears as a VS Code-style activity-bar icon and opens inside the left sidebar.
- Command palette: `Ctrl+Shift+P`.

## Keyboard Shortcuts

| Shortcut | Command |
| --- | --- |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+O` | Open File |
| `Ctrl+N` | New File |
| `Ctrl+S` | Save |
| `Ctrl+`` | Toggle Terminal |
| `Ctrl+Shift+A` | Toggle AI Panel |
| `Ctrl+,` | Settings |

## AI Setup

Open Settings, choose **AI Providers**, and paste your own API keys where required. Development default keys are set in `src/data/default-keys.json` under provider ids such as `groq`, `openrouter`, `openai`, `mistral`, `deepseek`, or `ollama-cloud`; restart the app after editing that file. If a provider has no user key and `Use default-key credits` is enabled, NeuraIDE uses that default key and decrements local credits.

Ollama Local works without an API key when the local Ollama server is running. Non-Ollama providers use OpenAI-compatible `/chat/completions` endpoints.

AI editing is confirmation-based: generated replacements or files are shown through a confirmation prompt before NeuraIDE applies them.

## Packaging

```bash
npm run dist
```
