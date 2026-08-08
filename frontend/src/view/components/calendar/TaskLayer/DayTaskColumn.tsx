import { View, DimensionValue } from 'react-native';
import TaskBlock from './TaskBlock';
import { sizes } from '../../../../nativeTheme';
import type { Task } from '../../../../viewmodel/hooks/useTasks';

interface Props {
  date: Date;
  tasks: Task[];
  dayColW?: number;
  showDescription?: boolean;
  isWeeklyMode?: boolean;
}

interface Entry {
  task: Task;
  startMin: number;
  endMin: number;
  isContinuation: boolean;
}

// Height-agnostic: scales with time-axis pan
export default function DayTaskColumn({
  date,
  tasks,
  dayColW,
  showDescription = false,
  isWeeklyMode = false,
}: Props) {
  const DAY_W = dayColW ?? sizes.dayColW;
  const overlapGapPx = 6;

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const entries: Entry[] = [];
  tasks.forEach((task) => {
    if (!task?.start || !task?.end) return;
    const start = task.start instanceof Date ? task.start : new Date(task.start);
    const end = task.end instanceof Date ? task.end : new Date(task.end);
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (endMs <= dayStart || startMs >= dayEnd) return;

    const clippedStart = Math.max(startMs, dayStart);
    const clippedEnd = Math.min(endMs, dayEnd);
    const startMin = (clippedStart - dayStart) / 60000;
    const rawEndMin = (clippedEnd - dayStart) / 60000;
    // Keep a 15 minute minimum height for visibility, but never spill past midnight.
    const endMin = Math.min(1440, Math.max(startMin + 15, rawEndMin));
    // True when a task spans multiple days.
    const isContinuation = startMs < dayStart;
    entries.push({ task, startMin, endMin, isContinuation });
  });

  entries.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placements: Record<string | number, { col: number; cols: number }> = {};
  const clusters: Entry[][] = [];
  let currentCluster: Entry[] = [];
  let currentClusterEnd = -1;

  entries.forEach((entry) => {
    if (currentCluster.length === 0) {
      currentCluster = [entry];
      currentClusterEnd = entry.endMin;
      return;
    }
    if (entry.startMin < currentClusterEnd) {
      currentCluster.push(entry);
      currentClusterEnd = Math.max(currentClusterEnd, entry.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [entry];
      currentClusterEnd = entry.endMin;
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  clusters.forEach((cluster) => {
    const active: Array<{ endMin: number; col: number }> = [];
    const localPlacement = new Map<Task['id'], { col: number }>();
    let clusterMaxCols = 1;

    cluster.forEach((entry) => {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].endMin <= entry.startMin) active.splice(i, 1);
      }
      const usedCols = new Set(active.map((item) => item.col));
      let col = 0;
      while (usedCols.has(col)) col += 1;
      active.push({ endMin: entry.endMin, col });
      localPlacement.set(entry.task.id, { col });
      clusterMaxCols = Math.max(clusterMaxCols, active.length);
    });

    cluster.forEach((entry) => {
      const placed = localPlacement.get(entry.task.id)!;
      placements[entry.task.id] = { col: placed.col, cols: clusterMaxCols };
    });
  });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
      }}
    >
      {entries.map(({ task, startMin, endMin, isContinuation }) => {
        const durationMin = Math.max(15, endMin - startMin);
        const top = `${(startMin / 1440) * 100}%` as DimensionValue;
        const height = `${(durationMin / 1440) * 100}%` as DimensionValue;

        const placement = placements[task.id];
        const hasOverlap = placement && placement.cols > 1;

        let left = 0;
        let width = DAY_W - 1;

        if (hasOverlap) {
          const colWidth = (DAY_W - (placement.cols + 1) * overlapGapPx) / placement.cols;
          left = overlapGapPx + placement.col * (colWidth + overlapGapPx);
          width = colWidth;
        }

        return (
          <TaskBlock
            key={task.id}
            task={task}
            rect={{ left, top, width, height }}
            showDescription={showDescription}
            isContinuation={isContinuation}
            isWeeklyMode={isWeeklyMode}
          />
        );
      })}
    </View>
  );
}
