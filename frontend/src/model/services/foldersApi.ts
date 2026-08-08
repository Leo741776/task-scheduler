// @ts-nocheck
import apiClient from "./apiClient";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../constants";

export async function createFolder(folderData) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.FOLDERS.CREATE, folderData);
    return response.data;
  } catch (error) {
    throw handleFolderApiError(error, "create");
  }
}

export async function getFolders() {
  try {
    const response = await apiClient.get(API_ENDPOINTS.FOLDERS.LIST);
    return response.data;
  } catch (error) {
    throw handleFolderApiError(error, "fetch");
  }
}

export async function updateFolder(folderId, updates) {
  try {
    const response = await apiClient.patch(API_ENDPOINTS.FOLDERS.UPDATE(folderId), updates);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    throw handleFolderApiError(error, "update");
  }
}

export async function deleteFolder(folderId) {
  try {
    await apiClient.delete(API_ENDPOINTS.FOLDERS.DELETE(folderId));
  } catch (error) {
    if (error.response?.status === 404) throw new Error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    throw handleFolderApiError(error, "delete");
  }
}

function handleFolderApiError(error, operation) {
  if (!error.response) return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  const status = error.response.status;
  const data = error.response.data;
  switch (status) {
    case 400: return new Error(data?.detail || `Invalid folder ${operation} request`);
    case 401: return new Error(ERROR_MESSAGES.UNAUTHORIZED);
    case 404: return new Error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    case 409: return new Error(ERROR_MESSAGES.FOLDER_NAME_TAKEN);
    case 422: return new Error(data?.detail || `Validation error on ${operation}`);
    case 500: return new Error(ERROR_MESSAGES.API_ERROR);
    default: return new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
  }
}
