import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<any>('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => ({
      getItem: () => null,
      setItem: () => null,
      removeItem: () => null,
    }),
  };
});

const mocks = vi.hoisted(() => ({
  taskStoreClear: vi.fn(),
  folderStoreClear: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../viewmodel/stores/taskStore', () => ({
  useTaskStore: {
    getState: () => ({ clear: mocks.taskStoreClear }),
  },
}));

vi.mock('../viewmodel/stores/folderStore', () => ({
  useFolderStore: {
    getState: () => ({ clear: mocks.folderStoreClear }),
  },
}));

vi.mock('../model/services/authApi', () => ({
  loginUser: mocks.loginUser,
  registerUser: mocks.registerUser,
}));

import { useAuthStore } from '../viewmodel/stores/authStore';

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null });
  mocks.taskStoreClear.mockClear();
  mocks.folderStoreClear.mockClear();
  mocks.loginUser.mockReset();
  mocks.registerUser.mockReset();
});

const sampleUser = { id: 1, username: 'alice', email: 'alice@example.com' };

describe('authStore.logout', () => {
  it('clears both user and token from store state', () => {
    useAuthStore.setState({ user: sampleUser, token: 'tok.tok.tok' });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('calls useTaskStore.getState().clear() to drop loaded working state', () => {
    useAuthStore.setState({ user: sampleUser, token: 'tok' });
    useAuthStore.getState().logout();
    expect(mocks.taskStoreClear).toHaveBeenCalledTimes(1);
  });

  it('calls useFolderStore.getState().clear() to drop loaded folders', () => {
    useAuthStore.setState({ user: sampleUser, token: 'tok' });
    useAuthStore.getState().logout();
    expect(mocks.folderStoreClear).toHaveBeenCalledTimes(1);
  });
});

// The isLoggedIn predicate lives in the useAuth hook (viewmodel/hooks/
// useAuth.ts) and is computed as: user !== null && token !== null.
// Testing the hook directly would require React's render context. These
// tests instead lock the data SHAPE the hook depends on: store state combos
// produce the expected boolean under that same AND predicate.

const computeIsLoggedIn = (state: {
  user: unknown;
  token: unknown;
}): boolean => state.user !== null && state.token !== null;

describe('authStore state shape underlying useAuth.isLoggedIn', () => {
  it('predicate is true only when both user and token are non-null', () => {
    useAuthStore.setState({ user: sampleUser, token: 'tok' });
    expect(computeIsLoggedIn(useAuthStore.getState())).toBe(true);
  });

  it('predicate is false when user is null even if token is set', () => {
    useAuthStore.setState({ user: null, token: 'tok' });
    expect(computeIsLoggedIn(useAuthStore.getState())).toBe(false);
  });

  it('predicate is false when token is null even if user is set', () => {
    useAuthStore.setState({ user: sampleUser, token: null });
    expect(computeIsLoggedIn(useAuthStore.getState())).toBe(false);
  });
});

describe('authStore.login', () => {
  it('calls authApi.loginUser with the supplied username and password', async () => {
    mocks.loginUser.mockResolvedValue({ token: 'tok', user: sampleUser });
    await useAuthStore.getState().login('alice', 'password123');
    expect(mocks.loginUser).toHaveBeenCalledWith({
      username: 'alice',
      password: 'password123',
    });
  });

  it('stores the returned user and token on success', async () => {
    mocks.loginUser.mockResolvedValue({
      token: 'jwt.value.here',
      user: sampleUser,
    });
    await useAuthStore.getState().login('alice', 'password123');
    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt.value.here');
    expect(state.user).toEqual(sampleUser);
  });

  it('propagates API errors and leaves store state untouched', async () => {
    mocks.loginUser.mockRejectedValue(new Error('Invalid credentials'));
    useAuthStore.setState({ user: null, token: null });
    await expect(
      useAuthStore.getState().login('alice', 'wrong')
    ).rejects.toThrow('Invalid credentials');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
