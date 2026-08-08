import { useTaskStore, type Task, type NewTask } from '../stores/taskStore';

export type { Task, NewTask };

export function useTasks() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const toggleTaskCompleted = useTaskStore((s) => s.toggleTaskCompleted);
  const deleteTaskGroup = useTaskStore((s) => s.deleteTaskGroup);

  return { tasks, addTask, updateTask, deleteTask, deleteTaskGroup, loadTasks, toggleTaskCompleted };
}
