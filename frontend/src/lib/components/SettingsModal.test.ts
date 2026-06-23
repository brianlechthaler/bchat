import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal.svelte';
import { DEFAULT_SETTINGS } from '../types';

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
});
