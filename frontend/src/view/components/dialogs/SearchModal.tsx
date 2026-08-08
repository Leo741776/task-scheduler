import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Modal from './Modal';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';
import { getTaskPriorityDotColor } from '../../../utils/taskPriority';
import { getFolderColor } from '../../../utils/folderColor';
import { useFolders } from '../../../viewmodel/hooks/useFolders';
import { useCalendarStore } from '../../../viewmodel/stores/calendarStore';

type CompletionFilter = 'all' | 'completed' | 'incomplete';
type PriorityFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type TimeRangeFilter = 'all' | 'today' | 'week' | 'upcoming' | 'past';

const COMPLETION_CYCLE: CompletionFilter[] = ['all', 'completed', 'incomplete'];
const PRIORITY_CYCLE: PriorityFilter[] = ['all', 5, 4, 3, 2, 1];
const TIME_RANGE_CYCLE: TimeRangeFilter[] = ['all', 'today', 'week', 'upcoming', 'past'];

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Below normal',
  3: 'Normal',
  4: 'High',
  5: 'Urgent',
};

function nextIn<T>(cycle: T[], value: T): T {
  const idx = cycle.indexOf(value);
  return cycle[(idx + 1) % cycle.length];
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function SearchModal({ open, onClose, tasks, onDeleteTask, onDeleteTaskGroup, onSelectTask, onFilterGrid }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [q, setQ] = useState('');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('all');
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const { height: windowH } = useWindowDimensions();

  const listHeight = Math.max(120, Math.min(320, windowH - 240));

  const { folders } = useFolders();
  const folderById = useMemo(() => {
    const map = new Map();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const results = useMemo(() => {
    // Untimed tasks are managed via TaskManagementModal, not search.
    const timed = tasks.filter((t) => t.start);
    const query = q.trim().toLowerCase();

    // Sun-Sat week containing selectedDay.
    const anchorStart = startOfDay(selectedDay);
    const anchorNext = anchorStart + 24 * 60 * 60 * 1000;
    const weekStart = anchorStart - selectedDay.getDay() * 24 * 60 * 60 * 1000;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

    return timed.filter((t) => {
      if (query) {
        const titleMatch = t.title.toLowerCase().includes(query);
        const folder = t.folder_id != null ? folderById.get(t.folder_id) : null;
        // Folder matches by prefix only.
        const folderMatch = folder ? folder.name.toLowerCase().startsWith(query) : false;
        if (!titleMatch && !folderMatch) return false;
      }
      if (completionFilter === 'completed' && !t.completed) return false;
      if (completionFilter === 'incomplete' && t.completed) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (timeRangeFilter !== 'all') {
        const start = t.start instanceof Date ? t.start : new Date(t.start);
        const ts = start.getTime();
        if (timeRangeFilter === 'today' && (ts < anchorStart || ts >= anchorNext)) return false;
        if (timeRangeFilter === 'week' && (ts < weekStart || ts >= weekEnd)) return false;
        if (timeRangeFilter === 'upcoming' && ts < anchorStart) return false;
        if (timeRangeFilter === 'past' && ts >= anchorStart) return false;
      }
      return true;
    });
  }, [q, tasks, completionFilter, priorityFilter, timeRangeFilter, selectedDay, folderById]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, { groupId: string | null; tasks: any[] }>();

    for (const task of results) {
      const key = task.task_group_id ?? `single-${task.id}`;

      if (!map.has(key)) {
        map.set(key, {
          groupId: task.task_group_id ?? null,
          tasks: [],
        });
      }

      map.get(key)!.tasks.push(task);
    }

    return Array.from(map.values());
  }, [results]);

  const completionLabel =
    completionFilter === 'all'
      ? 'Completion: All'
      : completionFilter === 'completed'
      ? 'Completed only'
      : 'Incomplete only';
  const priorityLabel =
    priorityFilter === 'all'
      ? 'Priority: All'
      : `Priority: ${priorityFilter} (${PRIORITY_LABELS[priorityFilter]})`;
  const timeRangeLabel =
    timeRangeFilter === 'all'
      ? 'When: All'
      : timeRangeFilter === 'today'
      ? 'Selected day'
      : timeRangeFilter === 'week'
      ? 'Selected week'
      : timeRangeFilter === 'upcoming'
      ? 'Upcoming'
      : 'Past';

  const filterBtn = onFilterGrid ? (
    <Pressable
      style={({ pressed }) => [styles.filterBtn, pressed && styles.filterBtnPressed]}
      onPress={() => onFilterGrid(results.map((t) => t.id))}
    >
      <Text style={styles.filterBtnText}>Filter the grid</Text>
    </Pressable>
  ) : null;

  return (
    <Modal open={open} title="Search" onClose={onClose} headerExtra={filterBtn}>
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholder="Search by task title..."
        placeholderTextColor={colors.muted}
        // autoFocus
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.filterPill, completionFilter !== 'all' && styles.filterPillActive]}
          onPress={() => setCompletionFilter((c) => nextIn(COMPLETION_CYCLE, c))}
        >
          <Text style={[styles.filterPillText, completionFilter !== 'all' && styles.filterPillTextActive]}>
            {completionLabel}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterPill, priorityFilter !== 'all' && styles.filterPillActive]}
          onPress={() => setPriorityFilter((p) => nextIn(PRIORITY_CYCLE, p))}
        >
          <Text style={[styles.filterPillText, priorityFilter !== 'all' && styles.filterPillTextActive]}>
            {priorityLabel}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterPill, timeRangeFilter !== 'all' && styles.filterPillActive]}
          onPress={() => setTimeRangeFilter((t) => nextIn(TIME_RANGE_CYCLE, t))}
        >
          <Text style={[styles.filterPillText, timeRangeFilter !== 'all' && styles.filterPillTextActive]}>
            {timeRangeLabel}
          </Text>
        </Pressable>
      </ScrollView>
      <ScrollView
        style={[styles.list, { height: listHeight }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {groupedResults.length === 0 ? (
          <Text style={styles.emptyText}>No tasks match.</Text>
        ) : (
          groupedResults.map((group) => {
            const firstTask = group.tasks[0];
            const isGrouped = group.groupId != null && group.tasks.length > 1;
            const folder = firstTask.folder_id != null ? folderById.get(firstTask.folder_id) : null;

            return (
              <View key={group.groupId ?? `single-${firstTask.id}`} style={styles.row}>
                <Pressable
                  style={styles.taskBtn}
                  onPress={() => {
                    onSelectTask?.(firstTask);
                  }}
                >
                  <View style={styles.taskBtnInner}>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: getTaskPriorityDotColor(firstTask.priority) },
                      ]}
                    />

                    <View style={styles.taskTextCol}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {firstTask.title}
                        {isGrouped ? ` (${group.tasks.length} occurrences)` : ''}
                      </Text>

                      {folder ? (
                        <View style={styles.folderBadge}>
                          <View
                            style={[
                              styles.folderDot,
                              { backgroundColor: getFolderColor(folder.color) },
                            ]}
                          />
                          <Text style={styles.folderText} numberOfLines={1}>
                            {folder.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (isGrouped && group.groupId) {
                      onDeleteTaskGroup?.(group.groupId);
                      return;
                    }

                    onDeleteTask?.(firstTask.id);
                  }}
                >
                  <Text style={styles.deleteBtnText}>
                    {isGrouped ? 'Delete series' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.panel2,
    marginBottom: 12,
  },
  list: {
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    height: 52,
  },
  taskBtn: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  taskBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    color: colors.text,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  folderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  folderText: {
    fontSize: 12,
    color: colors.muted,
  },
  deleteBtn: {
    height: '100%',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1d6eea',
  },
  filterBtnPressed: {
    opacity: 0.8,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    paddingVertical: 20,
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
});
