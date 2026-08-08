import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch, Alert, useWindowDimensions } from 'react-native';
import Modal from './Modal';
import MonthPickerModal from './MonthPickerModal';
import { formatMonthYearLong } from '../../../utils/format';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';
import {
  DEFAULT_TASK_PRIORITY,
  getTaskPriorityDotColor,
  PRIORITY_DOT_COLORS,
} from '../../../utils/taskPriority';
import {
  FOLDER_COLOR_TOKENS,
  DEFAULT_FOLDER_COLOR,
  getFolderColor,
  type FolderColorToken,
} from '../../../utils/folderColor';
import { useFolders, type Folder } from '../../../viewmodel/hooks/useFolders';
import { useTasks } from '../../../viewmodel/hooks/useTasks';
import type { Task } from '../../../viewmodel/stores/taskStore';

const PRIORITY_LEVELS = [1, 2, 3, 4, 5];

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Below normal',
  3: 'Normal',
  4: 'High',
  5: 'Urgent',
};
const ITEM_H = 44;

type DateMode = 'single' | 'multiple' | 'recurring';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const isValidDateKey = (key: string) => {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (m < 1 || m > 12) return false;

  const maxDay = new Date(y, m, 0).getDate();
  return d >= 1 && d <= maxDay;
};

function WheelPicker({ items, value, onChange, styles }: any) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = items.findIndex((item: any) => item.value === value);
    if (idx >= 0) {
      scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    }
  }, [items, value]);

  return (
    <View style={styles.wheelOuter}>
      <View style={styles.wheelHighlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const bounded = Math.max(0, Math.min(items.length - 1, idx));
          if (items[bounded]?.value !== value) onChange(items[bounded].value);
        }}
      >
        <View style={{ height: ITEM_H }} />
        {items.map((item: any) => (
          <Pressable
            key={String(item.value)}
            style={styles.wheelItem}
            onPress={() => {
              onChange(item.value);
              const idx = items.findIndex((i: any) => i.value === item.value);
              scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: true });
            }}
          >
            <Text style={[styles.wheelItemText, item.value === value && styles.wheelItemSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: ITEM_H }} />
      </ScrollView>
    </View>
  );
}

type Tab = 'add' | 'tasks' | 'folders';

type TriState = 'off' | 'only-yes' | 'only-no';
const cycleTri = (s: TriState): TriState =>
  s === 'off' ? 'only-yes' : s === 'only-yes' ? 'only-no' : 'off';

type PriorityFilter = 'all' | 1 | 2 | 3 | 4 | 5;
const PRIORITY_CYCLE: PriorityFilter[] = ['all', 5, 4, 3, 2, 1];
const cyclePriority = (p: PriorityFilter): PriorityFilter => {
  const idx = PRIORITY_CYCLE.indexOf(p);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
};

interface Props {
  open: boolean;
  onClose: () => void;
  baseDate: Date;
  tasks: Task[];
  onAdd: (incoming: {
    title: string;
    description: string;
    start: Date | null;
    end: Date | null;
    priority: number;
    folder_id: number | null;
    duration_minutes: number;
    task_group_id?: string | null;
  }) => void | Promise<void>;
  onDeleteTask: (id: number) => void;
  editingTaskId?: number | null;
  onSetEditingTaskId?: (id: number | null) => void;
}

export default function TaskManagementModal({
  open,
  onClose,
  onAdd,
  baseDate,
  tasks,
  onDeleteTask,
  editingTaskId = null,
  onSetEditingTaskId,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { folders, addFolder, updateFolder, deleteFolder } = useFolders();
  const { toggleTaskCompleted, updateTask } = useTasks();
  const { height: windowH } = useWindowDimensions();

  const isEditing = editingTaskId != null;
  const editingTask = useMemo(
    () => (editingTaskId != null ? tasks.find((t) => t.id === editingTaskId) ?? null : null),
    [tasks, editingTaskId]
  );

  const [tab, setTab] = useState<Tab>('add');

  // Tasks-tab state
  const [tasksQuery, setTasksQuery] = useState('');
  const [completedFilter, setCompletedFilter] = useState<TriState>('off');
  const [untimedFilter, setUntimedFilter] = useState<TriState>('off');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  // Add-tab form state
  const [title, setTitle] = useState('New task');
  const [description, setDescription] = useState('');
  const [day, setDay] = useState(1);
  const [startHour12, setStartHour12] = useState(1);
  const [startMinute, setStartMinute] = useState(0);
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [durationHour, setDurationHour] = useState(0);
  const [durationMinute, setDurationMinute] = useState(0);
  const [priority, setPriority] = useState(DEFAULT_TASK_PRIORITY);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [untimed, setUntimed] = useState(false);

  // Edit-mode completion is staged locally and committed on Save.
  const [editingCompletedDraft, setEditingCompletedDraft] = useState(false);

  // Folder-tab state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColorToken>(DEFAULT_FOLDER_COLOR);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingFolderColor, setEditingFolderColor] = useState<FolderColorToken>(DEFAULT_FOLDER_COLOR);

  // The Day grid is defaulted to selection's month and year.
  const initialActiveDate =
    (isEditing && editingTask?.start ? new Date(editingTask.start) : null) ||
    baseDate ||
    new Date();
  const [activeYear, setActiveYear] = useState<number>(initialActiveDate.getFullYear());
  const [activeMonth, setActiveMonth] = useState<number>(initialActiveDate.getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [selectedDateKeys, setSelectedDateKeys] = useState<Set<string>>(
    new Set([toDateKey(initialActiveDate)])
  );
  const [recurringWeekdays, setRecurringWeekdays] = useState<Set<number>>(
    new Set([initialActiveDate.getDay()])
  );
  const [repeatUntilText, setRepeatUntilText] = useState(toDateKey(initialActiveDate));

  const daysInMonth = useMemo(
    () => new Date(activeYear, activeMonth + 1, 0).getDate(),
    [activeYear, activeMonth]
  );
  const firstWeekday = useMemo(() => new Date(activeYear, activeMonth, 1).getDay(), [activeYear, activeMonth]);
  const dayCells = useMemo(() => {
    const blanks = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [firstWeekday, daysInMonth]);

  const hourOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    []
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, m) => ({ value: m, label: m.toString().padStart(2, '0') })),
    []
  );
  const periodOptions = useMemo(
    () => [
      { value: 'AM', label: 'AM' },
      { value: 'PM', label: 'PM' },
    ],
    []
  );
  const durationHourOptions = useMemo(
    () => Array.from({ length: 25 }, (_, h) => ({ value: h, label: String(h) })),
    []
  );
  // At 24h, lock minutes to 0.
  const durationMinuteOptions = useMemo(
    () =>
      durationHour === 24
        ? [{ value: 0, label: '00' }]
        : Array.from({ length: 60 }, (_, m) => ({ value: m, label: m.toString().padStart(2, '0') })),
    [durationHour]
  );

  // Snap minutes to 0 when hour reaches 24.
  useEffect(() => {
    if (durationHour === 24 && durationMinute !== 0) setDurationMinute(0);
  }, [durationHour, durationMinute]);

  useEffect(() => {
    setDay((prev) => Math.min(Math.max(prev, 1), daysInMonth));
  }, [daysInMonth]);

  // Track whether the modal was already open across renders so we can
  // distinguish a fresh open (default to Add tab) from an edit-mode exit
  // (preserve the tab the user just clicked).
  const wasOpenRef = useRef(false);

  // Depends on editingTaskId (not editingTask) so toggling complete mid-edit doesn't
  // wipe the user's pending form edits. Only entering/leaving edit mode triggers prefill.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      // Reset tab to Add so the next open doesn't briefly flash the
      // previously-active tab before the open-time reset runs.
      setTab('add');
      return;
    }
    const isFreshOpen = !wasOpenRef.current;
    wasOpenRef.current = true;

    const editingTask =
      editingTaskId != null ? tasks.find((t) => t.id === editingTaskId) ?? null : null;

    if (editingTask) {
      setTab('add');
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setPriority(editingTask.priority);
      setFolderId(editingTask.folder_id ?? null);
      setUntimed(editingTask.start === null);
      setEditingCompletedDraft(editingTask.completed);

      const total = Math.max(0, editingTask.duration_minutes);
      setDurationHour(Math.floor(total / 60));
      setDurationMinute(total % 60);

      if (editingTask.start) {
        const s = new Date(editingTask.start);
        setActiveYear(s.getFullYear());
        setActiveMonth(s.getMonth());
        setDay(s.getDate());

        const editDate = editingTask.start ? new Date(editingTask.start) : new Date();

        setDateMode('single');
        setSelectedDateKeys(new Set([toDateKey(editDate)]));
        setRecurringWeekdays(new Set([editDate.getDay()]));
        setRepeatUntilText(toDateKey(editDate));

        const h24 = s.getHours();
        const period = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        setStartHour12(h12);
        setStartMinute(s.getMinutes());
        setStartPeriod(period);
      } else {
        setDay(1);
        setStartHour12(1);
        setStartMinute(0);
        setStartPeriod('AM');
      }
      setPriorityMenuOpen(false);
      setFolderMenuOpen(false);
      return;
    }

    // Add mode: reset form fields to defaults. Only set tab on a fresh open;
    // mid-session edit-exit (clicking Tasks/Folders to leave edit) keeps the
    // user's current tab.
    if (isFreshOpen) setTab('add');
    setTitle('New task');
    setDescription('');
    // Initialize day grid to the calendar's selected day (baseDate).
    const baseInit = baseDate || new Date();
    setActiveYear(baseInit.getFullYear());
    setActiveMonth(baseInit.getMonth());
    setDay(baseInit.getDate());

    setDateMode('single');
    setSelectedDateKeys(new Set([toDateKey(baseInit)]));
    setRecurringWeekdays(new Set([baseInit.getDay()]));
    setRepeatUntilText(toDateKey(baseInit));

    setStartHour12(1);
    setStartMinute(0);
    setStartPeriod('AM');
    setDurationHour(0);
    setDurationMinute(0);
    setPriority(DEFAULT_TASK_PRIORITY);
    setPriorityMenuOpen(false);
    setFolderId(null);
    setFolderMenuOpen(false);
    setUntimed(false);
    setEditingCompletedDraft(false);
    setNewFolderName('');
    setNewFolderColor(DEFAULT_FOLDER_COLOR);
    setEditingFolderId(null);
    setTasksQuery('');
    setCompletedFilter('off');
    setUntimedFilter('off');
    setPriorityFilter('all');
    // Intentional: depend only on open + editingTaskId. tasks updates are excluded
    // so completing a task mid-edit doesn't reset the user's other in-flight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTaskId]);

  const folderById = useMemo(() => {
    const map = new Map<number, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const filteredTasks = useMemo(() => {
    const q = tasksQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q) {
        const titleMatch = t.title.toLowerCase().includes(q);
        const folder = t.folder_id != null ? folderById.get(t.folder_id) : null;
        // Folder matches by prefix only.
        const folderMatch = folder ? folder.name.toLowerCase().startsWith(q) : false;
        if (!titleMatch && !folderMatch) return false;
      }
      if (completedFilter === 'only-yes' && !t.completed) return false;
      if (completedFilter === 'only-no' && t.completed) return false;
      const isUntimed = t.start === null;
      if (untimedFilter === 'only-yes' && !isUntimed) return false;
      if (untimedFilter === 'only-no' && isUntimed) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, tasksQuery, completedFilter, untimedFilter, priorityFilter, folderById]);

  const computeStartEndForDate = (
    date: Date
  ): { start: Date | null; end: Date | null; duration: number } => {
    const duration = Math.max(1, durationHour * 60 + durationMinute);

    if (untimed) return { start: null, end: null, duration };

    const hour24 =
      startPeriod === 'AM'
        ? startHour12 === 12
          ? 0
          : startHour12
        : startHour12 === 12
        ? 12
        : startHour12 + 12;

    const start = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour24,
      startMinute
    );

    const end = new Date(start.getTime() + duration * 60 * 1000);

    return { start, end, duration };
  };

  const computeFormStartEnd = (): { start: Date | null; end: Date | null; duration: number } => {
    const safeDay = Math.min(Math.max(day, 1), daysInMonth);
    return computeStartEndForDate(new Date(activeYear, activeMonth, safeDay));
  };

  const getOccurrenceDates = (): Date[] => {
    if (untimed) {
      return [new Date()];
    }

    if (dateMode === 'single') {
      const safeDay = Math.min(Math.max(day, 1), daysInMonth);
      return [new Date(activeYear, activeMonth, safeDay)];
    }

    if (dateMode === 'multiple') {
      return Array.from(selectedDateKeys)
        .map(fromDateKey)
        .sort((a, b) => a.getTime() - b.getTime());
    }

    if (!isValidDateKey(repeatUntilText)) {
      return [];
    }

    const start = new Date(activeYear, activeMonth, Math.min(Math.max(day, 1), daysInMonth));
    const until = fromDateKey(repeatUntilText);

    start.setHours(0, 0, 0, 0);
    until.setHours(0, 0, 0, 0);

    if (until < start) {
      return [];
    }

    const selectedWeekdays =
      recurringWeekdays.size > 0 ? recurringWeekdays : new Set([start.getDay()]);

    const dates: Date[] = [];
    const cursor = new Date(start);

    while (cursor <= until) {
      if (selectedWeekdays.has(cursor.getDay())) {
        dates.push(new Date(cursor));
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  };

  const handleAdd = async () => {
    const dates = getOccurrenceDates();

    if (dates.length === 0) {
      Alert.alert('No dates selected', 'Choose at least one valid date for this task.');
      return;
    }

    // const shouldGroup = dateMode === 'multiple' || dateMode === 'recurring';
    const shouldGroup = dates.length > 1 && (dateMode === 'multiple' || dateMode === 'recurring');
    const taskGroupId = shouldGroup
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      : null;

    try {
      for (const occurrenceDate of dates) {
        const { start, end, duration } = computeStartEndForDate(occurrenceDate);

        await onAdd({
          title,
          description,
          start,
          end,
          priority,
          folder_id: folderId,
          duration_minutes: duration,
          task_group_id: taskGroupId,
        });
      }

      onClose();
    } catch (err: any) {
      Alert.alert('Could not create tasks', err?.message ?? 'Unknown error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    const { start, end, duration } = computeFormStartEnd();
    try {
      await updateTask(editingTask.id, {
        title,
        description,
        priority,
        folder_id: folderId,
        duration_minutes: duration,
        completed: editingCompletedDraft,
        start,
        end,
      });
      onSetEditingTaskId?.(null);
      onClose();
    } catch (err: any) {
      Alert.alert('Could not save task', err?.message ?? 'Unknown error');
    }
  };

  // Toggle is staged locally; commit happens in handleSaveEdit.
  const handleEditCompleteToggle = () => {
    setEditingCompletedDraft((c) => !c);
  };

  const handleEditDelete = () => {
    if (!editingTask) return;
    Alert.alert('Delete task?', `"${editingTask.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteTask(editingTask.id);
          onSetEditingTaskId?.(null);
          onClose();
        },
      },
    ]);
  };

  const handleAddFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await addFolder({ name, color: newFolderColor });
      setNewFolderName('');
      setNewFolderColor(DEFAULT_FOLDER_COLOR);
    } catch (err: any) {
      Alert.alert('Could not create folder', err?.message ?? 'Unknown error');
    }
  };

  const handleSaveEditFolder = async () => {
    if (editingFolderId == null) return;
    const name = editingFolderName.trim();
    if (!name) return;
    try {
      await updateFolder(editingFolderId, { name, color: editingFolderColor });
      setEditingFolderId(null);
    } catch (err: any) {
      Alert.alert('Could not update folder', err?.message ?? 'Unknown error');
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Delete folder?',
      `"${folder.name}" will be removed. Tasks inside will become unfoldered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
            } catch (err: any) {
              Alert.alert('Could not delete folder', err?.message ?? 'Unknown error');
            }
          },
        },
      ]
    );
  };

  return (
    <>
    <Modal open={open} title="Tasks" onClose={onClose}>
      {/* Tab bar */}
      <View style={styles.tabRow}>
        {(['add', 'tasks', 'folders'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => {
              // Switching tabs while editing always exits edit
              // mode and returns the Add tab to default state.
              if (isEditing) onSetEditingTaskId?.(null);
              setTab(t);
            }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'add'
                ? isEditing
                  ? 'Edit'
                  : 'Add'
                : t === 'tasks'
                ? `Tasks (${tasks.length})`
                : 'Folders'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ height: windowH * 0.65 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'add' && (
          <>
            <Text style={styles.label}>Task</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Task name"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional details..."
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Priority</Text>
            <View style={styles.dropdownSection}>
              <Pressable style={styles.dropdownTrigger} onPress={() => setPriorityMenuOpen((o) => !o)}>
                <View style={styles.dropdownTriggerLeft}>
                  <View
                    style={[styles.dropdownTriggerDot, { backgroundColor: getTaskPriorityDotColor(priority) }]}
                  />
                  <Text style={styles.dropdownTriggerText}>Level {priority}</Text>
                </View>
                <Text style={styles.dropdownChevron}>{priorityMenuOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {priorityMenuOpen && (
                <View style={styles.dropdownMenu}>
                  {PRIORITY_LEVELS.map((level, idx) => (
                    <Pressable
                      key={level}
                      style={[
                        styles.dropdownRow,
                        level === priority && styles.dropdownRowSelected,
                        idx === PRIORITY_LEVELS.length - 1 && styles.dropdownRowLast,
                      ]}
                      onPress={() => {
                        setPriority(level);
                        setPriorityMenuOpen(false);
                      }}
                    >
                      <View style={[styles.dropdownMenuDot, { backgroundColor: PRIORITY_DOT_COLORS[level] }]} />
                      <Text style={[styles.dropdownRowText, level === priority && styles.dropdownRowTextSelected]}>
                        {level} — {PRIORITY_LABELS[level]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Folder</Text>
            <View style={styles.dropdownSection}>
              <Pressable style={styles.dropdownTrigger} onPress={() => setFolderMenuOpen((o) => !o)}>
                <View style={styles.dropdownTriggerLeft}>
                  {folderId != null ? (
                    <View
                      style={[
                        styles.dropdownTriggerDot,
                        { backgroundColor: getFolderColor(folderById.get(folderId)?.color) },
                      ]}
                    />
                  ) : null}
                  <Text style={styles.dropdownTriggerText}>
                    {folderId != null ? folderById.get(folderId)?.name ?? '—' : 'No folder'}
                  </Text>
                </View>
                <Text style={styles.dropdownChevron}>{folderMenuOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {folderMenuOpen && (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    style={[styles.dropdownRow, folderId == null && styles.dropdownRowSelected]}
                    onPress={() => {
                      setFolderId(null);
                      setFolderMenuOpen(false);
                    }}
                  >
                    <View style={[styles.dropdownMenuDot, { backgroundColor: 'transparent', borderColor: colors.border }]} />
                    <Text style={[styles.dropdownRowText, folderId == null && styles.dropdownRowTextSelected]}>
                      No folder
                    </Text>
                  </Pressable>
                  {folders.map((f, idx) => (
                    <Pressable
                      key={f.id}
                      style={[
                        styles.dropdownRow,
                        folderId === f.id && styles.dropdownRowSelected,
                        idx === folders.length - 1 && styles.dropdownRowLast,
                      ]}
                      onPress={() => {
                        setFolderId(f.id);
                        setFolderMenuOpen(false);
                      }}
                    >
                      <View style={[styles.dropdownMenuDot, { backgroundColor: getFolderColor(f.color) }]} />
                      <Text style={[styles.dropdownRowText, folderId === f.id && styles.dropdownRowTextSelected]}>
                        {f.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.untimedRow, { marginTop: 14 }]}>
              <Text style={styles.label}>Untimed (no calendar slot)</Text>
              <Switch value={untimed} onValueChange={setUntimed} />
            </View>

            {!untimed && (
              <>
                  {!isEditing && (
                    <>
                      <Text style={[styles.label, { marginTop: 14 }]}>Date options</Text>

                      <View style={styles.modeRow}>
                        {(['single', 'multiple', 'recurring'] as DateMode[]).map((mode) => (
                          <Pressable
                            key={mode}
                            style={[styles.modePill, dateMode === mode && styles.modePillActive]}
                            onPress={() => {
                              setDateMode(mode);

                              const currentDate = new Date(activeYear, activeMonth, day);
                              const key = toDateKey(currentDate);

                              if (mode === 'single') {
                                setSelectedDateKeys(new Set([key]));
                              }

                              if (mode === 'recurring') {
                                setSelectedDateKeys(new Set([key]));
                                setRecurringWeekdays(new Set([currentDate.getDay()]));
                                setRepeatUntilText(key);
                              }
                            }}
                          >
                            <Text style={[styles.modePillText, dateMode === mode && styles.modePillTextActive]}>
                              {mode === 'single'
                                ? 'Single day'
                                : mode === 'multiple'
                                  ? 'Multiple days'
                                  : 'Recurring'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={[styles.label, { marginTop: 14 }]}>
                    {dateMode === 'multiple' && !isEditing ? 'Days' : 'Day'}
                  </Text>

                  <Pressable
                    style={styles.monthPickerPill}
                    onPress={() => setShowMonthPicker(true)}
                  >
                    <Text style={styles.monthPickerText}>
                      {formatMonthYearLong(new Date(activeYear, activeMonth, 1))}
                    </Text>
                    <Text style={styles.monthPickerChevron}>▾</Text>
                  </Pressable>

                  <View style={styles.calRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                      <View key={`wd-${i}`} style={styles.calWeekday}>
                        <Text style={styles.calWeekdayText}>{wd}</Text>
                      </View>
                    ))}
                  </View>

                  {Array.from({ length: Math.ceil(dayCells.length / 7) }, (_, weekIdx) => (
                    <View key={`wk-${weekIdx}`} style={styles.calRow}>
                      {Array.from({ length: 7 }, (_, colIdx) => {
                        const i = weekIdx * 7 + colIdx;
                        const cell = dayCells[i];

                        if (cell == null) {
                          return <View key={`blank-${i}`} style={styles.calCell} />;
                        }

                        const cellDate = new Date(activeYear, activeMonth, cell);
                        const key = toDateKey(cellDate);

                        const isSelected =
                          isEditing || dateMode === 'single' || dateMode === 'recurring'
                            ? day === cell
                            : selectedDateKeys.has(key);

                        return (
                          <Pressable
                            key={`day-${cell}`}
                            style={[styles.calCell, isSelected && styles.calCellSelected]}
                            onPress={() => {
                              if (isEditing || dateMode === 'single' || dateMode === 'recurring') {
                                setDay(cell);
                                setSelectedDateKeys(new Set([key]));

                                if (dateMode === 'recurring') {
                                  setRecurringWeekdays(new Set([cellDate.getDay()]));
                                }

                                return;
                              }

                              setSelectedDateKeys((prev) => {
                                const next = new Set(prev);

                                if (next.has(key)) {
                                  next.delete(key);
                                } else {
                                  next.add(key);
                                }

                                if (next.size === 0) {
                                  next.add(key);
                                }

                                return next;
                              });
                            }}
                          >
                            <Text style={[styles.calCellText, isSelected && styles.calCellTextSelected]}>
                              {cell}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}

                  {dateMode === 'recurring' && !isEditing && (
                    <>
                      <Text style={[styles.label, { marginTop: 14 }]}>Repeat on</Text>

                      <View style={styles.modeRow}>
                        {WEEKDAYS.map((wd) => {
                          const active = recurringWeekdays.has(wd.value);

                          return (
                            <Pressable
                              key={wd.value}
                              style={[styles.modePill, active && styles.modePillActive]}
                              onPress={() => {
                                setRecurringWeekdays((prev) => {
                                  const next = new Set(prev);

                                  if (next.has(wd.value)) {
                                    next.delete(wd.value);
                                  } else {
                                    next.add(wd.value);
                                  }

                                  return next;
                                });
                              }}
                            >
                              <Text style={[styles.modePillText, active && styles.modePillTextActive]}>
                                {wd.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={[styles.label, { marginTop: 14 }]}>Repeat until</Text>

                      <TextInput
                        style={styles.input}
                        value={repeatUntilText}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.muted}
                        onChangeText={setRepeatUntilText}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </>
                  )}            

                <Text style={[styles.label, { marginTop: 14 }]}>Time</Text>
                <View style={styles.wheelRow}>
                  <WheelPicker items={hourOptions} value={startHour12} onChange={setStartHour12} styles={styles}/>
                  <Text style={styles.wheelSep}>:</Text>
                  <WheelPicker items={minuteOptions} value={startMinute} onChange={setStartMinute} styles={styles}/>
                  <WheelPicker items={periodOptions} value={startPeriod} onChange={setStartPeriod} styles={styles}/>
                </View>
              </>
            )}

            <Text style={[styles.label, { marginTop: 14 }]}>Duration</Text>
            <View style={styles.wheelRow}>
              <WheelPicker items={durationHourOptions} value={durationHour} onChange={setDurationHour} styles={styles}/>
              <Text style={styles.wheelSep}>h</Text>
              <WheelPicker items={durationMinuteOptions} value={durationMinute} onChange={setDurationMinute} styles={styles}/>
              <Text style={styles.wheelSep}>m</Text>
            </View>

            {isEditing && editingTask ? (
              <View style={styles.editExtraRow}>
                <Pressable
                  style={[styles.editToggleBtn, editingCompletedDraft && styles.editToggleBtnDone]}
                  onPress={handleEditCompleteToggle}
                >
                  <Text
                    style={[
                      styles.editToggleText,
                      editingCompletedDraft && styles.editToggleTextDone,
                    ]}
                  >
                    {editingCompletedDraft ? '✓ Completed' : 'Mark complete'}
                  </Text>
                </Pressable>
                <Pressable style={styles.editDeleteBtn} onPress={handleEditDelete}>
                  <Text style={styles.editDeleteText}>Delete</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={styles.btnCancel}
                onPress={() => {
                  if (isEditing) onSetEditingTaskId?.(null);
                  onClose();
                }}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnAdd} onPress={isEditing ? handleSaveEdit : handleAdd}>
                <Text style={styles.btnAddText}>{isEditing ? 'Save Changes' : 'Add Task'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {tab === 'tasks' && (
          <View>
            <TextInput
              style={styles.input}
              value={tasksQuery}
              onChangeText={setTasksQuery}
              placeholder="Search tasks..."
              placeholderTextColor={colors.muted}
            />
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, completedFilter !== 'off' && styles.filterPillActive]}
                onPress={() => setCompletedFilter(cycleTri)}
              >
                <Text style={[styles.filterText, completedFilter !== 'off' && styles.filterTextActive]}>
                  {completedFilter === 'off'
                    ? 'Completion: All'
                    : completedFilter === 'only-yes'
                    ? 'Completed only'
                    : 'Incomplete only'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, untimedFilter !== 'off' && styles.filterPillActive]}
                onPress={() => setUntimedFilter(cycleTri)}
              >
                <Text style={[styles.filterText, untimedFilter !== 'off' && styles.filterTextActive]}>
                  {untimedFilter === 'off'
                    ? 'Timing: All'
                    : untimedFilter === 'only-yes'
                    ? 'Untimed only'
                    : 'Timed only'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, priorityFilter !== 'all' && styles.filterPillActive]}
                onPress={() => setPriorityFilter(cyclePriority)}
              >
                <Text style={[styles.filterText, priorityFilter !== 'all' && styles.filterTextActive]}>
                  {priorityFilter === 'all'
                    ? 'Priority: All'
                    : `Priority: ${priorityFilter} (${PRIORITY_LABELS[priorityFilter]})`}
                </Text>
              </Pressable>
            </View>

            {filteredTasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks match.</Text>
            ) : (
              filteredTasks.map((t) => (
                <View key={t.id} style={styles.listRow}>
                  <View style={[styles.listDot, { backgroundColor: getTaskPriorityDotColor(t.priority) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, t.completed && styles.listTitleCompleted]}>{t.title}</Text>
                    {t.folder_id != null && folderById.get(t.folder_id) ? (
                      <View style={styles.listFolderBadge}>
                        <View
                          style={[
                            styles.listFolderDot,
                            { backgroundColor: getFolderColor(folderById.get(t.folder_id)?.color) },
                          ]}
                        />
                        <Text style={styles.listFolderText}>{folderById.get(t.folder_id)?.name}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    style={[styles.checkBtn, t.completed && styles.checkBtnDone]}
                    onPress={() => {
                      toggleTaskCompleted(t.id).catch((err: any) =>
                        Alert.alert('Could not update task', err?.message ?? 'Unknown error')
                      );
                    }}
                  >
                    <Text style={[styles.checkBtnText, t.completed && styles.checkBtnTextDone]}>✓</Text>
                  </Pressable>
                  <Pressable
                    style={styles.listEdit}
                    onPress={() => {
                      onSetEditingTaskId?.(t.id);
                      setTab('add');
                    }}
                  >
                    <Text style={styles.listEditText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.listDelete}
                    onPress={() =>
                      Alert.alert('Delete task?', `"${t.title}" will be removed.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDeleteTask(t.id) },
                      ])
                    }
                  >
                    <Text style={styles.listDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'folders' && (
          <View>
            <Text style={styles.label}>New folder</Text>
            <TextInput
              style={styles.input}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={colors.muted}
            />
            <View style={[styles.swatchRow, { marginTop: 8 }]}>
              {FOLDER_COLOR_TOKENS.map((tok) => (
                <Pressable
                  key={tok}
                  style={[
                    styles.swatch,
                    { backgroundColor: getFolderColor(tok) },
                    newFolderColor === tok && styles.swatchSelected,
                  ]}
                  onPress={() => setNewFolderColor(tok)}
                />
              ))}
            </View>
            <Pressable
              style={[styles.btnAdd, { marginTop: 10, alignSelf: 'flex-start' }]}
              onPress={handleAddFolder}
            >
              <Text style={styles.btnAddText}>Create</Text>
            </Pressable>

            <View style={styles.divider} />

            {folders.length === 0 ? (
              <Text style={styles.emptyText}>No folders yet.</Text>
            ) : (
              folders.map((f) =>
                editingFolderId === f.id ? (
                  <View key={f.id} style={styles.folderEditBox}>
                    <TextInput
                      style={styles.input}
                      value={editingFolderName}
                      onChangeText={setEditingFolderName}
                      placeholder="Folder name"
                      placeholderTextColor={colors.muted}
                    />
                    <View style={[styles.swatchRow, { marginTop: 8 }]}>
                      {FOLDER_COLOR_TOKENS.map((tok) => (
                        <Pressable
                          key={tok}
                          style={[
                            styles.swatch,
                            { backgroundColor: getFolderColor(tok) },
                            editingFolderColor === tok && styles.swatchSelected,
                          ]}
                          onPress={() => setEditingFolderColor(tok)}
                        />
                      ))}
                    </View>
                    <View style={[styles.actions, { marginTop: 10 }]}>
                      <Pressable style={styles.btnCancel} onPress={() => setEditingFolderId(null)}>
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable style={styles.btnAdd} onPress={handleSaveEditFolder}>
                        <Text style={styles.btnAddText}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View key={f.id} style={styles.listRow}>
                    <View style={[styles.listDot, { backgroundColor: getFolderColor(f.color) }]} />
                    <Text style={[styles.listTitle, { flex: 1 }]}>{f.name}</Text>
                    <Pressable
                      style={styles.listEdit}
                      onPress={() => {
                        setEditingFolderId(f.id);
                        setEditingFolderName(f.name);
                        setEditingFolderColor((f.color as FolderColorToken) ?? DEFAULT_FOLDER_COLOR);
                      }}
                    >
                      <Text style={styles.listEditText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.listDelete} onPress={() => handleDeleteFolder(f)}>
                      <Text style={styles.listDeleteText}>Delete</Text>
                    </Pressable>
                  </View>
                )
              )
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
    <MonthPickerModal
      open={showMonthPicker}
      initialDate={new Date(activeYear, activeMonth, 1)}
      onClose={() => setShowMonthPicker(false)}
      onSelect={(d: Date) => {
        setActiveYear(d.getFullYear());
        setActiveMonth(d.getMonth());
        setShowMonthPicker(false);
      }}
    />
    </>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.panel2,
  },
  descriptionInput: {
    minHeight: 70,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calRow: { flexDirection: 'row' },
  monthPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    marginBottom: 8,
    gap: 8,
  },
  monthPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  monthPickerChevron: {
    fontSize: 12,
    color: colors.muted,
  },
  calWeekday: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calWeekdayText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  calCellSelected: { backgroundColor: colors.accent },
  calCellText: { fontSize: 13, color: colors.text },
  calCellTextSelected: { color: '#fff', fontWeight: '700' },

  wheelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wheelSep: { fontSize: 16, color: colors.muted, paddingHorizontal: 2 },
  wheelOuter: {
    width: 64,
    height: ITEM_H * 3,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: 'rgba(106, 166, 255, 0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(106, 166, 255, 0.3)',
    zIndex: 1,
  },
  wheelScroll: { flex: 1 },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { fontSize: 15, color: colors.muted },
  wheelItemSelected: { color: colors.text, fontWeight: '700' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  btnCancel: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: { fontSize: 14, color: colors.text },
  btnAdd: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.accent },
  btnAddText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  dropdownSection: { gap: 0 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.panel2,
  },
  dropdownTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownTriggerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  dropdownTriggerText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  dropdownChevron: { fontSize: 12, color: colors.muted },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownRowSelected: { backgroundColor: 'rgba(106, 166, 255, 0.12)' },
  dropdownRowLast: { borderBottomWidth: 0 },
  dropdownMenuDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  dropdownRowText: { fontSize: 14, color: colors.text },
  dropdownRowTextSelected: { fontWeight: '700' },

  untimedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  emptyText: { fontSize: 14, color: colors.muted, paddingVertical: 20, textAlign: 'center' },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listDot: { width: 10, height: 10, borderRadius: 5 },
  listTitle: { fontSize: 14, color: colors.text, fontWeight: '600' },
  listTitleCompleted: { textDecorationLine: 'line-through', color: colors.muted },
  listFolderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  listFolderDot: { width: 8, height: 8, borderRadius: 4 },
  listFolderText: { fontSize: 12, color: colors.muted },
  listEdit: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  listEditText: { fontSize: 13, color: colors.text },
  listDelete: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#ffe4e4' },
  listDeleteText: { fontSize: 13, color: '#b00020', fontWeight: '600' },

  swatchRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: colors.text },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  folderEditBox: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
  },
  filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkBtnDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkBtnText: { fontSize: 14, color: 'transparent', fontWeight: '900' },
  checkBtnTextDone: { color: '#fff' },

  editExtraRow: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  editToggleBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  editToggleBtnDone: { backgroundColor: '#16a34a' },
  editToggleText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  editToggleTextDone: { color: '#fff' },
  editDeleteBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#ffe4e4',
  },
  editDeleteText: { fontSize: 13, fontWeight: '600', color: '#b00020' },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
  },
  modePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modePillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modePillTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 5,
    paddingBottom: 12,
  },
});
