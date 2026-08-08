import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AppColors, useTheme } from '../../../nativeTheme';

interface FAQCardProps {
  question: string;
  answer: string;
}

export default function FAQCard({ question, answer }: FAQCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [styles.questionRow, pressed && styles.pressed]}
      >
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && <Text style={styles.answer}>{answer}</Text>}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginVertical: 4,
    backgroundColor: colors.panel2,
    padding: 12,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  chevron: {
    fontSize: 16,
    color: colors.muted,
  },
  answer: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
  },
  pressed: {
    opacity: 0.5,
  },
});
