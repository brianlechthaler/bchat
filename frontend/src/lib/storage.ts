import { browser } from '$app/environment';
import type { AppSettings, Conversation } from './types';
import { createDefaultSettings, normalizeAppSettings } from './types';

const SETTINGS_KEY = 'bchat.settings';
const HISTORY_KEY = 'bchat.history';
const ACTIVE_ID_KEY = 'bchat.activeId';

function readJson<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return { ...fallback, ...JSON.parse(raw) } as T;
	} catch {
		return fallback;
	}
}

function writeJson<T>(key: string, value: T): void {
	if (!browser) return;
	localStorage.setItem(key, JSON.stringify(value));
}

export function loadSettings(): AppSettings {
	return normalizeAppSettings(readJson(SETTINGS_KEY, createDefaultSettings()));
}

export function saveSettings(settings: AppSettings): void {
	writeJson(SETTINGS_KEY, normalizeAppSettings(settings));
}

export function loadHistory(): Conversation[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as Conversation[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveHistory(conversations: Conversation[]): void {
	writeJson(HISTORY_KEY, conversations);
}

export function loadActiveId(): string {
	if (!browser) return '';
	try {
		return localStorage.getItem(ACTIVE_ID_KEY) ?? '';
	} catch {
		return '';
	}
}

export function saveActiveId(id: string): void {
	if (!browser) return;
	if (!id) {
		localStorage.removeItem(ACTIVE_ID_KEY);
		return;
	}
	localStorage.setItem(ACTIVE_ID_KEY, id);
}

export function applyTheme(darkMode: boolean): void {
	if (!browser) return;
	document.documentElement.classList.toggle('dark', darkMode);
}
