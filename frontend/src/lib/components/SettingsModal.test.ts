import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal.svelte';
import { DEFAULT_SETTINGS, createEndpoint } from '../types';

describe('SettingsModal', () => {
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
});
