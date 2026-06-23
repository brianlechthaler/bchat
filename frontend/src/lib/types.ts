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
		systemPrompt: ''
	},
	darkMode: true
};

export function createEndpoint(name = 'OpenAI'): OpenAiEndpoint {
	return {
		id: crypto.randomUUID(),
		name,
		baseUrl: 'https://api.openai.com/v1',
		apiKey: ''
	};
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
