export const DEFAULT_CHAT_MODEL = "gemini-3-flash";

export type ChatModel = {
	id: string;
	name: string;
	provider: string;
	description: string;
};

export const chatModels: ChatModel[] = [
	{
		id: "gemini-3-flash",
		name: "Gemini 3 Flash",
		provider: "google",
		description: "Fast and capable",
	},
	{
		id: "gemini-3.1-pro-high",
		name: "Gemini 3.1 Pro",
		provider: "google",
		description: "Latest Gemini flagship",
	},
	{
		id: "gpt-5.3-codex",
		name: "GPT-5.3 Codex",
		provider: "openai",
		description: "Latest codex model",
	},
	{
		id: "gpt-5.3-codex-spark",
		name: "GPT-5.3 Codex Spark",
		provider: "openai",
		description: "Fast lightweight codex",
	},
	{
		id: "gpt-5.2",
		name: "GPT-5.2",
		provider: "openai",
		description: "OpenAI flagship",
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
