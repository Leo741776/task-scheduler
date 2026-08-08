import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import Modal from './Modal';
import { useAuth } from '../../../viewmodel/hooks/useAuth';
import FAQCard from './FAQCard';

import React, { useMemo } from 'react';
import { AppColors, useTheme } from '../../../nativeTheme';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  onToggleNotifications: (value: boolean) => void;
  onToggleNotificationSound: (value: boolean) => void;
  onOpenContactUs: () => void;
  onPressProfile?: () => void;
}

export default function SettingsModal({
  open,
  onClose,
  notificationsEnabled,
  notificationSoundEnabled,
  onToggleNotifications,
  onToggleNotificationSound,
  onOpenContactUs,
  onPressProfile,
}: SettingsModalProps) {
  const { isDark, setIsDark, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user } = useAuth();
  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <View style={styles.container}>
        {user && (
          <Pressable
            style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
            onPress={onPressProfile}
          >
            <Text style={styles.profileName} numberOfLines={1}>
              {user.username}
            </Text>
            <Text style={styles.profileChevron}>›</Text>
          </Pressable>
        )}

        <View style={styles.row}>
          <Text style={styles.item}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={setIsDark}
            trackColor={{
              false: colors.borderSolid,
              true: colors.accent,
            }}
            thumbColor={isDark ? colors.text : '#fff'}
            ios_backgroundColor={colors.borderSolid}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.item}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{
              false: colors.borderSolid,
              true: colors.accent,
            }}
            thumbColor={isDark ? colors.text : '#fff'}
            ios_backgroundColor={colors.borderSolid}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.item}>Notification sound</Text>
          <Switch
            value={notificationSoundEnabled}
            onValueChange={onToggleNotificationSound}
            trackColor={{
              false: colors.borderSolid,
              true: colors.accent,
            }}
            thumbColor={isDark ? colors.text : '#fff'}
            ios_backgroundColor={colors.borderSolid}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
          onPress={onOpenContactUs}
        >
          <Text style={styles.contactButtonText}>Contact us</Text>
        </Pressable>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>FAQ</Text>
          <FAQCard
            question="What can I use this app for?"
            answer="You can create tasks, add reminders, and use AI to help plan your schedule."
          />
          <FAQCard
            question="How do I create a task?"
            answer="Tap the add button, enter a task name, choose a due date and priority, then save it."
          />
          <FAQCard
            question="Can I create tasks using AI?"
            answer="Yes. You can type something like “Remind me to submit my essay Friday at 5 PM,” and the app can turn it into a scheduled task."
          />
          <FAQCard
            question="Can I view my tasks on a calendar?"
            answer="Yes. Tasks with due dates or scheduled times can appear on your calendar."
          />
          <FAQCard
            question="Why didn’t I get a notification?"
            answer="Notifications may be turned off in your phone settings, Do Not Disturb may be enabled, or notifications might be disabled in the app settings."
          />
          <FAQCard
            question="Can I set task priorities?"
            answer="Yes. Tasks can be marked as low, medium, or high priority."
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
    container: {
      gap: 14,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    item: {
      fontSize: 14,
      color: colors.text,
    },
    contactButton: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.panel2,
    },
    contactButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.panel2,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    profileChevron: {
      fontSize: 22,
      color: colors.muted,
      marginLeft: 8,
    },
    pressed: {
      opacity: 0.5,
    },
    faqSection: {
      marginTop: 18,
    },
    faqTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
      color: colors.text,
    },
  });
