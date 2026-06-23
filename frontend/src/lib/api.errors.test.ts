import { describe, expect, it, vi } from 'vitest';
import { fetchModels } from './api';
import { DEFAULT_SETTINGS } from './types';

describe('api error handling', () => {
	it('uses status text when error json is unavailable', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('nope', { status: 500, statusText: 'Server Error' })
		);

		await expect(fetchModels(DEFAULT_SETTINGS)).rejects.toThrow('Server Error');
	});
});
