// @ts-nocheck
import apiClient from "./apiClient";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../constants";

export async function generateSchedule(scheduleData) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.SCHEDULES.CREATE, scheduleData);
    return formatScheduleForUI(response.data);
  } catch (error) {
    throw handleScheduleApiError(error, "generate");
  }
}

export async function getSchedules() {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SCHEDULES.LIST);
    return response.data.map(formatScheduleForUI);
  } catch (error) {
    throw handleScheduleApiError(error, "fetch");
  }
}

function formatScheduleForUI(schedule) {
  return {
    ...schedule,
    start_time: schedule.start_time instanceof Date ? schedule.start_time : new Date(schedule.start_time),
    end_time: schedule.end_time instanceof Date ? schedule.end_time : new Date(schedule.end_time),
    created_at: schedule.created_at instanceof Date ? schedule.created_at : new Date(schedule.created_at),
    schedule: (schedule.schedule || []).map((item) => ({
      ...item,
      start_time: item.start_time instanceof Date ? item.start_time : new Date(item.start_time),
      end_time: item.end_time instanceof Date ? item.end_time : new Date(item.end_time),
    })),
  };
}

function handleScheduleApiError(error, operation) {
  if (!error.response) return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  const status = error.response.status;
  const data = error.response.data;
  switch (status) {
    case 400: return new Error(data?.detail || "Invalid input.");
    case 404: return new Error(data?.detail || "Schedule not found.");
    case 422: return new Error(data?.detail || "Validation error.");
    case 500: return new Error(ERROR_MESSAGES.API_ERROR);
    default: return new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
  }
}
