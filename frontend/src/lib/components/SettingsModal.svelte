<script lang="ts">
	import type { AppSettings } from '$lib/types';

	interface Props {
		initialDraft: AppSettings;
		models: string[];
		onSave: (settings: AppSettings) => void;
		onClose: () => void;
		onAddEndpoint: () => void;
		onDeleteEndpoint: (id: string) => void;
		onRefreshModels: () => Promise<void>;
	}

	let {
		initialDraft,
		models,
		onSave,
		onClose,
		onAddEndpoint,
		onDeleteEndpoint,
		onRefreshModels
	}: Props = $props();

	let draft = $state<AppSettings>({
		provider: 'ollama',
		ollamaUrl: '',
		model: '',
		selectedEndpointId: '',
		endpoints: [],
		llm: { temperature: 0.7, maxTokens: 2048, topP: 1, systemPrompt: '' },
		darkMode: true
	});

	$effect.pre(() => {
		draft = $state.snapshot(initialDraft);
	});

	function save() {
		onSave(draft);
	}
</script>

<div
	class="modal-backdrop"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
		<h2 id="settings-title">Settings</h2>

		<div class="form-grid">
			<label>
				Provider
				<select bind:value={draft.provider}>
					<option value="ollama">Ollama (local)</option>
					<option value="openai">OpenAI-compatible</option>
				</select>
			</label>

			{#if draft.provider === 'ollama'}
				<label>
					Ollama URL
					<input bind:value={draft.ollamaUrl} placeholder="http://localhost:11434" />
				</label>
			{:else}
				<div style="display: grid; gap: 0.75rem;">
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<strong>API Endpoints</strong>
						<button type="button" class="ghost-btn" onclick={onAddEndpoint}>Add endpoint</button>
					</div>
					{#each draft.endpoints as endpoint (endpoint.id)}
						<div class="endpoint-card">
							<label>
								Name
								<input bind:value={endpoint.name} />
							</label>
							<label>
								Base URL
								<input bind:value={endpoint.baseUrl} />
							</label>
							<label>
								API key
								<input type="password" bind:value={endpoint.apiKey} autocomplete="off" />
							</label>
							<div style="display: flex; gap: 0.5rem;">
								<button
									type="button"
									class="ghost-btn"
									onclick={() => (draft.selectedEndpointId = endpoint.id)}
								>
									{draft.selectedEndpointId === endpoint.id ? 'Selected' : 'Select'}
								</button>
								<button
									type="button"
									class="ghost-btn"
									onclick={() => onDeleteEndpoint(endpoint.id)}
								>
									Remove
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<label>
				Model
				<div style="display: flex; gap: 0.5rem;">
					<select bind:value={draft.model} style="flex: 1;">
						<option value="">Select a model</option>
						{#each models as model (model)}
							<option value={model}>{model}</option>
						{/each}
					</select>
					<button type="button" class="ghost-btn" onclick={() => onRefreshModels()}>Refresh</button>
				</div>
			</label>

			<label>
				System prompt
				<textarea bind:value={draft.llm.systemPrompt} rows="3"></textarea>
			</label>

			<label>
				Temperature ({draft.llm.temperature})
				<input type="range" min="0" max="2" step="0.1" bind:value={draft.llm.temperature} />
			</label>

			<label>
				Max tokens
				<input type="number" min="1" max="128000" bind:value={draft.llm.maxTokens} />
			</label>

			<label>
				Top P ({draft.llm.topP})
				<input type="range" min="0" max="1" step="0.05" bind:value={draft.llm.topP} />
			</label>

			<label style="display: flex; align-items: center; gap: 0.5rem;">
				<input type="checkbox" bind:checked={draft.darkMode} />
				Dark mode
			</label>
		</div>

		<div class="modal-actions">
			<button type="button" class="ghost-btn" onclick={onClose}>Cancel</button>
			<button type="button" class="primary-btn" onclick={save}>Save</button>
		</div>
	</div>
</div>
