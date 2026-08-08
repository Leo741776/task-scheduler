// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Modal from './Modal';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';

const YEAR_MIN = 1970;
const YEAR_MAX = 2070;
const ITEM_H = 44;

function clampYear(value) {
  return Math.min(YEAR_MAX, Math.max(YEAR_MIN, value));
}

function WheelPicker({ items, value, onChange, itemToLabel, styles }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const idx = items.findIndex((item) => item === value);
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
          if (items[bounded] !== value) onChange(items[bounded]);
        }}
      >
        <View style={{ height: ITEM_H }} />
        {items.map((item) => (
          <Pressable
            key={String(item)}
            style={styles.wheelItem}
            onPress={() => {
              onChange(item);
              const idx = items.findIndex((i) => i === item);
              scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: true });
            }}
          >
            <Text style={[styles.wheelItemText, item === value && styles.wheelItemSelected]}>
              {itemToLabel(item)}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: ITEM_H }} />
      </ScrollView>
    </View>
  );
}

export default function MonthPickerModal({ open, initialDate, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [year, setYear] = useState(() => clampYear(initialDate.getFullYear()));
  const [month, setMonth] = useState(() => initialDate.getMonth());

  const years = useMemo(() => Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  // prevOpenRef guards against overwriting the user's in-modal wheel scrolls.
  const prevOpenRef = useRef(open);
  if (open && !prevOpenRef.current) {
    setYear(clampYear(initialDate.getFullYear()));
    setMonth(initialDate.getMonth());
  }
  prevOpenRef.current = open;

  return (
    <Modal open={open} title="Select Date" onClose={onClose}>
      <View style={styles.wheelRow}>
        <WheelPicker
          items={months}
          value={month}
          onChange={setMonth}
          itemToLabel={(v) => new Date(2000, v, 1).toLocaleString(undefined, { month: 'long' })}
          styles={styles}
        />
        <WheelPicker
          items={years}
          value={year}
          onChange={setYear}
          itemToLabel={(v) => String(v)}
          styles={styles}
        />
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.btnCancel} onPress={onClose}>
          <Text style={styles.btnCancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.btnGo} onPress={() => onSelect(new Date(clampYear(year), month, 1))}>
          <Text style={styles.btnGoText}>Go</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  wheelRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 20,
  },
  wheelOuter: {
    flex: 1,
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
  wheelScroll: {
    flex: 1,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 15,
    color: colors.muted,
  },
  wheelItemSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnCancel: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: {
    fontSize: 14,
    color: colors.text,
  },
  btnGo: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  btnGoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
