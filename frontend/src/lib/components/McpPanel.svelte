<script lang="ts">
	import type { AppSettings, McpServer, McpTool } from '$lib/types';
	import { callMcpTool, fetchMcpTools } from '$lib/api';

	interface Props {
		settings: AppSettings;
	}

	let { settings }: Props = $props();

	let toolsByServer = $state<Record<string, McpTool[]>>({});
	let loadingServerId = $state('');
	let callingTool = $state('');
	let toolResult = $state('');
	let toolError = $state('');

	async function refreshTools(server: McpServer) {
		if (!server.command.trim()) {
			toolError = `Configure command for ${server.name} in Settings`;
			return;
		}
		loadingServerId = server.id;
		toolError = '';
		try {
			const tools = await fetchMcpTools(server);
			toolsByServer = { ...toolsByServer, [server.id]: tools };
		} catch (e) {
			toolError = e instanceof Error ? e.message : 'Failed to load MCP tools';
		} finally {
			loadingServerId = '';
		}
	}

	async function runTool(server: McpServer, tool: McpTool) {
		const key = `${server.id}:${tool.name}`;
		callingTool = key;
		toolError = '';
		toolResult = '';
		try {
			const raw = window.prompt(`Arguments JSON for ${tool.name}`, '{}') ?? '{}';
			const args = JSON.parse(raw) as Record<string, unknown>;
			const result = await callMcpTool(server, tool.name, args);
			toolResult = JSON.stringify(result, null, 2);
		} catch (e) {
			toolError = e instanceof Error ? e.message : 'MCP tool call failed';
		} finally {
			callingTool = '';
		}
	}
</script>

<section class="mcp-panel">
	<div class="mcp-panel-header">
		<strong>MCP</strong>
	</div>

	{#if settings.mcpServers.length === 0}
		<p class="mcp-empty">Add MCP servers in Settings to list and run tools.</p>
	{:else}
		{#each settings.mcpServers as server (server.id)}
			<div class="mcp-server-card">
				<div class="mcp-server-header">
					<span>{server.name}</span>
					<button
						type="button"
						class="ghost-btn"
						disabled={loadingServerId === server.id}
						onclick={() => refreshTools(server)}
					>
						{loadingServerId === server.id ? 'Loading…' : 'Tools'}
					</button>
				</div>
				{#if toolsByServer[server.id]?.length}
					<ul class="mcp-tool-list">
						{#each toolsByServer[server.id] as tool (tool.name)}
							<li>
								<button
									type="button"
									class="ghost-btn mcp-tool-btn"
									disabled={callingTool === `${server.id}:${tool.name}`}
									onclick={() => runTool(server, tool)}
								>
									{tool.name}
								</button>
								{#if tool.description}
									<div class="mcp-tool-desc">{tool.description}</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	{/if}

	{#if toolError}
		<div class="mcp-error">{toolError}</div>
	{/if}
	{#if toolResult}
		<pre class="mcp-result">{toolResult}</pre>
	{/if}
</section>
