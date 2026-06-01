# NeuraIDE

NeuraIDE is a VS Code-inspired Electron IDE built with HTML, CSS, and vanilla JavaScript. It includes Monaco editing, tabs, a real filesystem explorer, integrated terminal, live HTML preview, settings, command palette, and configurable AI providers.

## Run

```bash
npm install
npm start
```

## Features

- Electron desktop shell with secure preload bridge.
- Monaco editor with syntax highlighting, minimap, word wrap, font size, tab size, search, replace, multiple cursors, and theme switching.
- Multi-tab editing with dirty tracking, save, save all, close, close saved, and close others foundation.
- Real filesystem support: open folder/file, create file/folder, rename, delete, move by drag/drop, and explorer auto refresh.
- VS Code-style layout: activity bar, sidebar, tab bar, editor area, bottom terminal, status bar, right AI panel, collapsible/resizable panels.
- xterm.js terminal backed by `node-pty` when available, with child process fallback.
- HTML preview panel with auto-refresh on save and external browser opening.
- AI chat and code actions for explain, fix, refactor, improve, edit selection, edit file, and generate file.
- AI providers: Ollama, Groq, OpenRouter, Mistral, and custom OpenAI-compatible endpoints.
- Model manager with add/remove/edit providers and models, API key entry, provider/model selection, import/export, and connection testing.
- Settings persistence for theme, editor, terminal, autosave, panel dimensions, and AI defaults.
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

Open Settings, choose **AI Providers**, and paste your own API keys where required. If a provider has no user key and `Use default-key credits` is enabled, NeuraIDE looks up a development key from `src/data/default-keys.json` and decrements local credits.

Ollama Local works without an API key when the local Ollama server is running. Non-Ollama providers use OpenAI-compatible `/chat/completions` endpoints.

AI editing is confirmation-based: generated replacements or files are shown through a confirmation prompt before NeuraIDE applies them.

## Packaging

```bash
npm run dist
```
