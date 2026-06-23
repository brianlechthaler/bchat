import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, createConversation, createEndpoint } from './types';

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
});
