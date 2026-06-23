import { describe, expect, it, beforeEach } from 'vitest';
import { loadSettings, saveSettings, applyTheme, loadHistory, saveHistory } from './storage';
import { DEFAULT_SETTINGS, createConversation } from './types';

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

	it('returns empty history for invalid stored data', () => {
		localStorage.setItem('bchat.history', 'not-json');
		expect(loadHistory()).toEqual([]);
	});

	it('returns fallback settings when stored json is invalid', () => {
		localStorage.setItem('bchat.settings', '{bad');
		expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
	});
});
