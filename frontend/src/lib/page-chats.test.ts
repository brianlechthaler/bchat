import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../routes/+page.svelte';
import { createConversation } from '$lib/types';
import { loadActiveId, loadHistory } from '$lib/storage';

vi.mock('$lib/api', () => ({
	fetchModels: vi.fn().mockResolvedValue(['llama3']),
	streamChat: vi.fn()
}));

describe('page chats', () => {
	afterEach(() => cleanup());

	beforeEach(() => {
		localStorage.clear();
	});

	it('starts a new chat from the sidebar button', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'New' }));

		expect(screen.getAllByRole('button', { name: 'New chat' }).length).toBeGreaterThan(0);
	});

	it('restores multiple saved conversations and the active chat', async () => {
		const first = createConversation('First chat');
		const second = createConversation('Second chat');
		localStorage.setItem('bchat.history', JSON.stringify([first, second]));
		localStorage.setItem('bchat.activeId', second.id);

		render(Page);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Second chat' })).toBeInTheDocument();
		});

		expect(screen.getByRole('button', { name: 'First chat' })).toBeInTheDocument();
		expect(loadActiveId()).toBe(second.id);
		expect(loadHistory()).toHaveLength(2);
	});

	it('switches the active conversation from the sidebar', async () => {
		const first = createConversation('First chat');
		const second = createConversation('Second chat');
		localStorage.setItem('bchat.history', JSON.stringify([first, second]));

		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: 'Second chat' }));

		expect(loadActiveId()).toBe(second.id);
	});
});
