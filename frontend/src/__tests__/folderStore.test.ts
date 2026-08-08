import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  taskStoreState: { tasks: [] as any[] },
  deleteFolderApi: vi.fn(),
  createFolderApi: vi.fn(),
  getFoldersApi: vi.fn(),
  updateFolderApi: vi.fn(),
}));

vi.mock('../viewmodel/stores/taskStore', () => ({
  useTaskStore: {
    setState: (updater: any) => {
      const next =
        typeof updater === 'function'
          ? updater(mocks.taskStoreState)
          : updater;
      mocks.taskStoreState = { ...mocks.taskStoreState, ...next };
    },
    getState: () => mocks.taskStoreState,
  },
}));

vi.mock('../model/services/foldersApi', () => ({
  createFolder: mocks.createFolderApi,
  getFolders: mocks.getFoldersApi,
  updateFolder: mocks.updateFolderApi,
  deleteFolder: mocks.deleteFolderApi,
}));

import { useFolderStore } from '../viewmodel/stores/folderStore';

beforeEach(() => {
  useFolderStore.setState({ folders: [] });
  mocks.taskStoreState = { tasks: [] };
  mocks.deleteFolderApi.mockReset();
  mocks.createFolderApi.mockReset();
  mocks.getFoldersApi.mockReset();
  mocks.updateFolderApi.mockReset();
});

describe('folderStore.deleteFolder', () => {
  it('removes the folder from the folders list', async () => {
    mocks.deleteFolderApi.mockResolvedValue(undefined);
    useFolderStore.setState({
      folders: [
        { id: 10, name: 'work', color: 'sky' },
        { id: 11, name: 'home', color: 'green' },
      ],
    });
    await useFolderStore.getState().deleteFolder(10);
    expect(useFolderStore.getState().folders).toEqual([
      { id: 11, name: 'home', color: 'green' },
    ]);
  });

  it('clears folder_id on cached tasks that referenced the deleted folder', async () => {
    mocks.deleteFolderApi.mockResolvedValue(undefined);
    useFolderStore.setState({
      folders: [{ id: 10, name: 'work', color: 'sky' }],
    });
    mocks.taskStoreState = {
      tasks: [
        { id: 1, folder_id: 10, title: 'a' },
        { id: 2, folder_id: 10, title: 'b' },
      ],
    };
    await useFolderStore.getState().deleteFolder(10);
    expect(mocks.taskStoreState.tasks[0].folder_id).toBeNull();
    expect(mocks.taskStoreState.tasks[1].folder_id).toBeNull();
  });

  it('does not change tasks that belong to other folders or are already unfoldered', async () => {
    mocks.deleteFolderApi.mockResolvedValue(undefined);
    useFolderStore.setState({
      folders: [{ id: 10, name: 'work', color: 'sky' }],
    });
    mocks.taskStoreState = {
      tasks: [
        { id: 1, folder_id: 10, title: 'in-deleted-folder' },
        { id: 2, folder_id: 99, title: 'in-other-folder' },
        { id: 3, folder_id: null, title: 'already-unfoldered' },
      ],
    };
    await useFolderStore.getState().deleteFolder(10);
    expect(mocks.taskStoreState.tasks[0].folder_id).toBeNull();
    expect(mocks.taskStoreState.tasks[1].folder_id).toBe(99);
    expect(mocks.taskStoreState.tasks[2].folder_id).toBeNull();
  });

  it('calls the foldersApi.deleteFolder with the correct folder id', async () => {
    mocks.deleteFolderApi.mockResolvedValue(undefined);
    useFolderStore.setState({
      folders: [{ id: 42, name: 'x', color: 'sky' }],
    });
    await useFolderStore.getState().deleteFolder(42);
    expect(mocks.deleteFolderApi).toHaveBeenCalledWith(42);
    expect(mocks.deleteFolderApi).toHaveBeenCalledTimes(1);
  });
});

describe('folderStore.loadFolders', () => {
  it('calls foldersApi.getFolders and stores the returned folders', async () => {
    mocks.getFoldersApi.mockResolvedValue([
      { id: 1, name: 'work', color: 'sky' },
      { id: 2, name: 'home', color: null },
    ]);
    await useFolderStore.getState().loadFolders();
    expect(mocks.getFoldersApi).toHaveBeenCalledTimes(1);
    expect(useFolderStore.getState().folders).toEqual([
      { id: 1, name: 'work', color: 'sky' },
      { id: 2, name: 'home', color: null },
    ]);
  });
});

describe('folderStore.addFolder', () => {
  it('calls foldersApi.createFolder and appends the returned folder', async () => {
    mocks.createFolderApi.mockResolvedValue({
      id: 7,
      name: 'Errands',
      color: 'green',
    });
    useFolderStore.setState({
      folders: [{ id: 1, name: 'Existing', color: 'sky' }],
    });
    const result = await useFolderStore
      .getState()
      .addFolder({ name: 'Errands', color: 'green' });
    expect(mocks.createFolderApi).toHaveBeenCalledWith({
      name: 'Errands',
      color: 'green',
    });
    expect(result).toEqual({ id: 7, name: 'Errands', color: 'green' });
    expect(useFolderStore.getState().folders).toEqual([
      { id: 1, name: 'Existing', color: 'sky' },
      { id: 7, name: 'Errands', color: 'green' },
    ]);
  });
});

describe('folderStore.updateFolder', () => {
  it('calls foldersApi.updateFolder and replaces the matching folder', async () => {
    mocks.updateFolderApi.mockResolvedValue({
      id: 5,
      name: 'Renamed',
      color: 'rose',
    });
    useFolderStore.setState({
      folders: [
        { id: 5, name: 'Old', color: 'sky' },
        { id: 6, name: 'Other', color: 'green' },
      ],
    });
    const result = await useFolderStore
      .getState()
      .updateFolder(5, { name: 'Renamed', color: 'rose' });
    expect(mocks.updateFolderApi).toHaveBeenCalledWith(5, {
      name: 'Renamed',
      color: 'rose',
    });
    expect(result).toEqual({ id: 5, name: 'Renamed', color: 'rose' });
    expect(useFolderStore.getState().folders[0]).toEqual({
      id: 5,
      name: 'Renamed',
      color: 'rose',
    });
  });

  it('does not alter folders that do not match the id', async () => {
    mocks.updateFolderApi.mockResolvedValue({
      id: 5,
      name: 'Renamed',
      color: 'sky',
    });
    useFolderStore.setState({
      folders: [
        { id: 5, name: 'Old', color: 'sky' },
        { id: 6, name: 'Other', color: 'green' },
      ],
    });
    await useFolderStore.getState().updateFolder(5, { name: 'Renamed' });
    expect(useFolderStore.getState().folders[1]).toEqual({
      id: 6,
      name: 'Other',
      color: 'green',
    });
  });
});
