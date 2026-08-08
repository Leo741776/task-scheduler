import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createActivity,
  getActivities,
  deleteActivity,
  deleteActivityGroup,
  updateActivity,
} from '../../model/services/activitiesApi';
import { useAuthStore } from './authStore';

export interface Task {
  id: number;
  title: string;
  description?: string;
  // ISO 8601 strings or null for untimed.
  start: string | null;
  end: string | null;
  priority: number;
  duration_minutes: number;
  folder_id?: number | null;
  completed: boolean;
  // recurring task shared id
  task_group_id?: string | null;
}

// Action inputs accept Date for ergonomics; the store normalizes to ISO.
type DateInput = Date | string | null;

export type NewTask = Omit<Task, 'id' | 'duration_minutes' | 'start' | 'end'> & {
  duration_minutes?: number;
  start: DateInput;
  end: DateInput;
};

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  duration_minutes?: number;
  priority?: number;
  folder_id?: number | null;
  completed?: boolean;
  start?: DateInput;
  end?: DateInput;
  task_group_id?: string | null;
}

// placements[userId][taskId] holds the local calendar placement for the
// current and previously-signed-in users. Persisted, never cleared on
// logout, so the same user gets their placement back on re-login.
type Placement = { start: string | null; end: string | null };
type PlacementMap = Record<number, Record<number, Placement>>;

interface TaskState {
  tasks: Task[];
  placements: PlacementMap;
  addTask: (task: NewTask) => Promise<Task>;
  updateTask: (id: number, updates: TaskUpdate) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  deleteTaskGroup: (taskGroupId: string) => Promise<void>;
  loadTasks: () => Promise<void>;
  toggleTaskCompleted: (id: number) => Promise<void>;
  // Clears the current user's working set. Placements are preserved.
  clear: () => void;
}

const toIso = (value: DateInput | undefined): string | null => {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const computeDurationMinutes = (startIso: string, endIso: string) => {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(ms / 60000));
};

const currentUserId = (): number | null =>
  useAuthStore.getState().user?.id ?? null;

const writePlacement = (
  prev: PlacementMap,
  userId: number,
  taskId: number,
  placement: Placement,
): PlacementMap => {
  const userBucket = prev[userId] ?? {};
  return { ...prev, [userId]: { ...userBucket, [taskId]: placement } };
};

const removePlacement = (
  prev: PlacementMap,
  userId: number,
  taskId: number,
): PlacementMap => {
  const userBucket = prev[userId];
  if (!userBucket || !(taskId in userBucket)) return prev;
  const next = { ...userBucket };
  delete next[taskId];
  return { ...prev, [userId]: next };
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      placements: {},

      addTask: async (task) => {
        const startIso = toIso(task.start);
        const endIso = toIso(task.end);

        const duration_minutes =
          task.duration_minutes ??
          (startIso && endIso ? computeDurationMinutes(startIso, endIso) : 0);

        const created = await createActivity({
          title: task.title,
          description: task.description,
          duration_minutes,
          priority: task.priority,
          folder_id: task.folder_id ?? null,
          task_group_id: task.task_group_id ?? null,
        });

        const newTask: Task = {
          id: created.id,
          title: created.title,
          description: created.description,
          start: startIso,
          end: endIso,
          priority: created.priority,
          duration_minutes: created.duration_minutes,
          folder_id: created.folder_id ?? null,
          completed: created.completed ?? false,
          task_group_id: created.task_group_id ?? task.task_group_id ?? null,
        };

        const userId = currentUserId();
        // Only write a placement when the new task is timed.
        if (userId != null && startIso && endIso) {
          set({
            tasks: [...get().tasks, newTask],
            placements: writePlacement(get().placements, userId, created.id, {
              start: startIso,
              end: endIso,
            }),
          });
        } else {
          set({ tasks: [...get().tasks, newTask] });
        }
        return newTask;
      },

      updateTask: async (id, updates) => {
        const payload: any = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.priority !== undefined) payload.priority = updates.priority;
        if (updates.duration_minutes !== undefined) payload.duration_minutes = updates.duration_minutes;
        if (updates.folder_id !== undefined) payload.folder_id = updates.folder_id;
        if (updates.completed !== undefined) payload.completed = updates.completed;

        if (updates.task_group_id !== undefined) payload.task_group_id = updates.task_group_id;

        const updated =
          Object.keys(payload).length > 0 ? await updateActivity(id, payload) : null;

        const prev = get().tasks.find((t) => t.id === id);
        if (!prev) throw new Error('Task not found');

        // Only re-write the placement when start or end is intentionally part
        // of the payload. Unrelated edits (title, completed, priority,
        // duration, folder) must leave the saved placement untouched.
        const startTouched = 'start' in updates;
        const endTouched = 'end' in updates;
        const placementTouched = startTouched || endTouched;

        const nextStart = startTouched ? toIso(updates.start) : prev.start;
        const nextEnd = endTouched ? toIso(updates.end) : prev.end;

        const merged: Task = {
          ...prev,
          title: updated?.title ?? prev.title,
          description: updated?.description ?? prev.description,
          priority: updated?.priority ?? prev.priority,
          duration_minutes: updated?.duration_minutes ?? prev.duration_minutes,
          folder_id: updated?.folder_id ?? (updates.folder_id === null ? null : prev.folder_id),
          completed: updated?.completed ?? prev.completed,

          task_group_id:
            updated?.task_group_id ??
            (updates.task_group_id === null ? null : prev.task_group_id ?? null),

          start: nextStart,
          end: nextEnd,
        };

        const userId = currentUserId();
        if (placementTouched && userId != null) {
          set({
            tasks: get().tasks.map((t) => (t.id === id ? merged : t)),
            placements: writePlacement(get().placements, userId, id, {
              start: nextStart,
              end: nextEnd,
            }),
          });
        } else {
          set({ tasks: get().tasks.map((t) => (t.id === id ? merged : t)) });
        }
        return merged;
      },

      deleteTask: async (id) => {
        await deleteActivity(id);
        const userId = currentUserId();
        if (userId != null) {
          set({
            tasks: get().tasks.filter((t) => t.id !== id),
            placements: removePlacement(get().placements, userId, id),
          });
        } else {
          set({ tasks: get().tasks.filter((t) => t.id !== id) });
        }
      },

      deleteTaskGroup: async (taskGroupId) => {
        await deleteActivityGroup(taskGroupId);

        const userId = currentUserId();
        const groupedTasks = get().tasks.filter((t) => t.task_group_id === taskGroupId);
        const groupedTaskIds = new Set(groupedTasks.map((t) => t.id));

        if (userId != null) {
          let nextPlacements = get().placements;

          for (const id of groupedTaskIds) {
            nextPlacements = removePlacement(nextPlacements, userId, id);
          }

          set({
            tasks: get().tasks.filter((t) => t.task_group_id !== taskGroupId),
            placements: nextPlacements,
          });
        } else {
          set({
            tasks: get().tasks.filter((t) => t.task_group_id !== taskGroupId),
          });
        }
      },

      toggleTaskCompleted: async (id) => {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return;
        const next = !current.completed;
        const updated = await updateActivity(id, { completed: next });
        set({
          tasks: get().tasks.map((t) =>
            t.id === id ? { ...t, completed: updated.completed ?? next } : t,
          ),
        });
      },

      loadTasks: async () => {
        const activities = await getActivities();
        const userId = currentUserId();
        const userPlacements = userId != null ? get().placements[userId] ?? {} : {};

        const merged: Task[] = activities.map((a: any) => {
          const placement = userPlacements?.[a.id];
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            start: placement?.start ?? null,
            end: placement?.end ?? null,
            priority: a.priority,
            duration_minutes: a.duration_minutes,
            folder_id: a.folder_id ?? null,
            completed: a.completed ?? false,
            task_group_id: a.task_group_id ?? null,
          } as Task;
        });

        set({ tasks: merged });
      },

      clear: () => {
        set({ tasks: [] });
      },
    }),
    {
      name: 'task-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only placements are persisted across logout. The working tasks list
      // is rebuilt from the backend on each login, so it stays in memory.
      partialize: (state) => ({ placements: state.placements }),
    },
  ),
);
