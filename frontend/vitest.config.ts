import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'src/model/services/**',
        'src/viewmodel/stores/**',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/model/services/notifications.ts',
        'src/viewmodel/stores/calendarStore.ts',
        'src/viewmodel/stores/preferencesStore.ts',
      ],
    },
  },
});
