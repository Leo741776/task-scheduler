import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../model/services/apiClient', () => ({ default: apiMock }));

import {
  createActivity,
  deleteActivity,
  deleteActivityGroup,
  getActivities,
  getActivity,
  updateActivity,
} from '../model/services/activitiesApi';

beforeEach(() => {
  apiMock.post.mockReset();
  apiMock.get.mockReset();
  apiMock.patch.mockReset();
  apiMock.delete.mockReset();
});

describe('activitiesApi.createActivity', () => {
  it('POSTs /activities with the payload and returns response.data', async () => {
    const created = {
      id: 10,
      title: 'Gym',
      duration_minutes: 60,
      priority: 3,
    };
    apiMock.post.mockResolvedValue({ data: created });
    const payload = {
      title: 'Gym',
      duration_minutes: 60,
      priority: 3,
    };
    const result = await createActivity(payload as any);
    expect(apiMock.post).toHaveBeenCalledWith('/activities', payload);
    expect(result).toEqual(created);
  });
});

describe('activitiesApi.getActivities', () => {
  it('GETs /activities and returns response.data', async () => {
    apiMock.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });
    const result = await getActivities();
    expect(apiMock.get).toHaveBeenCalledWith('/activities');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('activitiesApi.getActivity', () => {
  it('GETs /activities/{id} and returns response.data', async () => {
    apiMock.get.mockResolvedValue({ data: { id: 42, title: 'task' } });
    const result = await getActivity(42 as any);
    expect(apiMock.get).toHaveBeenCalledWith('/activities/42');
    expect(result).toEqual({ id: 42, title: 'task' });
  });

  it('maps 404 to ACTIVITY_NOT_FOUND', async () => {
    apiMock.get.mockRejectedValue({
      response: { status: 404, data: { detail: 'Activity not found' } },
    });
    await expect(getActivity(999 as any)).rejects.toThrow(
      'Activity not found.'
    );
  });
});

describe('activitiesApi.updateActivity', () => {
  it('PATCHes /activities/{id} with the updates and returns response.data', async () => {
    apiMock.patch.mockResolvedValue({
      data: { id: 5, title: 'Renamed' },
    });
    const result = await updateActivity(5 as any, { title: 'Renamed' } as any);
    expect(apiMock.patch).toHaveBeenCalledWith('/activities/5', {
      title: 'Renamed',
    });
    expect(result).toEqual({ id: 5, title: 'Renamed' });
  });

  it('maps 404 to ACTIVITY_NOT_FOUND', async () => {
    apiMock.patch.mockRejectedValue({
      response: { status: 404, data: { detail: 'not found' } },
    });
    await expect(
      updateActivity(999 as any, { title: 'x' } as any)
    ).rejects.toThrow('Activity not found.');
  });
});

describe('activitiesApi.deleteActivity', () => {
  it('DELETEs /activities/{id}', async () => {
    apiMock.delete.mockResolvedValue(undefined);
    await deleteActivity(5 as any);
    expect(apiMock.delete).toHaveBeenCalledWith('/activities/5');
  });

  it('maps 404 to ACTIVITY_NOT_FOUND', async () => {
    apiMock.delete.mockRejectedValue({
      response: { status: 404, data: { detail: 'not found' } },
    });
    await expect(deleteActivity(999 as any)).rejects.toThrow(
      'Activity not found.'
    );
  });
});

describe('activitiesApi.deleteActivityGroup', () => {
  it('DELETEs /activities/groups/{taskGroupId} (URL-encoded)', async () => {
    apiMock.delete.mockResolvedValue(undefined);
    await deleteActivityGroup('group-abc' as any);
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/activities/groups/group-abc'
    );
  });

  it('URL-encodes special characters in the task group id', async () => {
    apiMock.delete.mockResolvedValue(undefined);
    await deleteActivityGroup('grp/with spaces' as any);
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/activities/groups/grp%2Fwith%20spaces'
    );
  });

  it('maps 404 to ACTIVITY_NOT_FOUND', async () => {
    apiMock.delete.mockRejectedValue({
      response: { status: 404, data: { detail: 'not found' } },
    });
    await expect(
      deleteActivityGroup('missing' as any)
    ).rejects.toThrow('Activity not found.');
  });
});

describe('activitiesApi error mapping', () => {
  it('maps 401 to the unauthorized message', async () => {
    apiMock.get.mockRejectedValue({
      response: { status: 401, data: {} },
    });
    await expect(getActivities()).rejects.toThrow(
      'You are not authorized to perform this action.'
    );
  });

  it('maps an error without a response to the network-error message', async () => {
    apiMock.get.mockRejectedValue(new Error('connection refused'));
    await expect(getActivities()).rejects.toThrow(
      'Network error. Please check your connection.'
    );
  });
});
