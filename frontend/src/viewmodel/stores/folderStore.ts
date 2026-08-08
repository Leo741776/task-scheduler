import { create } from 'zustand';
import {
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder,
} from '../../model/services/foldersApi';
import { useTaskStore } from './taskStore';

export interface Folder {
  id: number;
  name: string;
  color?: string | null;
}

export type NewFolder = Omit<Folder, 'id'>;
export type FolderUpdate = Partial<Omit<Folder, 'id'>>;

interface FolderState {
  folders: Folder[];
  addFolder: (folder: NewFolder) => Promise<Folder>;
  updateFolder: (id: number, updates: FolderUpdate) => Promise<Folder>;
  deleteFolder: (id: number) => Promise<void>;
  loadFolders: () => Promise<void>;
  // Clears the current user's loaded folders. Called on logout.
  clear: () => void;
}

// Folders are not persisted across logout. loadFolders refreshes from the
// backend on every login so a different user never sees stale folders.
export const useFolderStore = create<FolderState>()((set, get) => ({
  folders: [],

  addFolder: async (folder) => {
    const created = await createFolder({
      name: folder.name,
      color: folder.color ?? undefined,
    });
    const newFolder: Folder = {
      id: created.id,
      name: created.name,
      color: created.color ?? null,
    };
    set({ folders: [...get().folders, newFolder] });
    return newFolder;
  },

  updateFolder: async (id, updates) => {
    const updated = await updateFolder(id, updates);
    const next: Folder = {
      id: updated.id,
      name: updated.name,
      color: updated.color ?? null,
    };
    set({
      folders: get().folders.map((f) => (f.id === id ? next : f)),
    });
    return next;
  },

  deleteFolder: async (id) => {
    await deleteFolder(id);
    set({ folders: get().folders.filter((f) => f.id !== id) });
    // Mirror the backend's ON DELETE SET NULL: locally clear folder_id on
    // any tasks that referenced this folder so the cached state matches.
    useTaskStore.setState((state) => ({
      tasks: state.tasks.map((t) =>
        t.folder_id === id ? { ...t, folder_id: null } : t,
      ),
    }));
  },

  loadFolders: async () => {
    const remote = await getFolders();
    const folders: Folder[] = remote.map((f: any) => ({
      id: f.id,
      name: f.name,
      color: f.color ?? null,
    }));
    set({ folders });
  },

  clear: () => {
    set({ folders: [] });
  },
}));
