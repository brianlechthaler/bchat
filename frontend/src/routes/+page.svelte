<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import {
		applyTheme,
		loadActiveId,
		loadHistory,
		loadSettings,
		saveActiveId,
		saveHistory,
		saveSettings
	} from '$lib/storage';
	import {
		createConversation,
		createEndpoint,
		type AppSettings,
		type Conversation
	} from '$lib/types';
	import {
		deleteConversation,
		ensureConversations,
		resolveActiveConversation,
		resolveActiveId,
		sortConversations
	} from '$lib/conversations';
	import { fetchModels, streamChat } from '$lib/api';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	let settings = $state<AppSettings>(loadSettings());
	let settingsDraft = $state<AppSettings>(loadSettings());
	let conversations = $state<Conversation[]>(loadHistory());
	let activeId = $state(loadActiveId());
	let input = $state('');
	let streaming = $state(false);
	let error = $state('');
	let showSettings = $state(false);
	let models = $state<string[]>([]);
	let abortController: AbortController | null = null;

	const sortedConversations = $derived(sortConversations(conversations));

	const activeConversation = $derived(resolveActiveConversation(conversations, activeId));

	onMount(() => {
		let needsPersist = false;
		if (conversations.length === 0) {
			const ensured = ensureConversations([]);
			conversations = ensured.conversations;
			activeId = ensured.activeId;
			needsPersist = true;
		} else {
			activeId = resolveActiveId(conversations, activeId);
		}
		saveActiveId(activeId);
		applyTheme(settings.darkMode);
		void refreshModels();
		if (needsPersist) {
			persistHistory();
		}
	});

	function persistActiveId() {
		saveActiveId(activeId);
	}

	function persistSettings() {
		saveSettings(settings);
		applyTheme(settings.darkMode);
	}

	function persistHistory() {
		saveHistory(conversations);
	}

	function updateConversation(updated: Conversation) {
		conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
		persistHistory();
	}

	function newChat() {
		if (streaming) stopStreaming();
		const chat = createConversation();
		conversations = [chat, ...conversations];
		activeId = chat.id;
		error = '';
		persistHistory();
		persistActiveId();
	}

	function selectChat(id: string) {
		if (id === activeId) return;
		if (streaming) stopStreaming();
		activeId = id;
		error = '';
		persistActiveId();
	}

	function deleteChat(id: string) {
		if (streaming && activeId === id) stopStreaming();
		const result = deleteConversation(conversations, id);
		conversations = result.conversations;
		if (result.activeId) {
			activeId = result.activeId;
		} else if (activeId === id) {
			activeId = conversations[0]?.id ?? '';
		}
		persistHistory();
		persistActiveId();
	}

	async function refreshModels() {
		try {
			models = await fetchModels(settings);
			if (!settings.model && models.length > 0) {
				settings = { ...settings, model: models[0] };
				persistSettings();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load models';
		}
	}

	function openSettings() {
		settingsDraft = $state.snapshot(settings);
		showSettings = true;
	}

	async function onSettingsSave(next: AppSettings) {
		settings = next;
		persistSettings();
		showSettings = false;
		await refreshModels();
	}

	function stopStreaming() {
		abortController?.abort();
		abortController = null;
		streaming = false;
	}

	async function sendMessage() {
		const text = input.trim();
		if (!text || streaming || !activeConversation) return;
		if (!settings.model) {
			error = 'Select a model in settings';
			openSettings();
			return;
		}

		error = '';
		input = '';
		streaming = true;
		abortController = new AbortController();

		const userMessage = { role: 'user' as const, content: text };
		let conversation: Conversation = {
			...activeConversation,
			title:
				activeConversation.messages.length === 0 ? text.slice(0, 40) : activeConversation.title,
			updatedAt: Date.now(),
			messages: [...activeConversation.messages, userMessage]
		};
		updateConversation(conversation);

		const assistantMessage = { role: 'assistant' as const, content: '' };
		conversation = {
			...conversation,
			messages: [...conversation.messages, assistantMessage]
		};
		updateConversation(conversation);

		try {
			for await (const chunk of streamChat(
				settings,
				conversation.messages.slice(0, -1),
				abortController.signal
			)) {
				assistantMessage.content += chunk.content;
				conversation = {
					...conversation,
					updatedAt: Date.now(),
					messages: [...conversation.messages.slice(0, -1), { ...assistantMessage }]
				};
				updateConversation(conversation);
				if (chunk.done) break;
			}
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				error = e instanceof Error ? e.message : 'Chat failed';
			}
		} finally {
			streaming = false;
			abortController = null;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void sendMessage();
		}
	}
</script>

<div class="app-shell">
	<aside class="sidebar">
		<div class="sidebar-header">
			<div class="brand">bchat</div>
			<button class="primary-btn" onclick={newChat}>New</button>
		</div>
		<div class="conversation-list">
			{#each sortedConversations as conversation (conversation.id)}
				<div class="conversation-item" class:active={conversation.id === activeId}>
					<button class="conversation-select" onclick={() => selectChat(conversation.id)}>
						{conversation.title}
					</button>
					<button
						class="ghost-btn conversation-delete"
						aria-label="Delete chat"
						onclick={() => deleteChat(conversation.id)}
					>
						×
					</button>
				</div>
			{/each}
		</div>
	</aside>

	<main class="chat-main">
		<header class="chat-header">
			<div>
				<strong>{activeConversation?.title ?? 'Chat'}</strong>
				<div style="color: var(--text-muted); font-size: 0.85rem;">
					{settings.provider === 'ollama' ? 'Ollama' : 'OpenAI-compatible'} · {settings.model ||
						'no model'}
				</div>
			</div>
			<div style="display: flex; gap: 0.5rem;">
				<button class="ghost-btn" onclick={openSettings}>Settings</button>
				<button
					class="ghost-btn"
					onclick={() => {
						settings = { ...settings, darkMode: !settings.darkMode };
						persistSettings();
					}}
				>
					{settings.darkMode ? 'Light' : 'Dark'}
				</button>
			</div>
		</header>

		{#if error}
			<div class="error-banner">{error}</div>
		{/if}

		<section class="messages">
			{#if !activeConversation?.messages.length}
				<div class="empty-state">
					<h2>Start a conversation</h2>
					<p>Chat with your local Ollama instance or an OpenAI-compatible API.</p>
				</div>
			{:else}
				{#each activeConversation.messages as message, index (index)}
					<div class="message {message.role}">{message.content || '…'}</div>
				{/each}
			{/if}
		</section>

		<footer class="composer">
			<div class="composer-inner">
				<textarea
					bind:value={input}
					placeholder="Message the model…"
					onkeydown={onKeydown}
					disabled={streaming}
				></textarea>
				{#if streaming}
					<button class="ghost-btn" onclick={stopStreaming}>Stop</button>
				{:else}
					<button class="primary-btn" onclick={sendMessage} disabled={!input.trim()}>Send</button>
				{/if}
			</div>
		</footer>
	</main>
</div>

{#if showSettings}
	{#key `${settingsDraft.endpoints.length}:${settingsDraft.provider}:${settingsDraft.selectedEndpointId}`}
		<SettingsModal
			initialDraft={$state.snapshot(settingsDraft)}
			{models}
			onSave={onSettingsSave}
			onClose={() => (showSettings = false)}
			onAddEndpoint={() => {
				settingsDraft = {
					...settingsDraft,
					endpoints: [
						...settingsDraft.endpoints,
						createEndpoint(`Endpoint ${settingsDraft.endpoints.length + 1}`)
					]
				};
			}}
			onDeleteEndpoint={(id) => {
				settingsDraft = {
					...settingsDraft,
					endpoints: settingsDraft.endpoints.filter((e) => e.id !== id),
					selectedEndpointId:
						settingsDraft.selectedEndpointId === id ? '' : settingsDraft.selectedEndpointId
				};
			}}
			onRefreshModels={refreshModels}
		/>
	{/key}
{/if}
