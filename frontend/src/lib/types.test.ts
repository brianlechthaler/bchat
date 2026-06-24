import { describe, expect, it, vi } from 'vitest';
import {
	createDefaultSettings,
	DEFAULT_SETTINGS,
	DEFAULT_SYSTEM_PROMPT,
	applyComposeDefaults,
	createConversation,
	createEndpoint,
	createMcpServer,
	effectiveSystemPrompt,
	normalizeAppSettings,
	type AppSettings,
	type McpServer
} from './types';

describe('types', () => {
	it('creates default settings with ollama provider', () => {
		expect(DEFAULT_SETTINGS.provider).toBe('ollama');
		expect(DEFAULT_SETTINGS.ollamaUrl).toContain('11434');
	});

	it('creates docker defaults for vllm when env vars are set', () => {
		vi.stubEnv('VITE_DEFAULT_PROVIDER', 'openai');
		vi.stubEnv('VITE_DEFAULT_OPENAI_NAME', 'vLLM');
		vi.stubEnv('VITE_DEFAULT_OPENAI_BASE_URL', 'http://vllm:8000/v1');
		vi.stubEnv('VITE_DEFAULT_OPENAI_API_KEY', 'EMPTY');
		vi.stubEnv('VITE_DEFAULT_MODEL', 'Qwen/Qwen2.5-0.5B-Instruct');

		const settings = createDefaultSettings();
		expect(settings.provider).toBe('openai');
		expect(settings.model).toBe('Qwen/Qwen2.5-0.5B-Instruct');
		expect(settings.endpoints).toHaveLength(1);
		expect(settings.endpoints[0]?.name).toBe('vLLM');
		expect(settings.endpoints[0]?.baseUrl).toBe('http://vllm:8000/v1');
		expect(settings.endpoints[0]?.apiKey).toBe('EMPTY');
		expect(settings.selectedEndpointId).toBe(settings.endpoints[0]?.id);

		vi.unstubAllEnvs();
	});

	it('creates a conversation with empty messages', () => {
		const chat = createConversation('Test');
		expect(chat.title).toBe('Test');
		expect(chat.messages).toEqual([]);
	});

	it('creates an openai endpoint with default base url', () => {
		const endpoint = createEndpoint('My API');
		expect(endpoint.name).toBe('My API');
		expect(endpoint.baseUrl).toContain('openai.com');
	});

	it('creates an MCP server config', () => {
		const server = createMcpServer('Filesystem');
		expect(server.name).toBe('Filesystem');
		expect(server.args).toEqual([]);
	});

	it('normalizes missing mcp servers to an empty array', () => {
		const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
		delete (settings as { mcpServers?: McpServer[] }).mcpServers;
		expect(normalizeAppSettings(settings).mcpServers).toEqual([]);
	});

	it('normalizes openai settings to select the first endpoint when none is selected', () => {
		const endpoint = createEndpoint();
		const settings = {
			...DEFAULT_SETTINGS,
			provider: 'openai' as const,
			endpoints: [endpoint],
			selectedEndpointId: ''
		};

		expect(normalizeAppSettings(settings).selectedEndpointId).toBe(endpoint.id);
	});

	it('leaves ollama settings unchanged during normalization', () => {
		expect(normalizeAppSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
	});

	it('applyComposeDefaults is a no-op without compose env vars', () => {
		const stored = { ...DEFAULT_SETTINGS, provider: 'ollama' as const };
		expect(applyComposeDefaults(stored)).toEqual(stored);
	});

	it('applyComposeDefaults overrides stale ollama localStorage when compose env is set', () => {
		vi.stubEnv('VITE_DEFAULT_PROVIDER', 'openai');
		vi.stubEnv('VITE_DEFAULT_OPENAI_NAME', 'vLLM');
		vi.stubEnv('VITE_DEFAULT_OPENAI_BASE_URL', 'http://vllm:8000/v1');
		vi.stubEnv('VITE_DEFAULT_OPENAI_API_KEY', 'EMPTY');
		vi.stubEnv('VITE_DEFAULT_MODEL', 'Qwen/Qwen2.5-0.5B-Instruct');

		const stale = { ...DEFAULT_SETTINGS, provider: 'ollama' as const, model: 'llama3' };
		const merged = applyComposeDefaults(stale);

		expect(merged.provider).toBe('openai');
		expect(merged.model).toBe('Qwen/Qwen2.5-0.5B-Instruct');
		expect(merged.endpoints[0]?.baseUrl).toBe('http://vllm:8000/v1');

		vi.unstubAllEnvs();
	});

	it('exposes the default system prompt constant', () => {
		expect(DEFAULT_SYSTEM_PROMPT).toBe('');
		expect(DEFAULT_SETTINGS.llm.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
	});

	it('resolves the effective system prompt', () => {
		expect(effectiveSystemPrompt('')).toBe(DEFAULT_SYSTEM_PROMPT);
		expect(effectiveSystemPrompt('  ')).toBe(DEFAULT_SYSTEM_PROMPT);
		expect(effectiveSystemPrompt('be helpful')).toBe('be helpful');
	});
});
