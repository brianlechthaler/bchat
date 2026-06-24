import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
	loadSettings,
	saveSettings,
	applyTheme,
	loadHistory,
	saveHistory,
	loadActiveId,
	saveActiveId
} from './storage';
import { DEFAULT_SETTINGS, createConversation, createEndpoint } from './types';

describe('storage', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});

	it('loads default settings when storage is empty', () => {
		expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
	});

	it('persists and reloads settings', () => {
		const custom = { ...DEFAULT_SETTINGS, model: 'llama3', darkMode: false };
		saveSettings(custom);
		expect(loadSettings().model).toBe('llama3');
		expect(loadSettings().darkMode).toBe(false);
	});

	it('applies dark theme class', () => {
		applyTheme(true);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		applyTheme(false);
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('persists chat history', () => {
		const chat = createConversation('Saved');
		saveHistory([chat]);
		expect(loadHistory()[0]?.title).toBe('Saved');
	});

	it('persists and reloads the active conversation id', () => {
		saveActiveId('chat-123');
		expect(loadActiveId()).toBe('chat-123');
	});

	it('clears the active conversation id when empty', () => {
		saveActiveId('chat-123');
		saveActiveId('');
		expect(loadActiveId()).toBe('');
	});

	it('returns empty history for invalid stored data', () => {
		localStorage.setItem('bchat.history', 'not-json');
		expect(loadHistory()).toEqual([]);
	});

	it('returns fallback settings when stored json is invalid', () => {
		localStorage.setItem('bchat.settings', '{bad');
		expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
	});

	it('normalizes openai endpoint selection when loading persisted settings', () => {
		const endpoint = createEndpoint('Remote');
		const stored = {
			...DEFAULT_SETTINGS,
			provider: 'openai' as const,
			endpoints: [endpoint],
			selectedEndpointId: ''
		};
		localStorage.setItem('bchat.settings', JSON.stringify(stored));
		expect(loadSettings().selectedEndpointId).toBe(endpoint.id);
	});

	it('overrides stale ollama localStorage when compose env defaults are set', () => {
		vi.stubEnv('VITE_DEFAULT_PROVIDER', 'openai');
		vi.stubEnv('VITE_DEFAULT_OPENAI_NAME', 'vLLM');
		vi.stubEnv('VITE_DEFAULT_OPENAI_BASE_URL', 'http://vllm:8000/v1');
		vi.stubEnv('VITE_DEFAULT_OPENAI_API_KEY', 'EMPTY');
		vi.stubEnv('VITE_DEFAULT_MODEL', 'Qwen/Qwen2.5-0.5B-Instruct');

		localStorage.setItem(
			'bchat.settings',
			JSON.stringify({ ...DEFAULT_SETTINGS, provider: 'ollama', model: 'llama3' })
		);

		const settings = loadSettings();
		expect(settings.provider).toBe('openai');
		expect(settings.model).toBe('Qwen/Qwen2.5-0.5B-Instruct');
		expect(settings.endpoints[0]?.baseUrl).toBe('http://vllm:8000/v1');
		expect(JSON.parse(localStorage.getItem('bchat.settings') ?? '{}').provider).toBe('openai');

		vi.unstubAllEnvs();
	});
});
