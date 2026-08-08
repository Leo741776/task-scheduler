// @ts-nocheck
import apiClient from "./apiClient";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../constants";

export async function chatAssistant(payload) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ASSISTANT.CHAT, payload);
    return response.data;
  } catch (error) {
    if (!error.response) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      throw new Error(detail);
    }
    throw new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
  }
}
