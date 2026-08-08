import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../model/services/apiClient', () => ({ default: apiMock }));

import { loginUser, registerUser } from '../model/services/authApi';

beforeEach(() => {
  apiMock.post.mockReset();
});

describe('authApi.registerUser', () => {
  it('POSTs /auth/register with the supplied user data and returns response.data', async () => {
    apiMock.post.mockResolvedValue({
      data: { id: 1, username: 'alice', email: 'alice@example.com' },
    });
    const payload = {
      first_name: 'Alice',
      last_name: 'Smith',
      username: 'alice',
      password: 'password123',
      email: 'alice@example.com',
    };
    const result = await registerUser(payload as any);
    expect(apiMock.post).toHaveBeenCalledWith('/auth/register', payload);
    expect(result).toEqual({
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
    });
  });

  it('maps 400 with "already exists" detail to the user-already-exists message', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 400, data: { detail: 'User already exists' } },
    });
    await expect(registerUser({} as any)).rejects.toThrow(
      'User already exists. Please login or use a different email/username.'
    );
  });

  it('maps 400 without "already exists" to the supplied detail (or fallback)', async () => {
    apiMock.post.mockRejectedValue({
      response: {
        status: 400,
        data: { detail: 'first_name: field required' },
      },
    });
    await expect(registerUser({} as any)).rejects.toThrow(
      'first_name: field required'
    );
  });
});

describe('authApi.loginUser', () => {
  it('POSTs /auth/login and maps {access_token, user} to {token, user}', async () => {
    const user = { id: 7, username: 'alice', email: 'alice@example.com' };
    apiMock.post.mockResolvedValue({
      data: { access_token: 'jwt.value.here', token_type: 'bearer', user },
    });
    const result = await loginUser({
      username: 'alice',
      password: 'password123',
    } as any);
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      username: 'alice',
      password: 'password123',
    });
    expect(result).toEqual({ token: 'jwt.value.here', user });
  });

  it('maps 401 to the unauthorized message', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 401, data: { detail: 'Invalid credentials' } },
    });
    await expect(
      loginUser({ username: 'a', password: 'b' } as any)
    ).rejects.toThrow('You are not authorized to perform this action.');
  });

  it('maps 404 to the not-found message', async () => {
    apiMock.post.mockRejectedValue({
      response: { status: 404, data: { detail: 'User not found' } },
    });
    await expect(
      loginUser({ username: 'nobody', password: 'x' } as any)
    ).rejects.toThrow('The requested resource was not found.');
  });

  it('maps an error without a response to the network-error message', async () => {
    apiMock.post.mockRejectedValue(new Error('Network Error'));
    await expect(
      loginUser({ username: 'a', password: 'b' } as any)
    ).rejects.toThrow('Network error. Please check your connection.');
  });
});
