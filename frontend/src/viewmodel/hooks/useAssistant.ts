// @ts-nocheck
import { chatAssistant } from '../../model/services/assistantApi';

export function useAssistant() {
  const sendMessage = (payload) => chatAssistant(payload);

  return { sendMessage };
}
