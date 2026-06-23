export type Provider = 'ollama' | 'openai';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface LlmSettings {
	temperature: number;
	maxTokens: number;
	topP: number;
	systemPrompt: string;
}

export interface OpenAiEndpoint {
	id: string;
	name: string;
	baseUrl: string;
	apiKey: string;
}

export interface AppSettings {
	provider: Provider;
	ollamaUrl: string;
	model: string;
	selectedEndpointId: string;
	endpoints: OpenAiEndpoint[];
	llm: LlmSettings;
	darkMode: boolean;
}

export interface Conversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
}

export interface StreamChunk {
	content: string;
	done: boolean;
}

export const DEFAULT_SYSTEM_PROMPT = '';

export const DEFAULT_SETTINGS: AppSettings = {
	provider: 'ollama',
	ollamaUrl: 'http://localhost:11434',
	model: '',
	selectedEndpointId: '',
	endpoints: [],
	llm: {
		temperature: 0.7,
		maxTokens: 2048,
		topP: 1,
		systemPrompt: DEFAULT_SYSTEM_PROMPT
	},
	darkMode: true
};

export function effectiveSystemPrompt(prompt: string): string {
	return prompt.trim() === '' ? DEFAULT_SYSTEM_PROMPT : prompt;
}

export function createEndpoint(name = 'OpenAI'): OpenAiEndpoint {
	return {
		id: crypto.randomUUID(),
		name,
		baseUrl: 'https://api.openai.com/v1',
		apiKey: ''
	};
}

/** Ensure OpenAI provider has a valid selected endpoint when endpoints exist. */
export function normalizeAppSettings(settings: AppSettings): AppSettings {
	if (settings.provider !== 'openai' || settings.endpoints.length === 0) {
		return settings;
	}

	const hasSelection = settings.endpoints.some((e) => e.id === settings.selectedEndpointId);
	if (hasSelection) {
		return settings;
	}

	return { ...settings, selectedEndpointId: settings.endpoints[0].id };
}

export function createConversation(title = 'New chat'): Conversation {
	const now = Date.now();
	return {
		id: crypto.randomUUID(),
		title,
		createdAt: now,
		updatedAt: now,
		messages: []
	};
}
