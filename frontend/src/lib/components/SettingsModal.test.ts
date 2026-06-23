import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal.svelte';
import { DEFAULT_SETTINGS, createEndpoint } from '../types';

describe('SettingsModal', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders and saves draft settings', async () => {
		const onSave = vi.fn();
		const onClose = vi.fn();

		render(SettingsModal, {
			props: {
				initialDraft: structuredClone(DEFAULT_SETTINGS),
				models: ['llama3'],
				onSave,
				onClose,
				onAddEndpoint: vi.fn(),
				onDeleteEndpoint: vi.fn(),
				onRefreshModels: vi.fn().mockResolvedValue(undefined)
			}
		});

		expect(screen.getByText('Settings')).toBeInTheDocument();
		await fireEvent.click(screen.getByText('Save'));
		expect(onSave).toHaveBeenCalled();
	});

	it('shows openai endpoint fields when provider is openai', async () => {
		const endpoint = createEndpoint('Custom API');
		endpoint.apiKey = 'test-key';

		render(SettingsModal, {
			props: {
				initialDraft: {
					...DEFAULT_SETTINGS,
					provider: 'openai',
					endpoints: [endpoint],
					selectedEndpointId: endpoint.id
				},
				models: ['gpt-4o'],
				onSave: vi.fn(),
				onClose: vi.fn(),
				onAddEndpoint: vi.fn(),
				onDeleteEndpoint: vi.fn(),
				onRefreshModels: vi.fn().mockResolvedValue(undefined)
			}
		});

		expect(screen.getByText('API Endpoints')).toBeInTheDocument();
		expect(screen.getByDisplayValue('Custom API')).toBeInTheDocument();
		expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
		expect(screen.getByLabelText(/API key/i)).toHaveValue('test-key');
	});

	it('shows current and default system prompt values', async () => {
		render(SettingsModal, {
			props: {
				initialDraft: {
					...DEFAULT_SETTINGS,
					llm: { ...DEFAULT_SETTINGS.llm, systemPrompt: 'Be concise.' }
				},
				models: ['llama3'],
				onSave: vi.fn(),
				onClose: vi.fn(),
				onAddEndpoint: vi.fn(),
				onDeleteEndpoint: vi.fn(),
				onRefreshModels: vi.fn().mockResolvedValue(undefined)
			}
		});

		const dialog = screen.getByRole('dialog');
		const preview = dialog.querySelector('[data-testid="system-prompt-preview"]');
		expect(preview).not.toBeNull();
		expect(preview).toHaveTextContent('Current:');
		expect(preview).toHaveTextContent('Be concise.');
		expect(preview).toHaveTextContent('Default:');
		expect(preview).toHaveTextContent('(empty — no system message)');

		await fireEvent.click(screen.getByText('Reset to default'));
		expect(dialog.querySelector('[data-testid="system-prompt-preview"]')).toHaveTextContent(
			'Using default (no system message sent to the model)'
		);
	});

	it('adds an MCP server row when Add server is clicked', async () => {
		render(SettingsModal, {
			props: {
				initialDraft: structuredClone(DEFAULT_SETTINGS),
				models: ['llama3'],
				onSave: vi.fn(),
				onClose: vi.fn(),
				onAddEndpoint: vi.fn(),
				onDeleteEndpoint: vi.fn(),
				onRefreshModels: vi.fn().mockResolvedValue(undefined)
			}
		});

		expect(screen.queryByLabelText(/^Name$/i)).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Add server' }));

		expect(screen.getByDisplayValue('MCP 1')).toBeInTheDocument();
	});
});
