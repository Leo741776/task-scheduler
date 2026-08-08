// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import Modal from './Modal';
import { useAssistant } from '../../../viewmodel/hooks/useAssistant';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';

export default function AiCommandModal({ open, onClose, onTaskReady, baseDate }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);
  const { sendMessage } = useAssistant();
  const { height: windowH } = useWindowDimensions();
  
  const messageListMaxH = Math.max(120, Math.min(300, windowH - 220));

  const initialAssistantMessage = useMemo(() => ({
    role: 'assistant',
    content: "Hi! Tell me about your task. I need its: name, day, time (AM/PM), and duration.",
  }), []);

  useEffect(() => {
    if (!open) return;
    setMessages([initialAssistantMessage]);
    setInputValue('');
    setError('');
    setIsSending(false);
  }, [open, initialAssistantMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const outgoing = [...messages, { role: 'user', content: trimmed }];
    setMessages(outgoing);
    setInputValue('');
    setError('');
    setIsSending(true);

    try {
      const sourceDate = baseDate instanceof Date ? baseDate : new Date();
      const response = await sendMessage({
        messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
        active_year: sourceDate.getFullYear(),
        active_month: sourceDate.getMonth() + 1,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply_text || 'Please share the missing details.' }]);

      if (response.is_complete && response.task_draft) {
        onTaskReady?.(response.task_draft);
      }
    } catch (err) {
      setError(err?.message || 'Assistant request failed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal open={open} title="Assistant" onClose={onClose} shiftWithKeyboard>
      <View style={styles.container}>
        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          style={[styles.messageList, { maxHeight: messageListMaxH }]}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, i) => (
            <View
              key={`${msg.role}-${i}`}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text style={styles.bubbleText}>{msg.content}</Text>
            </View>
          ))}
          {isSending && (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Text style={styles.thinkingText}>Thinking…</Text>
            </View>
          )}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Gym on day 18 at 7:30 PM for 1 hour…"
            placeholderTextColor={colors.muted}
            multiline
            autoFocus
            returnKeyType="send"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleSend}
          />
          <Pressable style={[styles.sendBtn, isSending && styles.sendBtnDisabled]} onPress={handleSend} disabled={isSending}>
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    gap: 10,
  },
  messageList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  messageListContent: {
    gap: 8,
  },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(106, 166, 255, 0.18)',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.panel2,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  thinkingText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.panel2,
    height: 60,
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
