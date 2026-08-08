import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';

import React, { useMemo } from 'react';

interface BottomBarProps {
  onSearch: () => void;
  onAi: () => void;
  onAdd: () => void;
  searchFilterActive?: boolean;
}

export default function BottomBar({ onSearch, onAi, onAdd, searchFilterActive = false }: BottomBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.bottomBar, { bottom: insets.bottom + 3.5 }]}>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.actionSmall,
          searchFilterActive && styles.searchFilterActive,
          pressed && styles.pressedSearch,
        ]}
        onPress={onSearch}
      >
        <Ionicons name="search" size={22} color="#ffffff" />
      </Pressable>
      
      <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionAi, pressed && styles.pressedAi]} onPress={onAi}>
        <Image
          source={require('../../../../../assets/images/planned-ai-btn-icon.png')}
          style={styles.aiIcon}
        />
      </Pressable>
      <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionSmall, pressed && styles.pressedAdd]} onPress={onAdd}>
        <Ionicons name="add" size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: 'transparent',
  },
  actionBtn: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  actionSmall: {
    width: 48,
    height: 48,
    backgroundColor: colors.bottomBtn,
  },
  actionAi: {
    width: 64,
    height: 64,
    backgroundColor: '#10b981',
    marginBottom: 10,
  },
  aiIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  pressedSearch: {
    backgroundColor: '#1d6eea',
    transform: [{ scale: 0.93 }],
  },
  searchFilterActive: {
    backgroundColor: '#e53e3e',
  },
  pressedAdd: {
    backgroundColor: '#e53e3e',
    transform: [{ scale: 0.93 }],
  },
  pressedAi: {
    backgroundColor: '#7c3aed',
    transform: [{ scale: 0.93 }],
  },
});
