// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AiModelCombobox, formatModelCtx, groupModelOptions, modelSupportsVision } from '@/modules/dashboard/components/settings/ai-model-combobox';

afterEach(() => {
  cleanup();
});

const OPTIONS = [
  { providerId: 'openrouter', modelName: 'dots-studio/dots-3-note-preview:free', displayName: 'Dots 3 Note', contextWindow: 512000, supportedModalities: ['text', 'image'], supportsTools: true, isDefault: true },
  { providerId: 'openrouter', modelName: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', contextWindow: 128000, supportedModalities: ['text'], supportsTools: true, isDefault: false },
  { providerId: 'gemini', modelName: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', contextWindow: 1048576, supportedModalities: ['text', 'image', 'audio', 'video'], supportsTools: true, isDefault: false },
];

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'gemini', name: 'Google Gemini' },
];

describe('formatModelCtx', () => {
  it('memadatkan konteks ke k/M', () => {
    expect(formatModelCtx(512000)).toBe('500k');
    expect(formatModelCtx(1048576)).toBe('1M');
    expect(formatModelCtx(0)).toBe('-');
  });
});

describe('modelSupportsVision', () => {
  it('benar untuk image/video saja', () => {
    expect(modelSupportsVision(['text', 'image'])).toBe(true);
    expect(modelSupportsVision(['text', 'video'])).toBe(true);
    expect(modelSupportsVision(['text', 'audio'])).toBe(false);
  });
});

describe('groupModelOptions', () => {
  it('mengelompokkan per provider dan menaruh default di depan', () => {
    const groups = groupModelOptions(OPTIONS, PROVIDERS, '');
    expect(groups.map((group) => group.label)).toEqual(['Google Gemini', 'OpenRouter']);
    const openrouter = groups.find((group) => group.value === 'openrouter');
    expect(openrouter?.items.map((item) => item.value)).toEqual(['dots-studio/dots-3-note-preview:free', 'openai/gpt-4o-mini']);
  });

  it('mempertahankan nilai di luar katalog dalam grup Lainnya', () => {
    const groups = groupModelOptions(OPTIONS, PROVIDERS, 'custom/model-x');
    const other = groups.find((group) => group.value === '');
    expect(other?.label).toBe('Lainnya');
    expect(other?.items.map((item) => item.value)).toEqual(['custom/model-x']);
  });
});

describe('AiModelCombobox', () => {
  it('memilih model dari popup grup dan melaporkan id-nya', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    render(
      <AiModelCombobox
        id="ai-model-test"
        label="Model default"
        value=""
        options={OPTIONS}
        providers={PROVIDERS}
        placeholder="Pilih model"
        ariaLabel="Model default"
        onValueChange={changed}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Google Gemini')).toBeDefined();
    await user.click(screen.getByText('GPT-4o Mini'));
    expect(changed).toHaveBeenCalledWith('openai/gpt-4o-mini');
  });

  it('menyaring daftar saat mengetik', async () => {
    const user = userEvent.setup();
    render(
      <AiModelCombobox
        id="ai-model-test"
        label="Model default"
        value=""
        options={OPTIONS}
        providers={PROVIDERS}
        placeholder="Pilih model"
        ariaLabel="Model default"
        onValueChange={() => {}}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'gemini');
    expect(await screen.findByText('Gemini 3.8 Flash')).toBeDefined();
  });
});
