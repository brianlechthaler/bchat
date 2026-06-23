import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchModels, streamChat } from './api';
import { DEFAULT_SETTINGS } from './types';

describe('api', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('fetchModels returns model ids for ollama', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ models: [{ id: 'llama3' }, { id: 'mistral' }] }), {
				status: 200
			})
		);

		const models = await fetchModels(DEFAULT_SETTINGS);
		expect(models).toEqual(['llama3', 'mistral']);
	});

	it('fetchModels throws on error response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ error: 'upstream down' }), { status: 502 })
		);

		await expect(fetchModels(DEFAULT_SETTINGS)).rejects.toThrow('upstream down');
	});

	it('streamChat yields parsed chunks', async () => {
		const body = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('data: {"content":"hello","done":false}\n\n'));
				controller.enqueue(new TextEncoder().encode('data: {"content":"","done":true}\n\n'));
				controller.close();
			}
		});

		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200 }));

		const chunks = [];
		for await (const chunk of streamChat(DEFAULT_SETTINGS, [{ role: 'user', content: 'hi' }])) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual([
			{ content: 'hello', done: false },
			{ content: '', done: true }
		]);
	});

	it('streamChat throws when response is not ok', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ error: 'bad request' }), { status: 400 })
		);

		const iterator = streamChat(DEFAULT_SETTINGS, [{ role: 'user', content: 'hi' }]);
		await expect(iterator.next()).rejects.toThrow('bad request');
	});

	it('fetchModels uses POST for openai provider', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				new Response(JSON.stringify({ models: [{ id: 'gpt-4o' }] }), { status: 200 })
			);

		const settings = {
			...DEFAULT_SETTINGS,
			provider: 'openai' as const,
			selectedEndpointId: 'e1',
			endpoints: [
				{
					id: 'e1',
					name: 'OpenAI',
					baseUrl: 'https://api.openai.com/v1',
					apiKey: 'secret'
				}
			]
		};

		const models = await fetchModels(settings);
		expect(models).toEqual(['gpt-4o']);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/models'),
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('streamChat throws when body is missing', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

		const iterator = streamChat(DEFAULT_SETTINGS, [{ role: 'user', content: 'hi' }]);
		await expect(iterator.next()).rejects.toThrow('No response body');
	});

	it('streamChat sends openai endpoint configuration', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
			const body = JSON.parse(String(init?.body)) as { openai?: { api_key: string } };
			expect(body.openai?.api_key).toBe('secret');
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('data: {"content":"ok","done":true}\n\n'));
					controller.close();
				}
			});
			return new Response(stream, { status: 200 });
		});

		const settings = {
			...DEFAULT_SETTINGS,
			provider: 'openai' as const,
			selectedEndpointId: 'e1',
			endpoints: [
				{
					id: 'e1',
					name: 'OpenAI',
					baseUrl: 'https://api.openai.com/v1',
					apiKey: 'secret'
				}
			]
		};

		const chunks = [];
		for await (const chunk of streamChat(settings, [{ role: 'user', content: 'hi' }])) {
			chunks.push(chunk);
		}
		expect(chunks.length).toBeGreaterThan(0);
		expect(fetchMock).toHaveBeenCalled();
	});
});
