import { View, Text, Pressable, StyleSheet, DimensionValue } from 'react-native';
import { Task } from '../../../../viewmodel/hooks/useTasks';
import { getTaskPriorityDotColor } from '../../../../utils/taskPriority';
import { getFolderColor } from '../../../../utils/folderColor';
import { useFolderStore } from '../../../../viewmodel/stores/folderStore';
import { useCalendarStore } from '../../../../viewmodel/stores/calendarStore';

import { AppColors, useTheme, sizes } from '../../../../nativeTheme';
import React, { useMemo } from 'react';

interface TaskBlockProps {
  task: Task;
  rect: {
    left: DimensionValue;
    top: DimensionValue;
    width: DimensionValue;
    height: DimensionValue;
  };
  showDescription?: boolean;
  // True when a task spans multiple days.
  isContinuation?: boolean;
  isWeeklyMode?: boolean;
}

// const DEFAULT_BORDER = 'rgba(177, 145, 255, 0.6)';
// const DEFAULT_BG = 'rgba(209, 190, 255, 0.3)';

const DEFAULT_LIGHT_BG = 'rgba(255, 215, 186, 0.82)';
const DEFAULT_DARK_BG = 'rgba(255, 191, 145, 0.55)';
const DEFAULT_LIGHT_BORDER = 'rgba(255, 191, 145, 0.95)';
const DEFAULT_DARK_BORDER = 'rgba(255, 215, 186, 0.95)';

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isDarkColor = (hex: string) => {
  const h = hex.replace('#', '');

  if (h.length !== 6) return false;

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance < 128;
};

export default function TaskBlock({ task, rect, showDescription, isContinuation, isWeeklyMode }: TaskBlockProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const displayTitle = isContinuation ? `${task.title} (cont.)` : task.title;
  const dotColor = getTaskPriorityDotColor(task.priority);
  const folder = useFolderStore((s) =>
    task.folder_id != null ? s.folders.find((f) => f.id === task.folder_id) : undefined
  );

  const isDarkMode = isDarkColor(colors.bg);

  const folderHex = folder ? getFolderColor(folder.color) : null;
  const bg = folderHex
    ? hexToRgba(folderHex, isDarkMode ? 0.62 : 0.82)
    : isDarkMode
      ? DEFAULT_DARK_BG
      : DEFAULT_LIGHT_BG;

  const border = folderHex
    ? hexToRgba(folderHex, isDarkMode ? 1 : 0.95)
    : isDarkMode
      ? DEFAULT_DARK_BORDER
      : DEFAULT_LIGHT_BORDER;

  return (
    <View
      style={[
        showDescription ? styles.taskBlockExpanded : styles.taskBlock,
        isWeeklyMode && !showDescription && styles.taskBlockWeekly,
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >
      <View style={[styles.priorityDot, { backgroundColor: dotColor }]} />
      {task.completed ? (
        <Text style={styles.completedCheck}>✓</Text>
      ) : null}
      <Pressable
        style={styles.menuBtn}
        hitSlop={6}
        onPress={() => useCalendarStore.getState().requestEditTask(task.id)}
      >
        <Text style={styles.menuText}>⋮</Text>
      </Pressable>
      {showDescription && !isWeeklyMode ? (
        <>
          <Text style={styles.taskTitleExpanded}>{displayTitle}</Text>
          {task.description ? (
            <Text style={styles.taskDescription}>{task.description}</Text>
          ) : null}
        </>
      ) : (
        <>
            <Text
              style={[styles.taskTitle, isWeeklyMode && styles.taskTitleWeekly]}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
          {!isWeeklyMode && task.description ? (
            <Text 
              style={styles.taskDescriptionCompact} 
              numberOfLines={2}
            >
                {task.description}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  taskBlock: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(177, 145, 255, 0.6)',
    backgroundColor: 'rgba(209, 190, 255, 0.3)',
    padding: 8,
    paddingTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  taskBlockWeekly: {
    padding: 2,
    paddingTop: 14,
  },
  priorityDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  completedCheck: {
    position: 'absolute',
    top: 18,
    left: 4,
    fontSize: 12,
    fontWeight: '900',
    color: '#16a34a',
  },
  menuBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingTop: 0,
    paddingBottom: 4,
  },
  menuText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '900',
    // color: '#374151',
    color: colors.taskText,
  },
  taskTitle: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    // color: '#111827',
    color: colors.taskText,
  },
  taskBlockExpanded: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(177, 145, 255, 0.6)',
    backgroundColor: 'rgba(209, 190, 255, 0.3)',
    padding: 10,
    paddingTop: 22,
    paddingLeft: 22,
    overflow: 'hidden',
  },
  taskTitleExpanded: {
    fontSize: 14,
    fontWeight: '700',
    // color: '#111827',
    color: colors.taskText,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 12,
    fontWeight: '400',
    // color: '#374151',
    color: colors.taskText,
    lineHeight: 16,
  },
  taskDescriptionCompact: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '400',
    // color: '#374151',
    color: colors.taskText,
    marginTop: 2,
  },
  taskTitleWeekly: {
    position: 'absolute',
    width: 120,
    transform: [{ rotate: '-90deg' }],
  },
});
