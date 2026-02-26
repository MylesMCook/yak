export const DEFAULT_CHAT_MODEL = "llama-3.3-70b-versatile";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  logo: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // Groq models (free, fast inference)
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    logo: "groq",
    description: "Fast, versatile general chat",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    provider: "groq",
    logo: "groq",
    description: "Ultra-fast lightweight",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: "groq",
    logo: "mistral",
    description: "Strong reasoning",
  },
  // CLIProxyAPI models (coding tasks — Codex, Gemini, Claude)
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "cliproxy",
    logo: "google",
    description: "Fast multimodal from Google",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "cliproxy",
    logo: "google",
    description: "Advanced reasoning from Google",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "cliproxy",
    logo: "google",
    description: "Reliable workhorse from Google",
  },
  {
    id: "gpt-5.3-codex",
    name: "GPT-5.3 Codex",
    provider: "cliproxy",
    logo: "openai",
    description: "Latest codex model",
  },
  {
    id: "gpt-5.3-codex-spark",
    name: "GPT-5.3 Codex Spark",
    provider: "cliproxy",
    logo: "openai",
    description: "Fast lightweight codex",
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "cliproxy",
    logo: "openai",
    description: "General-purpose from OpenAI",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>,
);
