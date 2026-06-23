import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../routes/+page.svelte';

vi.mock('$lib/api', () => ({
	fetchModels: vi.fn().mockResolvedValue(['llama3']),
	streamChat: vi.fn()
}));

describe('page settings', () => {
	afterEach(() => cleanup());

	beforeEach(() => {
		localStorage.clear();
	});

	it('opens the settings modal when Settings is clicked', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
	});

	it('closes the settings modal when Cancel is clicked', async () => {
		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('adds an MCP server row from settings', async () => {
		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Add server' }));

		expect(screen.getByDisplayValue('MCP 1')).toBeInTheDocument();
	});
});
