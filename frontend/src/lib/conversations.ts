import type { Conversation } from './types';
import { createConversation } from './types';

export function sortConversations(conversations: Conversation[]): Conversation[] {
	return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function resolveActiveConversation(
	conversations: Conversation[],
	activeId: string
): Conversation | undefined {
	if (conversations.length === 0) return undefined;
	return conversations.find((c) => c.id === activeId) ?? conversations[0];
}

export function resolveActiveId(conversations: Conversation[], storedActiveId: string): string {
	if (conversations.length === 0) return '';
	if (storedActiveId && conversations.some((c) => c.id === storedActiveId)) {
		return storedActiveId;
	}
	return sortConversations(conversations)[0]?.id ?? '';
}

export function ensureConversations(conversations: Conversation[]): {
	conversations: Conversation[];
	activeId: string;
} {
	if (conversations.length > 0) {
		return { conversations, activeId: '' };
	}
	const chat = createConversation();
	return { conversations: [chat], activeId: chat.id };
}

export function deleteConversation(
	conversations: Conversation[],
	id: string
): { conversations: Conversation[]; activeId: string | null } {
	const remaining = conversations.filter((c) => c.id !== id);
	if (remaining.length === 0) {
		const chat = createConversation();
		return { conversations: [chat], activeId: chat.id };
	}
	return { conversations: remaining, activeId: null };
}
