import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';
import { useAuth } from '../../../../viewmodel/hooks/useAuth';
import { TIME_AXIS_W } from '../../calendar/DayGrid/DayGrid';

import { Ionicons } from '@expo/vector-icons';

function useCurrentDayNumber() {
    const [currentDayNumber, setCurrentDayNumber] = useState(() => new Date().getDate());

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentDayNumber(new Date().getDate());
    }, 60_000);

    return () => clearInterval(id);
  }, []);

  return currentDayNumber;
}

interface TopBarProps {
  monthLabel: string;
  onOpenMonthPicker: () => void;
  onLongPressMonthLabel?: () => void;
  onOpenSettings: () => void;
  onPressDay?: () => void;
  variant?: 'top' | 'rail';
  accountMenuOpen?: boolean;
  onAccountMenuOpenChange?: (open: boolean) => void;
}

const LONG_PRESS_MS = 200;

export default function TopBar({
  monthLabel,
  onOpenMonthPicker,
  onLongPressMonthLabel,
  onOpenSettings,
  onPressDay,
  variant = 'top',
  accountMenuOpen: accountMenuOpenProp,
  onAccountMenuOpenChange,
}: TopBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
    
  const currentDayNumber = useCurrentDayNumber();
  const { user, logout } = useAuth();
  const [accountMenuOpenLocal, setAccountMenuOpenLocal] = useState(false);
  const accountMenuOpen = accountMenuOpenProp ?? accountMenuOpenLocal;
  const setAccountMenuOpen = (open: boolean) => {
    if (onAccountMenuOpenChange) onAccountMenuOpenChange(open);
    else setAccountMenuOpenLocal(open);
  };
  const isRail = variant === 'rail';
  const { width: windowW, height: windowH } = useWindowDimensions();

  const monthLabelGesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(LONG_PRESS_MS)
      .runOnJS(true)
      .onStart(() => {
        if (onLongPressMonthLabel) onLongPressMonthLabel();
      });
    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) onOpenMonthPicker();
      });
    return Gesture.Exclusive(longPress, singleTap);
  }, [onOpenMonthPicker, onLongPressMonthLabel]);

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logout();
  };

  // In rail mode the MonthYear display is two lines.
  const railMonthLabel = useMemo(() => {
    const parts = monthLabel.trim().split(/\s+/);
    if (parts.length === 0) return monthLabel;
    const head = parts[0].slice(0, 3);
    const rest = parts.slice(1).join(' ');
    return rest ? `${head}\n${rest}` : head;
  }, [monthLabel]);

  // Rail abbreviates the account button to a single letter.
  const accountInitials = user
    ? isRail
      ? user.username.slice(0, 1)
      : user.username.slice(0, 3)
    : '';

  return (
    <View style={isRail ? styles.rail : styles.topBar}>
      {user && (
        <Pressable
          style={({ pressed }) => [
            isRail ? styles.accountPillRail : styles.accountPill,
            pressed && styles.pressed,
          ]}
          onPress={() => setAccountMenuOpen(!accountMenuOpen)}
        >
          <Text style={styles.accountPillText} numberOfLines={1}>
            {accountInitials}
          </Text>
        </Pressable>
      )}

      <View style={isRail ? styles.railSide : styles.side}>
        <GestureDetector gesture={monthLabelGesture}>
          <View style={isRail ? styles.tbBtnRail : styles.tbBtn}>
            <Text
              style={[styles.btnText, isRail && styles.btnTextRail]}
              numberOfLines={isRail ? 2 : 1}
            >
              {isRail ? railMonthLabel : monthLabel}
            </Text>
          </View>
        </GestureDetector>
      </View>

      {isRail && <View style={styles.railSpacer} />}

      <View style={isRail ? styles.railSide : styles.side}>
        <Pressable style={({ pressed }) => [styles.dayBtn, pressed && styles.pressed]} onPress={onPressDay}>
          <Text style={styles.dayBtnText}>{currentDayNumber}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [isRail ? styles.tbBtnRail : styles.tbBtn, pressed && styles.pressed]} onPress={onOpenSettings}> 
          <Ionicons name="menu" size={35} color={colors.text} />
        </Pressable>
      </View>

      {accountMenuOpen && user && (
        <>
          <Pressable
            style={[styles.accountBackdrop, { width: windowW, height: windowH }]}
            onPress={() => setAccountMenuOpen(false)}
          />
          <View style={isRail ? styles.accountDropdownRail : styles.accountDropdown}>
            <Text style={styles.accountDropdownHeader} numberOfLines={1} ellipsizeMode="tail">
              Signed in as {user.username}
            </Text>
            <View style={styles.accountDropdownDivider} />
            <Pressable
              style={({ pressed }) => [styles.accountDropdownRow, pressed && styles.pressed]}
              onPress={handleLogout}
            >
              <Text style={styles.accountDropdownLogoutText}>Logout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  topBar: {
    height: sizes.topbarH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: TIME_AXIS_W,
    paddingRight: 6,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rail: {
    width: sizes.railW,
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  railSpacer: {
    flex: 1,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  railSide: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  tbBtn: {
    // borderWidth: 2,
    // backgroundColor: colors.topBtn3,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tbBtnRail: {
    // borderWidth: 1,
    // backgroundColor: colors.topBtn3,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: sizes.railW - 12,
    alignItems: 'center',
  },
  btnText: {
    // color: colors.text4,
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
  },
  btnTextRail: {
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  dayBtn: {
    width: 33,
    height: 33,
    // borderWidth: 2,
    backgroundColor: '#FFDC73',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnText: {
    color: colors.text2,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.5,
  },
  accountPill: {
    position: 'absolute',
    left: 10,
    top: (sizes.topbarH - 28) / 2,
    width: TIME_AXIS_W - 8,
    height: 28,
    // borderWidth: 1,
    // borderColor: colors.border2,
    backgroundColor: colors.accent,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPillRail: {
    width: sizes.railW - 16,
    height: 32,
    // borderWidth: 1,
    backgroundColor: colors.accent,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPillText: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accountBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50,
  },
  accountDropdown: {
    position: 'absolute',
    top: sizes.topbarH + 4,
    left: 4,
    minWidth: 200,
    zIndex: 51,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  accountDropdownRail: {
    position: 'absolute',
    top: 8,
    left: sizes.railW + 4,
    minWidth: 200,
    zIndex: 51,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  accountDropdownHeader: {
    color: colors.muted,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accountDropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  accountDropdownRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountDropdownLogoutText: {
    color: colors.errorDark,
    fontSize: 14,
    fontWeight: '700',
  },
});
