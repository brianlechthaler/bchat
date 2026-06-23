import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import McpPanel from './McpPanel.svelte';
import { DEFAULT_SETTINGS, createMcpServer } from '../types';

vi.mock('$lib/api', () => ({
	fetchMcpTools: vi.fn(),
	callMcpTool: vi.fn()
}));

import { fetchMcpTools } from '$lib/api';

describe('McpPanel', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('prompts users to configure MCP servers when none exist', () => {
		render(McpPanel, { props: { settings: DEFAULT_SETTINGS } });
		expect(screen.getByText(/Add MCP servers in Settings/i)).toBeInTheDocument();
	});

	it('loads and displays tools for a configured server', async () => {
		const server = createMcpServer('Mock');
		server.command = 'python3';
		vi.mocked(fetchMcpTools).mockResolvedValue([
			{ name: 'echo', description: 'Echo text', input_schema: {} }
		]);

		render(McpPanel, {
			props: {
				settings: { ...DEFAULT_SETTINGS, mcpServers: [server] }
			}
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
		expect(fetchMcpTools).toHaveBeenCalled();
		expect(await screen.findByRole('button', { name: 'echo' })).toBeInTheDocument();
	});

	it('shows an error when refreshing tools without a command', async () => {
		const server = createMcpServer('Mock');
		render(McpPanel, {
			props: {
				settings: { ...DEFAULT_SETTINGS, mcpServers: [server] }
			}
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
		expect(screen.getByText(/Configure command for Mock/i)).toBeInTheDocument();
	});
});
