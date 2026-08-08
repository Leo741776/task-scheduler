import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler, useWindowDimensions, Animated, Easing } from 'react-native';
import { AppColors, useTheme } from '../../../nativeTheme';
import { useKeyboard } from '../../../viewmodel/hooks/useKeyboard';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  shiftWithKeyboard?: boolean;
  headerExtra?: React.ReactNode;
}

// In-tree overlay rather than RNModal. On Android, RNModal opens
// in a separate native window which causes keyboard-resize issues.
export default function Modal({ open, title, onClose, children, shiftWithKeyboard = false, headerExtra }: ModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { height: keyboardHeight } = useKeyboard();
  const [cardHeight, setCardHeight] = useState(0);
  // Shift up by exactly the amount it overlaps the keyboard, plus a small gap, so it never gets clipped.
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isLandscape = screenW > screenH;
  const KEYBOARD_GAP = 12;
  const cardBottom = (screenH + cardHeight) / 2;
  const keyboardTop = screenH - keyboardHeight;
  const overlap = cardBottom + KEYBOARD_GAP - keyboardTop;

  // get rasterized between pixels and look fuzzy.
  // Skip the keyboard shift in landscape.
  const targetY =
    !isLandscape && shiftWithKeyboard && keyboardHeight > 0 && cardHeight > 0 && overlap > 0
      ? -Math.round(overlap)
      : 0;

  // Animate the keyboard shift so the card slides up smoothly instead of
  // snapping after keyboardDidShow fires. UI thread.
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: targetY,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetY, translateY]);
  // Preserve Android hardware-back closing behavior like RNModal:
  // when the overlay is open, intercept Back and close the modal
  // instead of letting the OS navigate the app. Doesn't apply to iOS.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!open) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            { maxHeight: screenH - 40, transform: [{ translateY }] },
          ]}
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        >
          <Pressable style={styles.cardInner} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.headerRight}>
                {headerExtra}
                <Pressable 
                  onPress={onClose} 
                  style={({ pressed }) => [
                    styles.closeBtn,
                    pressed && styles.pressed
                  ]}
                  hitSlop={8}
                >
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.body}>{children}</View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    maxWidth: 480,
    backgroundColor: colors.bg3,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: colors.panel,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: colors.muted,
  },
  body: {
    padding: 20,
  },
  pressed: {
    opacity: 0.5,
  }
});
