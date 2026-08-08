import { useFolderStore, type Folder, type NewFolder, type FolderUpdate } from '../stores/folderStore';

export type { Folder, NewFolder, FolderUpdate };

export function useFolders() {
  const folders = useFolderStore((s) => s.folders);
  const addFolder = useFolderStore((s) => s.addFolder);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const loadFolders = useFolderStore((s) => s.loadFolders);

  return { folders, addFolder, updateFolder, deleteFolder, loadFolders };
}
