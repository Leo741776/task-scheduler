import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated from 'react-native-reanimated';

import TopBar from '../../components/layout/TopBar/TopBar';
import BottomBar from '../../components/layout/BottomBar/BottomBar';
import MonthlyGrid from '../../components/calendar/MonthlyGrid/MonthlyGrid';
import DayGridShell, { DayGridHandle } from '../../components/calendar/DayGrid/DayGridShell';
import MonthPickerModal from '../../components/dialogs/MonthPickerModal';
import SettingsModal from '../../components/dialogs/SettingsModal';
import ContactUsModal from '../../components/dialogs/ContactUsModal';
import TaskManagementModal from '../../components/dialogs/TaskManagementModal';
import SearchModal from '../../components/dialogs/SearchModal';
import AiCommandModal from '../../components/dialogs/AiCommandModal';

import { useCalendarRange } from '../../../viewmodel/hooks/useCalendarRange';
import { useTasks } from '../../../viewmodel/hooks/useTasks';
import { useCalendar } from '../../../viewmodel/hooks/useCalendar';
import { useCalendarStore } from '../../../viewmodel/stores/calendarStore';
import { useNotifications } from '../../../viewmodel/hooks/useNotifications';
import { usePreferences } from '../../../viewmodel/hooks/usePreferences';
import { useViewModeTransition } from './useViewModeTransition';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';

import { DEFAULT_TASK_PRIORITY } from '../../../utils/taskPriority';
import { formatMonthYearLong } from '../../../utils/format';

import { useAuthStore } from '../../../viewmodel/stores/authStore';
import { useFolders } from '../../../viewmodel/hooks/useFolders';

function weekStartOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

export default function CalendarScreen() {
  const {
    selectedDay,
    setSelectedDay,
    viewMode,
    setViewMode,
    navigatePrev,
    navigateNext,
  } = useCalendar();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dayGridRef = useRef<DayGridHandle>(null);
  const { width: windowW, height: windowH } = useWindowDimensions();
  const isLandscape = windowW > windowH;

  const { animatedStyle: viewTransitionStyle, transitionTo, isTransitioning } =
    useViewModeTransition(viewMode, setViewMode);

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Open the TaskManagementModal in edit mode.
  const taskEditRequest = useCalendarStore((s) => s.taskEditRequest);
  const clearTaskEditRequest = useCalendarStore((s) => s.clearTaskEditRequest);
  const searchFilterIds = useCalendarStore((s) => s.searchFilterIds);
  const setSearchFilterIds = useCalendarStore((s) => s.setSearchFilterIds);
  useEffect(() => {
    if (taskEditRequest == null) return;
    setEditingTaskId(taskEditRequest);
    setShowAddTask(true);
    clearTaskEditRequest();
  }, [taskEditRequest, clearTaskEditRequest]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedTaskDaysRef = useRef(new Set<string>());

  // In Weekly, the TopBar label follows the leftmost-visible day, not selectedDay.
  const [weeklyViewportStart, setWeeklyViewportStart] = useState<Date>(() =>
    weekStartOf(selectedDay)
  );
  const prevSelectedDayForWeeklyRef = useRef(selectedDay);
  if (prevSelectedDayForWeeklyRef.current !== selectedDay) {
    prevSelectedDayForWeeklyRef.current = selectedDay;
    setWeeklyViewportStart(weekStartOf(selectedDay));
  }
  const { monthLabel: monthlyLabel } = useCalendarRange();
  // Kept as a Date so MonthPickerModal's wheels open to the month/year the button is showing.
  const monthPickerDisplayDate =
    viewMode === 'weekly' ? weeklyViewportStart : selectedDay;
  const monthLabel =
    viewMode === 'monthly'
      ? monthlyLabel
      : formatMonthYearLong(monthPickerDisplayDate);
  const { tasks, addTask, deleteTask, deleteTaskGroup, loadTasks } = useTasks();

  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!user?.id) return;

    loadTasks().catch((err) => {
      console.warn('Could not load tasks after login:', err);
    });
  }, [user?.id, loadTasks]);

  const { loadFolders } = useFolders();
  useEffect(() => {
    if (!user?.id) return;

    loadTasks().catch((err) => {
      console.warn('Could not load tasks after login:', err);
    });

    loadFolders?.().catch((err) => {
      console.warn('Could not load folders after login:', err);
    });
  }, [user?.id, loadTasks, loadFolders]);

  const visibleTasks = useMemo(() => {
    if (!searchFilterIds) return tasks;
    const allow = new Set(searchFilterIds);
    return tasks.filter((t) => allow.has(t.id));
  }, [tasks, searchFilterIds]);
  const { initialize, requestPermission, scheduleTaskDay, playNow } = useNotifications();
  const {
    notificationsEnabled,
    notificationSoundEnabled,
    setNotificationsEnabled,
    setNotificationSoundEnabled,
  } = usePreferences();

  const addTaskWithReminder = async (task: {
    title: string;
    description?: string;
    start: Date | null;
    end: Date | null;
    priority: number;
    folder_id?: number | null;
    duration_minutes?: number;
    task_group_id?: string | null;
  }) => {
    const saved = await addTask(task);
    // Untimed tasks have no day to schedule a reminder against.
    if (saved.start) {
      await scheduleTaskDay(saved);
    }
  };

  useEffect(() => {
    const bootNotifications = async () => {
      await initialize();
      await requestPermission();
    };
    bootNotifications();
  }, []);

  const onAssistantTaskReady = (draft) => {
    const match = String(draft.time_12h || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return;

    const hour12 = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();
    const hour24 = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12);

    const start = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      Number(draft.task_day),
      hour24,
      minute,
      0,
      0
    );
    const durationMinutes = Number(draft.duration_hours) * 60 + Number(draft.duration_minutes);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const task = {
      title: String(draft.task_name || 'New task'),
      start,
      end,
      priority: DEFAULT_TASK_PRIORITY,
    };

    addTaskWithReminder(task);
    void playNow('Task added', 'Activity added!');
    setSelectedDay(task.start);
    dayGridRef.current?.scrollToHour(start.getHours() + start.getMinutes() / 60);
    dayGridRef.current?.recenter();
    setShowAiModal(false);
    setToastMessage('Activity added!');
    setShowToast(true);
  };

  useEffect(() => {
    if (!showToast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 1800);

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [showToast, toastMessage]);

  useEffect(() => {
    const toDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const checkDueToday = () => {
      if (!notificationsEnabled) return;
      const now = new Date();
      const todayKey = toDateKey(now);

      const dueTodayTasks = tasks.filter((task) => {
        if (!task?.start) return false;

        const startDate = task.start instanceof Date ? task.start : new Date(task.start);
        const taskDayKey = toDateKey(startDate);
        const notifyKey = `${task.id}-${taskDayKey}`;

        return taskDayKey === todayKey && !notifiedTaskDaysRef.current.has(notifyKey);
      });

      if (dueTodayTasks.length === 0) return;

      dueTodayTasks.forEach((task) => {
        const startDate = task.start instanceof Date ? task.start : new Date(task.start);
        notifiedTaskDaysRef.current.add(`${task.id}-${toDateKey(startDate)}`);
      });

      const taskTitles = dueTodayTasks.map((task) => `• ${task.title}`).join('\n');
      const dayMessage =
        dueTodayTasks.length === 1
          ? `1 activity today:\n${taskTitles}`
          : `${dueTodayTasks.length} activities today:\n${taskTitles}`;

      setToastMessage(dayMessage);
      setShowToast(true);
      void playNow('Task reminder', dayMessage);
    };

    checkDueToday();
    const intervalId = setInterval(checkDueToday, 60000);
    return () => clearInterval(intervalId);
  }, [tasks, notificationsEnabled, notificationSoundEnabled]);

  const onSelectTaskFromSearch = (task) => {
    if (!task?.start) { setShowSearch(false); return; }
    const startDate = task.start instanceof Date ? task.start : new Date(task.start);
    setSelectedDay(startDate);
    dayGridRef.current?.scrollToHour(startDate.getHours() + startDate.getMinutes() / 60);
    dayGridRef.current?.recenter();
    setShowSearch(false);
  };

  const onOpenContactUs = () => {
    setShowSettings(false);
    setTimeout(() => setShowContactUs(true), 120);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={isLandscape ? styles.layoutRow : styles.layoutCol}>
      <TopBar
        variant={isLandscape ? 'rail' : 'top'}
        monthLabel={monthLabel}
        onOpenMonthPicker={() => setShowMonthPicker(true)}
        onLongPressMonthLabel={
          viewMode === 'monthly'
            ? () => transitionTo('weekly')
            : () => transitionTo('monthly')
        }
        onPressDay={() => {
          const now = new Date();
          setSelectedDay(now);
          dayGridRef.current?.scrollToHour(now.getHours() + now.getMinutes() / 60);
          dayGridRef.current?.recenter();
        }}
        onOpenSettings={() => setShowSettings(true)}
        accountMenuOpen={accountMenuOpen}
        onAccountMenuOpenChange={setAccountMenuOpen}
      />

      <View style={[styles.body, isLandscape && styles.bodyRail]}>
        <Reanimated.View
          style={[StyleSheet.absoluteFillObject, viewTransitionStyle]}
          pointerEvents={isTransitioning ? 'none' : 'auto'}
        >
          <View
            style={StyleSheet.absoluteFillObject}
            pointerEvents={viewMode === 'monthly' ? 'none' : 'auto'}
          >
            <DayGridShell
              ref={dayGridRef}
              viewMode={viewMode}
              selectedDay={selectedDay}
              tasks={visibleTasks}
              onSelectedDayChange={setSelectedDay}
              onWeeklyViewportSettled={setWeeklyViewportStart}
              onWeeklyDayDoubleTap={(d) => {
                setSelectedDay(d);
                transitionTo('daily');
              }}
              onDailyHeaderDoubleTap={() => transitionTo('weekly')}
              onPinchIn={() => {
                // Daily does not support pinch in.
                if (viewMode === 'weekly') transitionTo('daily');
              }}
              onPinchOut={() => {
                if (viewMode === 'weekly') {
                  transitionTo('monthly');
                } else if (viewMode === 'daily') {
                  transitionTo('weekly');
                }
              }}
              // Daily -> Monthly
              onLargePinchOut={
                viewMode === 'daily' ? () => transitionTo('monthly') : undefined
              }
            />
          </View>

          {viewMode === 'monthly' && (
            <View style={StyleSheet.absoluteFillObject}>
              <MonthlyGrid
                selectedDay={selectedDay}
                tasks={visibleTasks}
                onDayPress={setSelectedDay}
                onDayDoubleTap={(d) => {
                  setSelectedDay(d);
                  transitionTo('daily');
                }}
                onSwipeLeft={navigateNext}
                onSwipeRight={navigatePrev}
                onPinchIn={() => transitionTo('weekly')}
                // Monthly -> Daily
                onLargePinchIn={() => transitionTo('daily')}
              />
            </View>
          )}
        </Reanimated.View>
      </View>
      </View>

      <BottomBar
        onSearch={() => {
          // When a filter is active, the search button doubles as a clear-filter
          // button: tap once to clear, tap again to open the modal normally.
          if (searchFilterIds) {
            setSearchFilterIds(null);
            return;
          }
          setShowSearch(true);
        }}
        onAdd={() => setShowAddTask(true)}
        onAi={() => setShowAiModal(true)}
        searchFilterActive={searchFilterIds != null}
      />

      <MonthPickerModal
        open={showMonthPicker}
        initialDate={monthPickerDisplayDate}
        onClose={() => setShowMonthPicker(false)}
        onSelect={(d) => {
          setSelectedDay(d);
          dayGridRef.current?.recenter();
          setShowMonthPicker(false);
        }}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        notificationsEnabled={notificationsEnabled}
        notificationSoundEnabled={notificationSoundEnabled}
        onToggleNotifications={setNotificationsEnabled}
        onToggleNotificationSound={setNotificationSoundEnabled}
        onOpenContactUs={onOpenContactUs}
        onPressProfile={() => {
          setShowSettings(false);
          setAccountMenuOpen(true);
        }}
      />

      <ContactUsModal
        open={showContactUs}
        onClose={() => setShowContactUs(false)}
        onSend={() => {
          setToastMessage('message sent');
          setShowToast(true);
        }}
      />

      <TaskManagementModal
        open={showAddTask}
        onClose={() => {
          setShowAddTask(false);
          setEditingTaskId(null);
        }}
        baseDate={selectedDay}
        tasks={tasks}
        onDeleteTask={deleteTask}
        editingTaskId={editingTaskId}
        onSetEditingTaskId={setEditingTaskId}
        onAdd={async (incoming) => {
          const { 
            title, 
            description, 
            start, 
            end, 
            priority, 
            folder_id, 
            duration_minutes, 
            task_group_id 
          } = incoming;
          addTaskWithReminder({ 
            title, 
            description, 
            start, 
            end, 
            priority,
            folder_id, 
            duration_minutes, 
            task_group_id 
          });

          void playNow('Task added', 'Activity added!');
          setToastMessage('Activity added!');
          setShowToast(true);
          setShowAddTask(false);
        }}
      />

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        tasks={tasks}
        onDeleteTask={deleteTask}
        onDeleteTaskGroup={deleteTaskGroup}
        onSelectTask={onSelectTaskFromSearch}
        onFilterGrid={(ids) => {
          setSearchFilterIds(ids);
          setShowSearch(false);
        }}
      />

      <AiCommandModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        baseDate={selectedDay}
        onTaskReady={onAssistantTaskReady}
      />

      {showToast && (
        <View pointerEvents="none" style={styles.toastOverlay}>
          <View style={styles.toastCard}>
            <Text style={styles.toastTitle}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  layoutCol: {
    flex: 1,
    flexDirection: 'column',
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
  bodyRail: {
    marginLeft: -1,
  },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  toastCard: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    alignItems: 'center',
    opacity: 0.9,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
