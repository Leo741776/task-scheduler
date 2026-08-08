import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../model/services/apiClient', () => ({ default: apiMock }));

import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
} from '../model/services/foldersApi';

beforeEach(() => {
  apiMock.post.mockReset();
  apiMock.get.mockReset();
  apiMock.patch.mockReset();
  apiMock.delete.mockReset();
});

describe('foldersApi.createFolder', () => {
  it('POSTs /folders with the payload and returns response.data', async () => {
    const created = { id: 1, name: 'Workouts', color: 'sky' };
    apiMock.post.mockResolvedValue({ data: created });
    const payload = { name: 'Workouts', color: 'sky' };
    const result = await createFolder(payload as any);
    expect(apiMock.post).toHaveBeenCalledWith('/folders', payload);
    expect(result).toEqual(created);
  });

  it('maps 409 (duplicate folder name) to FOLDER_NAME_TAKEN', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 409, data: { detail: 'duplicate' } },
    });
    await expect(createFolder({ name: 'dup' } as any)).rejects.toThrow(
      'A folder with this name already exists.'
    );
  });
});

describe('foldersApi.getFolders', () => {
  it('GETs /folders and returns response.data', async () => {
    apiMock.get.mockResolvedValue({
      data: [
        { id: 1, name: 'a', color: 'sky' },
        { id: 2, name: 'b', color: 'rose' },
      ],
    });
    const result = await getFolders();
    expect(apiMock.get).toHaveBeenCalledWith('/folders');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
  });
});

describe('foldersApi.updateFolder', () => {
  it('PATCHes /folders/{id} with updates and returns response.data', async () => {
    apiMock.patch.mockResolvedValue({
      data: { id: 5, name: 'Renamed', color: 'sky' },
    });
    const result = await updateFolder(5 as any, { name: 'Renamed' } as any);
    expect(apiMock.patch).toHaveBeenCalledWith('/folders/5', {
      name: 'Renamed',
    });
    expect(result).toEqual({ id: 5, name: 'Renamed', color: 'sky' });
  });

  it('maps 404 to FOLDER_NOT_FOUND', async () => {
    apiMock.patch.mockRejectedValue({
      response: { status: 404, data: {} },
    });
    await expect(
      updateFolder(999 as any, { name: 'x' } as any)
    ).rejects.toThrow('Folder not found.');
  });
});

describe('foldersApi.deleteFolder', () => {
  it('DELETEs /folders/{id}', async () => {
    apiMock.delete.mockResolvedValue(undefined);
    await deleteFolder(42 as any);
    expect(apiMock.delete).toHaveBeenCalledWith('/folders/42');
  });

  it('maps 404 to FOLDER_NOT_FOUND', async () => {
    apiMock.delete.mockRejectedValue({
      response: { status: 404, data: {} },
    });
    await expect(deleteFolder(999 as any)).rejects.toThrow(
      'Folder not found.'
    );
  });
});
