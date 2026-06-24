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

export interface McpServer {
	id: string;
	name: string;
	command: string;
	args: string[];
}

export interface McpTool {
	name: string;
	description?: string;
	input_schema: Record<string, unknown>;
}

export interface AppSettings {
	provider: Provider;
	ollamaUrl: string;
	model: string;
	selectedEndpointId: string;
	endpoints: OpenAiEndpoint[];
	mcpServers: McpServer[];
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
	tokens_per_second?: number;
}

export const DEFAULT_SYSTEM_PROMPT = '';

const BASE_DEFAULT_SETTINGS: AppSettings = {
	provider: 'ollama',
	ollamaUrl: 'http://localhost:11434',
	model: '',
	selectedEndpointId: '',
	endpoints: [],
	mcpServers: [],
	llm: {
		temperature: 0.7,
		maxTokens: 2048,
		topP: 1,
		systemPrompt: DEFAULT_SYSTEM_PROMPT
	},
	darkMode: true
};

function readEnvProvider(): Provider | undefined {
	const value = import.meta.env.VITE_DEFAULT_PROVIDER;
	if (value === 'ollama' || value === 'openai') {
		return value;
	}
	return undefined;
}

/** Defaults for first-run settings; honors VITE_* env vars from Docker Compose. */
export function createDefaultSettings(): AppSettings {
	const settings: AppSettings = {
		...BASE_DEFAULT_SETTINGS,
		llm: { ...BASE_DEFAULT_SETTINGS.llm }
	};

	const provider = readEnvProvider();
	if (provider) {
		settings.provider = provider;
	}

	const model = import.meta.env.VITE_DEFAULT_MODEL;
	if (typeof model === 'string' && model.trim() !== '') {
		settings.model = model;
	}

	const baseUrl = import.meta.env.VITE_DEFAULT_OPENAI_BASE_URL;
	if (settings.provider === 'openai' && typeof baseUrl === 'string' && baseUrl.trim() !== '') {
		const endpoint = createEndpoint(
			typeof import.meta.env.VITE_DEFAULT_OPENAI_NAME === 'string' &&
				import.meta.env.VITE_DEFAULT_OPENAI_NAME.trim() !== ''
				? import.meta.env.VITE_DEFAULT_OPENAI_NAME
				: 'OpenAI-compatible'
		);
		endpoint.baseUrl = baseUrl;
		const apiKey = import.meta.env.VITE_DEFAULT_OPENAI_API_KEY;
		endpoint.apiKey = typeof apiKey === 'string' ? apiKey : '';
		settings.endpoints = [endpoint];
		settings.selectedEndpointId = endpoint.id;
	}

	return settings;
}

export const DEFAULT_SETTINGS: AppSettings = createDefaultSettings();

export function effectiveSystemPrompt(prompt: string): string {
	return prompt.trim() === '' ? DEFAULT_SYSTEM_PROMPT : prompt;
}

export function createMcpServer(name = 'MCP Server'): McpServer {
	return {
		id: crypto.randomUUID(),
		name,
		command: '',
		args: []
	};
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
	const withDefaults: AppSettings = {
		...settings,
		mcpServers: settings.mcpServers ?? []
	};

	if (withDefaults.provider !== 'openai' || withDefaults.endpoints.length === 0) {
		return withDefaults;
	}

	const hasSelection = withDefaults.endpoints.some((e) => e.id === withDefaults.selectedEndpointId);
	if (hasSelection) {
		return withDefaults;
	}

	return { ...withDefaults, selectedEndpointId: withDefaults.endpoints[0].id };
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
