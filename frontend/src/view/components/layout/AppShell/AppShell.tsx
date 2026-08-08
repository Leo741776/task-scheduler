import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return <View style={styles.appShell}>{children}</View>;
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
    appShell: {
      flex: 1,
      backgroundColor: colors.bg,
    },
});
