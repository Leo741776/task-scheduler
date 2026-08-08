// @ts-nocheck
import apiClient from "./apiClient";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../constants";

export async function createActivity(activityData) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ACTIVITIES.CREATE, activityData);
    return response.data;
  } catch (error) {
    throw handleActivityApiError(error, "create");
  }
}

export async function getActivities() {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ACTIVITIES.LIST);
    return response.data;
  } catch (error) {
    throw handleActivityApiError(error, "fetch");
  }
}

export async function getActivity(activityId) {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ACTIVITIES.GET_ONE(activityId));
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
    throw handleActivityApiError(error, "fetch");
  }
}

export async function updateActivity(activityId, updates) {
  try {
    const response = await apiClient.patch(API_ENDPOINTS.ACTIVITIES.UPDATE(activityId), updates);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
    throw handleActivityApiError(error, "update");
  }
}

export async function deleteActivity(activityId) {
  try {
    await apiClient.delete(API_ENDPOINTS.ACTIVITIES.DELETE(activityId));
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
    throw handleActivityApiError(error, "delete");
  }
}

export async function deleteActivityGroup(taskGroupId) {
  try {
    // await apiClient.delete(`/activities/groups/${encodeURIComponent(taskGroupId)}`);
    await apiClient.delete(API_ENDPOINTS.ACTIVITIES.DELETE_GROUP(taskGroupId));
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
    throw handleActivityApiError(error, "delete group");
  }
}

function handleActivityApiError(error, operation) {
  if (!error.response) return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  const status = error.response.status;
  const data = error.response.data;
  switch (status) {
    case 400: return new Error(data?.detail || ERROR_MESSAGES.INVALID_DURATION);
    case 401: return new Error(ERROR_MESSAGES.UNAUTHORIZED);
    case 404: return new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
    case 422: return new Error(data?.detail || `Validation error on ${operation}`);
    case 500: return new Error(ERROR_MESSAGES.API_ERROR);
    default: return new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
  }
}
