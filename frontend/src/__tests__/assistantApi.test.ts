import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../model/services/apiClient', () => ({ default: apiMock }));

import { chatAssistant } from '../model/services/assistantApi';

beforeEach(() => {
  apiMock.post.mockReset();
});

describe('assistantApi.chatAssistant', () => {
  it('POSTs /assistant/chat with the payload and returns response.data', async () => {
    const payload = {
      messages: [{ role: 'user', content: 'hi' }],
      active_year: 2026,
      active_month: 1,
    };
    const responseBody = {
      reply_text: 'Hello.',
      is_complete: false,
      missing_fields: ['task_name'],
      task_draft: null,
    };
    apiMock.post.mockResolvedValue({ data: responseBody });
    const result = await chatAssistant(payload as any);
    expect(apiMock.post).toHaveBeenCalledWith('/assistant/chat', payload);
    expect(result).toEqual(responseBody);
  });

  it('maps a network failure (no response) to the network-error message', async () => {
    apiMock.post.mockRejectedValue(new Error('connection refused'));
    await expect(chatAssistant({} as any)).rejects.toThrow(
      'Network error. Please check your connection.'
    );
  });

  it('propagates the server-supplied detail string when present', async () => {
    apiMock.post.mockRejectedValue({
      response: {
        status: 503,
        data: {
          detail: 'Could not connect to Ollama. Start Ollama and try again.',
        },
      },
    });
    await expect(chatAssistant({} as any)).rejects.toThrow(
      'Could not connect to Ollama. Start Ollama and try again.'
    );
  });

  it('falls back to the generic message when detail is missing or blank', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 500, data: {} },
    });
    await expect(chatAssistant({} as any)).rejects.toThrow(
      'Something went wrong. Please try again.'
    );
  });

  it('falls back to the generic message when detail is a non-string value', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 500, data: { detail: { nested: 'object' } } },
    });
    await expect(chatAssistant({} as any)).rejects.toThrow(
      'Something went wrong. Please try again.'
    );
  });
});
