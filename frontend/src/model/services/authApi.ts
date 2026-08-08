// @ts-nocheck
import apiClient from "./apiClient";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../constants";

export async function registerUser(userData) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  } catch (error) {
    throw handleAuthApiError(error, "register");
  }
}

export async function loginUser(credentials) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    const { access_token, user } = response.data;
    return { token: access_token, user };
  } catch (error) {
    throw handleAuthApiError(error, "login");
  }
}

function handleAuthApiError(error, operation) {
  if (!error.response) return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  const status = error.response.status;
  const data = error.response.data;
  switch (status) {
    case 400:
      if (data?.detail?.includes("already exists")) {
        return new Error("User already exists. Please login or use a different email/username.");
      }
      return new Error(data?.detail || "Invalid input. Please check your data.");
    case 401:
      return new Error(ERROR_MESSAGES.UNAUTHORIZED);
    case 404:
      return new Error(ERROR_MESSAGES.NOT_FOUND);
    case 422:
      return new Error(data?.detail || "Validation error. Please check your input.");
    case 500:
      return new Error(ERROR_MESSAGES.API_ERROR);
    default:
      return new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
  }
}
