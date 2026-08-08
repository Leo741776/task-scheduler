// @ts-nocheck
export const API_CONFIG = {
  BASE_URL: "http://127.0.0.1:8000",
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  HEALTH: "/health",
  ROOT: "/",
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },
  ACTIVITIES: {
    BASE: "/activities",
    LIST: "/activities",
    CREATE: "/activities",
    GET_ONE: (id) => `/activities/${id}`,
    UPDATE: (id) => `/activities/${id}`,
    DELETE: (id) => `/activities/${id}`,
    DELETE_GROUP: (taskGroupId) => `/activities/groups/${encodeURIComponent(taskGroupId)}`,
  },
  FOLDERS: {
    BASE: "/folders",
    LIST: "/folders",
    CREATE: "/folders",
    UPDATE: (id) => `/folders/${id}`,
    DELETE: (id) => `/folders/${id}`,
  },
  SCHEDULES: {
    BASE: "/schedules",
    CREATE: "/schedules",
    LIST: "/schedules",
    GET_ONE: (id) => `/schedules/${id}`,
  },
  ASSISTANT: {
    CHAT: "/assistant/chat",
  },
};

export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.LOW]: "#4CAF50",
  [PRIORITY_LEVELS.MEDIUM]: "#FF9800",
  [PRIORITY_LEVELS.HIGH]: "#FF5722",
  [PRIORITY_LEVELS.URGENT]: "#B71C1C",
};

export const TIME_CONFIG = {
  WORK_START_HOUR: 9,
  WORK_END_HOUR: 17,
  HOURS_PER_DAY: 24,
  MIN_SLOT_DURATION_MINUTES: 15,
  DEFAULT_TASK_DURATION_MINUTES: 60,
  DAYS_IN_WEEK: 7,
  WEEKS_DISPLAYED: 4,
};

export const VALIDATION = {
  ACTIVITY: {
    TITLE_MIN_LENGTH: 1,
    TITLE_MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 1000,
    DURATION_MIN_MINUTES: 5,
    DURATION_MAX_MINUTES: 480,
  },
  USER: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 6,
  },
};

export const UI_CONFIG = {
  ANIMATION_DURATION_SHORT: 200,
  ANIMATION_DURATION_MEDIUM: 300,
  ANIMATION_DURATION_LONG: 500,
  MODAL_Z_INDEX_BASE: 1000,
  DIALOG_MAX_WIDTH: 600,
  SPINNER_SIZE_SMALL: 24,
  SPINNER_SIZE_MEDIUM: 40,
  SPINNER_SIZE_LARGE: 60,
  TOAST_DURATION_SHORT: 2000,
  TOAST_DURATION_MEDIUM: 5000,
  TOAST_DURATION_LONG: 8000,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  API_ERROR: "An API error occurred. Please try again.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  SOMETHING_WENT_WRONG: "Something went wrong. Please try again.",
  REQUIRED_FIELD: "This field is required.",
  INVALID_EMAIL: "Please enter a valid email address.",
  PASSWORD_TOO_SHORT: "Password must be at least 6 characters.",
  PASSWORDS_DONT_MATCH: "Passwords do not match.",
  USERNAME_TOO_SHORT: "Username must be at least 3 characters.",
  INVALID_DURATION: "Duration must be between 5 and 480 minutes.",
  ACTIVITY_NOT_FOUND: "Activity not found.",
  ACTIVITY_DELETED: "Activity was deleted.",
  NO_ACTIVITIES: "No activities found. Add some activities first.",
  FOLDER_NOT_FOUND: "Folder not found.",
  FOLDER_NAME_TAKEN: "A folder with this name already exists.",
  INVALID_TIME_RANGE: "End time must be after start time.",
  SCHEDULE_GENERATION_FAILED: "Failed to generate schedule. Please try again.",
};

export const SUCCESS_MESSAGES = {
  ACTIVITY_CREATED: "Activity created successfully.",
  ACTIVITY_UPDATED: "Activity updated successfully.",
  ACTIVITY_DELETED: "Activity deleted successfully.",
  SCHEDULE_GENERATED: "Schedule generated successfully.",
  LOGIN_SUCCESS: "Logged in successfully.",
  REGISTER_SUCCESS: "Account created successfully.",
  SETTINGS_SAVED: "Settings saved successfully.",
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_ID: "user_id",
  USERNAME: "username",
  USER_PREFERENCES: "user_preferences",
  THEME: "theme_preference",
  CALENDAR_VIEW: "calendar_view_preference",
};

export const DEFAULTS = {
  ACTIVITY: {
    PRIORITY: PRIORITY_LEVELS.MEDIUM,
    DURATION_MINUTES: TIME_CONFIG.DEFAULT_TASK_DURATION_MINUTES,
  },
  PAGINATION: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
  },
};
