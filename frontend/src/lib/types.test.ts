import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	DEFAULT_SYSTEM_PROMPT,
	createConversation,
	createEndpoint,
	effectiveSystemPrompt,
	normalizeAppSettings
} from './types';

describe('types', () => {
	it('creates default settings with ollama provider', () => {
		expect(DEFAULT_SETTINGS.provider).toBe('ollama');
		expect(DEFAULT_SETTINGS.ollamaUrl).toContain('11434');
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
