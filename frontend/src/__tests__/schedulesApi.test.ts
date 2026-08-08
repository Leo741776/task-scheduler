import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../model/services/apiClient', () => ({ default: apiMock }));

import {
  generateSchedule,
  getSchedules,
} from '../model/services/schedulesApi';

beforeEach(() => {
  apiMock.post.mockReset();
  apiMock.get.mockReset();
});

describe('schedulesApi.generateSchedule', () => {
  it('POSTs /schedules with the payload and returns a formatted schedule', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        id: 1,
        user_id: 7,
        title: 's',
        description: null,
        start_time: '2026-01-01T09:00:00Z',
        end_time: '2026-01-01T17:00:00Z',
        created_at: '2026-01-01T08:00:00Z',
        updated_at: '2026-01-01T08:00:00Z',
        schedule: [
          {
            title: 'Block A',
            start_time: '2026-01-01T09:00:00Z',
            end_time: '2026-01-01T10:00:00Z',
          },
        ],
      },
    });
    const payload = {
      title: 's',
      start_time: '2026-01-01T09:00:00Z',
      end_time: '2026-01-01T17:00:00Z',
    };
    const result = await generateSchedule(payload as any);
    expect(apiMock.post).toHaveBeenCalledWith('/schedules', payload);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.end_time).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.schedule[0].start_time).toBeInstanceOf(Date);
    expect(result.schedule[0].end_time).toBeInstanceOf(Date);
  });

  it('passes through Date instances on the response without re-wrapping', async () => {
    const startDate = new Date('2026-01-01T09:00:00Z');
    const endDate = new Date('2026-01-01T10:00:00Z');
    apiMock.post.mockResolvedValue({
      data: {
        id: 2,
        start_time: startDate,
        end_time: endDate,
        created_at: startDate,
        schedule: [],
      },
    });
    const result = await generateSchedule({} as any);
    expect(result.start_time).toBe(startDate);
    expect(result.end_time).toBe(endDate);
    expect(result.created_at).toBe(startDate);
  });

  it('handles a response with no schedule array (defaults to empty)', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        id: 3,
        start_time: '2026-01-01T09:00:00Z',
        end_time: '2026-01-01T10:00:00Z',
        created_at: '2026-01-01T09:00:00Z',
      },
    });
    const result = await generateSchedule({} as any);
    expect(result.schedule).toEqual([]);
  });
});

describe('schedulesApi.getSchedules', () => {
  it('GETs /schedules and maps each entry through the formatter', async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          id: 1,
          start_time: '2026-01-01T09:00:00Z',
          end_time: '2026-01-01T10:00:00Z',
          created_at: '2026-01-01T08:00:00Z',
          schedule: [],
        },
        {
          id: 2,
          start_time: '2026-01-02T09:00:00Z',
          end_time: '2026-01-02T10:00:00Z',
          created_at: '2026-01-02T08:00:00Z',
          schedule: [],
        },
      ],
    });
    const result = await getSchedules();
    expect(apiMock.get).toHaveBeenCalledWith('/schedules');
    expect(result).toHaveLength(2);
    expect(result[0].start_time).toBeInstanceOf(Date);
    expect(result[1].start_time).toBeInstanceOf(Date);
  });
});

describe('schedulesApi error mapping', () => {
  it('maps 404 to the supplied detail when present', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 404, data: { detail: 'Schedule not found' } },
    });
    await expect(generateSchedule({} as any)).rejects.toThrow(
      'Schedule not found'
    );
  });

  it('maps 500 to the generic API error message', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 500, data: {} },
    });
    await expect(generateSchedule({} as any)).rejects.toThrow(
      'An API error occurred. Please try again.'
    );
  });

  it('maps an error without a response to the network-error message', async () => {
    apiMock.get.mockRejectedValue(new Error('connection refused'));
    await expect(getSchedules()).rejects.toThrow(
      'Network error. Please check your connection.'
    );
  });
});
