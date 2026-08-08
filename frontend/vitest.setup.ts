import { vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: undefined,
    manifest: undefined,
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
}));
