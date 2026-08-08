import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<any>('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => ({
      getItem: () => null,
      setItem: () => null,
      removeItem: () => null,
    }),
  };
});

const mocks = vi.hoisted(() => ({
  userId: 1 as number | null,
  createActivity: vi.fn(),
  getActivities: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
  deleteActivityGroup: vi.fn(),
}));

vi.mock('../model/services/activitiesApi', () => ({
  createActivity: mocks.createActivity,
  getActivities: mocks.getActivities,
  updateActivity: mocks.updateActivity,
  deleteActivity: mocks.deleteActivity,
  deleteActivityGroup: mocks.deleteActivityGroup,
}));

vi.mock('../viewmodel/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user:
        mocks.userId == null
          ? null
          : { id: mocks.userId, username: 'u', email: 'u@example.com' },
      token: 'fake-token',
    }),
  },
}));

import { useTaskStore } from '../viewmodel/stores/taskStore';

beforeEach(() => {
  useTaskStore.setState({ tasks: [], placements: {} });
  mocks.userId = 1;
  mocks.createActivity.mockReset();
  mocks.getActivities.mockReset();
  mocks.updateActivity.mockReset();
  mocks.deleteActivity.mockReset();
  mocks.deleteActivityGroup.mockReset();
});

describe('taskStore.addTask placement gating', () => {
  it('writes placement when both start and end are non-null', async () => {
    mocks.createActivity.mockResolvedValue({
      id: 100,
      title: 'Gym',
      duration_minutes: 60,
      priority: 3,
      folder_id: null,
      completed: false,
    });
    const start = new Date('2026-01-01T09:00:00.000Z');
    const end = new Date('2026-01-01T10:00:00.000Z');
    await useTaskStore.getState().addTask({
      title: 'Gym',
      start,
      end,
      priority: 3,
      completed: false,
    } as any);
    expect(useTaskStore.getState().placements[1]?.[100]).toEqual({
      start: start.toISOString(),
      end: end.toISOString(),
    });
  });

  it('does not create placement for an untimed task (start/end null)', async () => {
    mocks.createActivity.mockResolvedValue({
      id: 101,
      title: 'untimed',
      duration_minutes: 0,
      priority: 1,
      folder_id: null,
      completed: false,
    });
    await useTaskStore.getState().addTask({
      title: 'untimed',
      start: null,
      end: null,
      priority: 1,
      completed: false,
    } as any);
    expect(useTaskStore.getState().placements[1]).toBeUndefined();
  });
});

describe('taskStore.updateTask placement gating', () => {
  beforeEach(async () => {
    mocks.createActivity.mockResolvedValue({
      id: 1,
      title: 'task',
      duration_minutes: 60,
      priority: 3,
      folder_id: null,
      completed: false,
    });
    await useTaskStore.getState().addTask({
      title: 'task',
      start: new Date('2026-01-01T09:00:00.000Z'),
      end: new Date('2026-01-01T10:00:00.000Z'),
      priority: 3,
      completed: false,
    } as any);
  });

  it('title-only update does not modify placement', async () => {
    const before = useTaskStore.getState().placements[1]?.[1];
    mocks.updateActivity.mockResolvedValue({
      id: 1,
      title: 'renamed',
      duration_minutes: 60,
      priority: 3,
      folder_id: null,
      completed: false,
    });
    await useTaskStore.getState().updateTask(1, { title: 'renamed' });
    expect(useTaskStore.getState().placements[1]?.[1]).toEqual(before);
  });

  it('priority-only update does not modify placement', async () => {
    const before = useTaskStore.getState().placements[1]?.[1];
    mocks.updateActivity.mockResolvedValue({
      id: 1,
      title: 'task',
      duration_minutes: 60,
      priority: 5,
      folder_id: null,
      completed: false,
    });
    await useTaskStore.getState().updateTask(1, { priority: 5 });
    expect(useTaskStore.getState().placements[1]?.[1]).toEqual(before);
  });

  it('completed-only update does not modify placement', async () => {
    const before = useTaskStore.getState().placements[1]?.[1];
    mocks.updateActivity.mockResolvedValue({
      id: 1,
      title: 'task',
      duration_minutes: 60,
      priority: 3,
      folder_id: null,
      completed: true,
    });
    await useTaskStore.getState().updateTask(1, { completed: true });
    expect(useTaskStore.getState().placements[1]?.[1]).toEqual(before);
  });

  it('updates placement when start and end are in the payload', async () => {
    const newStart = new Date('2026-01-01T11:00:00.000Z');
    const newEnd = new Date('2026-01-01T12:00:00.000Z');
    await useTaskStore
      .getState()
      .updateTask(1, { start: newStart, end: newEnd });
    expect(useTaskStore.getState().placements[1]?.[1]).toEqual({
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    });
  });

  it('explicit start:null/end:null writes a null/null placement (intentional untimed)', async () => {
    await useTaskStore
      .getState()
      .updateTask(1, { start: null, end: null });
    expect(useTaskStore.getState().placements[1]?.[1]).toEqual({
      start: null,
      end: null,
    });
  });
});

describe('taskStore.deleteTask', () => {
  it("removes only the current user's placement, preserving other users'", async () => {
    mocks.deleteActivity.mockResolvedValue(undefined);
    useTaskStore.setState({
      tasks: [
        {
          id: 99,
          title: 'x',
          start: 'a',
          end: 'b',
          priority: 1,
          duration_minutes: 60,
          folder_id: null,
          completed: false,
        },
      ],
      placements: {
        1: { 99: { start: 'a', end: 'b' } },
        2: { 99: { start: 'c', end: 'd' } },
      },
    });
    mocks.userId = 1;
    await useTaskStore.getState().deleteTask(99);
    const placements = useTaskStore.getState().placements;
    expect(placements[1]?.[99]).toBeUndefined();
    expect(placements[2]?.[99]).toEqual({ start: 'c', end: 'd' });
  });
});

describe('taskStore.loadTasks', () => {
  it('merges loaded activities with the current user placements by id', async () => {
    useTaskStore.setState({
      tasks: [],
      placements: {
        1: { 50: { start: 'iso-start', end: 'iso-end' } },
      },
    });
    mocks.getActivities.mockResolvedValue([
      {
        id: 50,
        title: 'with placement',
        duration_minutes: 60,
        priority: 3,
        folder_id: null,
        completed: false,
      },
      {
        id: 51,
        title: 'no placement',
        duration_minutes: 30,
        priority: 1,
        folder_id: null,
        completed: false,
      },
    ]);
    await useTaskStore.getState().loadTasks();
    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.id === 50)).toMatchObject({
      start: 'iso-start',
      end: 'iso-end',
    });
    expect(tasks.find((t) => t.id === 51)).toMatchObject({
      start: null,
      end: null,
    });
  });
});

describe('taskStore.deleteTaskGroup', () => {
  it('calls the API and removes all tasks with the matching task_group_id', async () => {
    mocks.deleteActivityGroup.mockResolvedValue(undefined);
    useTaskStore.setState({
      tasks: [
        {
          id: 1, title: 'a', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'grp-x',
        } as any,
        {
          id: 2, title: 'b', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'grp-x',
        } as any,
        {
          id: 3, title: 'c', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'grp-y',
        } as any,
      ],
      placements: {},
    });
    await useTaskStore.getState().deleteTaskGroup('grp-x');
    expect(mocks.deleteActivityGroup).toHaveBeenCalledWith('grp-x');
    const remaining = useTaskStore.getState().tasks;
    expect(remaining.map((t) => t.id)).toEqual([3]);
  });

  it('leaves tasks in other groups untouched', async () => {
    mocks.deleteActivityGroup.mockResolvedValue(undefined);
    useTaskStore.setState({
      tasks: [
        {
          id: 10, title: 'keep1', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'keep',
        } as any,
        {
          id: 11, title: 'gone', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'gone',
        } as any,
        {
          id: 12, title: 'keep2', start: null, end: null, priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: null,
        } as any,
      ],
      placements: {},
    });
    await useTaskStore.getState().deleteTaskGroup('gone');
    const ids = useTaskStore.getState().tasks.map((t) => t.id).sort();
    expect(ids).toEqual([10, 12]);
  });

  it("removes the deleted group's placements for the current user", async () => {
    mocks.deleteActivityGroup.mockResolvedValue(undefined);
    useTaskStore.setState({
      tasks: [
        {
          id: 100, title: 'a', start: 's', end: 'e', priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'g1',
        } as any,
        {
          id: 200, title: 'other', start: 's', end: 'e', priority: 1,
          duration_minutes: 30, folder_id: null, completed: false,
          task_group_id: 'g2',
        } as any,
      ],
      placements: {
        1: {
          100: { start: 's', end: 'e' },
          200: { start: 's', end: 'e' },
        },
      },
    });
    mocks.userId = 1;
    await useTaskStore.getState().deleteTaskGroup('g1');
    const placements = useTaskStore.getState().placements;
    expect(placements[1]?.[100]).toBeUndefined();
    expect(placements[1]?.[200]).toEqual({ start: 's', end: 'e' });
  });
});

describe('taskStore round-trips task_group_id', () => {
  it('addTask passes task_group_id to the API and stores it on the new task', async () => {
    mocks.createActivity.mockResolvedValue({
      id: 500,
      title: 'recurring',
      duration_minutes: 30,
      priority: 3,
      folder_id: null,
      completed: false,
      task_group_id: 'grp-recur',
    });
    const result = await useTaskStore.getState().addTask({
      title: 'recurring',
      start: null,
      end: null,
      priority: 3,
      completed: false,
      task_group_id: 'grp-recur',
    } as any);
    expect(mocks.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ task_group_id: 'grp-recur' })
    );
    expect(result.task_group_id).toBe('grp-recur');
  });

  it('loadTasks preserves task_group_id from the loaded activities', async () => {
    useTaskStore.setState({ tasks: [], placements: {} });
    mocks.getActivities.mockResolvedValue([
      {
        id: 600,
        title: 'with-group',
        duration_minutes: 30,
        priority: 3,
        folder_id: null,
        completed: false,
        task_group_id: 'grp-loaded',
      },
      {
        id: 601,
        title: 'no-group',
        duration_minutes: 30,
        priority: 1,
        folder_id: null,
        completed: false,
      },
    ]);
    await useTaskStore.getState().loadTasks();
    const tasks = useTaskStore.getState().tasks;
    expect(tasks.find((t) => t.id === 600)?.task_group_id).toBe('grp-loaded');
    expect(tasks.find((t) => t.id === 601)?.task_group_id).toBeNull();
  });
});

describe('taskStore.clear', () => {
  it('resets tasks but preserves placements', () => {
    useTaskStore.setState({
      tasks: [
        {
          id: 1,
          title: 'x',
          start: null,
          end: null,
          priority: 1,
          duration_minutes: 30,
          folder_id: null,
          completed: false,
        },
      ],
      placements: { 1: { 1: { start: 'a', end: 'b' } } },
    });
    useTaskStore.getState().clear();
    expect(useTaskStore.getState().tasks).toEqual([]);
    expect(useTaskStore.getState().placements).toEqual({
      1: { 1: { start: 'a', end: 'b' } },
    });
  });
});
