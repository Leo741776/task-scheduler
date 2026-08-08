import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  return {
    user,
    token,
    isLoggedIn: user !== null && token !== null,
    login,
    register,
    logout,
    initializeAuth,
  };
}
