import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_CONFIG } from "../../constants";

// Auth bridge contract. The Model layer owns the shape; the ViewModel
// wires concrete implementations at app startup via configureAuthBridge.
// This keeps the dependency arrow Model <- ViewModel intact.
export interface AuthBridge {
  getToken: () => string | null;
  onUnauthorized: () => void;
}

let authBridge: AuthBridge = {
  getToken: () => null,
  onUnauthorized: () => {},
};

export function configureAuthBridge(bridge: AuthBridge): void {
  authBridge = bridge;
}

/**
 * Dynamically determine backend URL based on platform.
 * This avoids hardcoding your PC IP address.
 */
const getBackendUrl = (): string => {
  // Web can safely use localhost
  if (Platform.OS === "web") {
    return "http://127.0.0.1:8000";
  }

  // Expo / mobile: extract host machine IP from Expo
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    const hostIp = debuggerHost.split(":")[0];
    return `http://${hostIp}:8000`;
  }

  // Fallback (rare case)
  return "http://127.0.0.1:8000";
};

const BACKEND_URL = getBackendUrl();

console.log("API Base URL:", BACKEND_URL);

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach JWT token automatically if available
 */
apiClient.interceptors.request.use((config) => {
  const token = authBridge.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// On 401 from a protected endpoint, notify the bridge so the app can
// clear auth and route back to login. Skip auth endpoints so a failed
// login or register does not trigger an unauthorized handler.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      authBridge.onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default apiClient;