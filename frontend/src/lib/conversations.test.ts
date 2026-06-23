import { describe, expect, it } from 'vitest';
import {
	deleteConversation,
	ensureConversations,
	resolveActiveConversation,
	resolveActiveId,
	sortConversations
} from './conversations';
import { createConversation } from './types';

describe('conversations', () => {
	it('sorts conversations by updatedAt descending', () => {
		const older = createConversation('older');
		const newer = createConversation('newer');
		older.updatedAt = 1;
		newer.updatedAt = 2;

		expect(sortConversations([older, newer]).map((c) => c.title)).toEqual(['newer', 'older']);
	});

	it('resolves the active conversation by id', () => {
		const first = createConversation('first');
		const second = createConversation('second');

		expect(resolveActiveConversation([first, second], second.id)?.title).toBe('second');
	});

	it('falls back to the first conversation when active id is missing', () => {
		const first = createConversation('first');
		const second = createConversation('second');

		expect(resolveActiveConversation([first, second], '')?.title).toBe('first');
	});

	it('restores a stored active id when it still exists', () => {
		const first = createConversation('first');
		const second = createConversation('second');

		expect(resolveActiveId([first, second], second.id)).toBe(second.id);
	});

	it('falls back to the most recently updated conversation', () => {
		const older = createConversation('older');
		const newer = createConversation('newer');
		older.updatedAt = 1;
		newer.updatedAt = 2;

		expect(resolveActiveId([older, newer], 'missing')).toBe(newer.id);
	});

	it('creates a conversation when history is empty', () => {
		const result = ensureConversations([]);
		expect(result.conversations).toHaveLength(1);
		expect(result.activeId).toBe(result.conversations[0]?.id);
	});

	it('deletes a conversation and selects another active chat', () => {
		const first = createConversation('first');
		const second = createConversation('second');
		const result = deleteConversation([first, second], first.id);

		expect(result.conversations.map((c) => c.title)).toEqual(['second']);
		expect(result.activeId).toBeNull();
	});

	it('creates a new conversation when the last one is deleted', () => {
		const only = createConversation('only');
		const result = deleteConversation([only], only.id);

		expect(result.conversations).toHaveLength(1);
		expect(result.conversations[0]?.id).not.toBe(only.id);
		expect(result.activeId).toBe(result.conversations[0]?.id);
	});
});
