import { applyTheme, loadSettings } from '$lib/storage';

export function load() {
	const settings = loadSettings();
	applyTheme(settings.darkMode);
	return { settings };
}
