export const defaultConfig = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  autoSave: false,
  terminalFontSize: 13,
  sidebarWidth: 280,
  aiWidth: 360,
  terminalHeight: 260,
  defaultAIProvider: 'groq',
  defaultAIModel: 'openai/gpt-oss-120b'
};

export const defaultModels = {
  providers: [
    { id: 'groq', name: 'Groq', type: 'groq', endpoint: 'https://api.groq.com/openai/v1', apiKey: '', useDefaultCredits: true, models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
    { id: 'ollama', name: 'Ollama Local', type: 'ollama', endpoint: 'http://localhost:11434', apiKey: '', useDefaultCredits: false, models: ['llama3.1', 'llama3.2', 'qwen3:32b', 'qwen2.5-coder:32b', 'codellama', 'mistral'] },
    { id: 'ollama-cloud', name: 'Ollama Cloud', type: 'openai', endpoint: 'https://ollama.com/v1', apiKey: '', useDefaultCredits: true, models: ['gpt-oss:120b', 'gpt-oss:20b', 'qwen3:32b', 'llama3.3'] },
    { id: 'openrouter', name: 'OpenRouter', type: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', apiKey: '', useDefaultCredits: true, models: ['openai/gpt-oss-120b', 'openai/gpt-4o-mini', 'qwen/qwen-2.5-coder-32b-instruct', 'anthropic/claude-3.5-sonnet'] },
    { id: 'openai', name: 'OpenAI', type: 'openai', endpoint: 'https://api.openai.com/v1', apiKey: '', useDefaultCredits: true, models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini', 'o4-mini'] },
    { id: 'mistral', name: 'Mistral', type: 'mistral', endpoint: 'https://api.mistral.ai/v1', apiKey: '', useDefaultCredits: true, models: ['mistral-large-latest', 'codestral-latest', 'ministral-8b-latest'] },
    { id: 'anthropic', name: 'Anthropic via OpenAI-compatible proxy', type: 'custom', endpoint: 'https://api.anthropic.com/v1', apiKey: '', useDefaultCredits: false, models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'] },
    { id: 'deepseek', name: 'DeepSeek', type: 'openai', endpoint: 'https://api.deepseek.com/v1', apiKey: '', useDefaultCredits: true, models: ['deepseek-chat', 'deepseek-reasoner'] },
    { id: 'gemini', name: 'Gemini OpenAI-compatible', type: 'openai', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey: '', useDefaultCredits: false, models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
    { id: 'custom', name: 'Custom OpenAI Compatible', type: 'custom', endpoint: 'http://localhost:8000/v1', apiKey: '', useDefaultCredits: false, models: ['custom-model'] }
  ]
};

export const state = {
  workspace: null,
  tree: [],
  openTabs: [],
  activeTab: null,
  settings: { ...defaultConfig },
  models: structuredClone(defaultModels),
  extensions: [],
  credits: { remaining: 100, used: 0 },
  defaultKeys: {},
  dragPath: null
};
