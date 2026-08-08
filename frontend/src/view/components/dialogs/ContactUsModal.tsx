import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import Modal from './Modal';
import { AppColors, useTheme, sizes } from '../../../nativeTheme';

import React, { useMemo } from 'react';

interface ContactUsModalProps {
  open: boolean;
  onClose: () => void;
  onSend: () => void;
}

export default function ContactUsModal({ open, onClose, onSend }: ContactUsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleCancel = () => {
    setName('');
    setEmail('');
    setMessage('');
    onClose();
  };

  const handleSend = () => {
    // Placeholder send action for now.
    setName('');
    setEmail('');
    setMessage('');
    onClose();
    onSend();
  };

  return (
    <Modal open={open} title="Contact us" onClose={handleCancel}>
      <View style={styles.container}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message"
          placeholderTextColor={colors.muted}
          multiline
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={handleCancel}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.btnSend} onPress={handleSend}>
            <Text style={styles.btnSendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.panel2,
  },
  messageInput: {
    minHeight: 100,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  btnCancel: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: {
    fontSize: 14,
    color: colors.text,
  },
  btnSend: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  btnSendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
