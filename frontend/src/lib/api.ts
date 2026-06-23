import type { AppSettings, ChatMessage, McpServer, McpTool, StreamChunk } from './types';

interface ChatRequestBody {
	provider: string;
	model: string;
	messages: ChatMessage[];
	settings: {
		temperature: number;
		max_tokens: number;
		top_p: number;
		system_prompt: string;
	};
	ollama_url: string;
	openai?: {
		id: string;
		name: string;
		base_url: string;
		api_key: string;
	};
}

function selectedEndpoint(settings: AppSettings) {
	return settings.endpoints.find((e) => e.id === settings.selectedEndpointId);
}

function buildChatBody(settings: AppSettings, messages: ChatMessage[]): ChatRequestBody {
	const endpoint = selectedEndpoint(settings);
	const body: ChatRequestBody = {
		provider: settings.provider,
		model: settings.model,
		messages,
		settings: {
			temperature: settings.llm.temperature,
			max_tokens: settings.llm.maxTokens,
			top_p: settings.llm.topP,
			system_prompt: settings.llm.systemPrompt
		},
		ollama_url: settings.ollamaUrl
	};

	if (settings.provider === 'openai' && endpoint) {
		body.openai = {
			id: endpoint.id,
			name: endpoint.name,
			base_url: endpoint.baseUrl,
			api_key: endpoint.apiKey
		};
	}

	return body;
}

export async function fetchModels(settings: AppSettings): Promise<string[]> {
	const endpoint = selectedEndpoint(settings);
	const params = new URLSearchParams({
		provider: settings.provider,
		ollama_url: settings.ollamaUrl
	});

	const response = await fetch(`/api/models?${params.toString()}`, {
		method: settings.provider === 'openai' && endpoint ? 'POST' : 'GET',
		headers:
			settings.provider === 'openai' && endpoint
				? { 'Content-Type': 'application/json' }
				: undefined,
		body:
			settings.provider === 'openai' && endpoint
				? JSON.stringify({
						provider: settings.provider,
						ollama_url: settings.ollamaUrl,
						openai: {
							id: endpoint.id,
							name: endpoint.name,
							base_url: endpoint.baseUrl,
							api_key: endpoint.apiKey
						}
					})
				: undefined
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error(err.error ?? 'Failed to load models');
	}

	const data = (await response.json()) as { models: { id: string }[] };
	return data.models.map((m) => m.id);
}

export async function* streamChat(
	settings: AppSettings,
	messages: ChatMessage[],
	signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
	const response = await fetch('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(buildChatBody(settings, messages)),
		signal
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error(err.error ?? 'Chat request failed');
	}

	if (!response.body) {
		throw new Error('No response body');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split('\n\n');
		buffer = parts.pop() ?? '';

		for (const part of parts) {
			for (const line of part.split('\n')) {
				if (!line.startsWith('data:')) continue;
				const data = line.slice(5).trim();
				if (!data) continue;
				const chunk = JSON.parse(data) as StreamChunk;
				yield chunk;
				if (chunk.done) return;
			}
		}
	}
}

function buildMcpServerBody(server: McpServer) {
	return {
		id: server.id,
		name: server.name,
		command: server.command,
		args: server.args
	};
}

export async function fetchMcpTools(server: McpServer): Promise<McpTool[]> {
	const response = await fetch('/api/mcp/tools', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ server: buildMcpServerBody(server) })
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error(err.error ?? 'Failed to list MCP tools');
	}

	const data = (await response.json()) as { tools: McpTool[] };
	return data.tools;
}

export async function callMcpTool(
	server: McpServer,
	tool: string,
	arguments_: Record<string, unknown>
): Promise<unknown> {
	const response = await fetch('/api/mcp/call', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			server: buildMcpServerBody(server),
			tool,
			arguments: arguments_
		})
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error(err.error ?? 'MCP tool call failed');
	}

	const data = (await response.json()) as { result: unknown };
	return data.result;
}
