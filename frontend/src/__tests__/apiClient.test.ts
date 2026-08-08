import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('apiClient interceptors', () => {
  let apiClient: any;
  let configureAuthBridge: any;
  let requestHandler: any;
  let responseRejectionHandler: any;
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockOnUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../model/services/apiClient');
    apiClient = mod.default;
    configureAuthBridge = mod.configureAuthBridge;

    mockGetToken = vi.fn();
    mockOnUnauthorized = vi.fn();
    configureAuthBridge({
      getToken: mockGetToken,
      onUnauthorized: mockOnUnauthorized,
    });

    requestHandler =
      apiClient.interceptors.request.handlers[0].fulfilled;
    responseRejectionHandler =
      apiClient.interceptors.response.handlers[0].rejected;
  });

  it('attaches Authorization header when token is present', () => {
    mockGetToken.mockReturnValue('abc.def.ghi');
    const config: any = { headers: {} };
    const result = requestHandler(config);
    expect(result.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('does not attach Authorization when token is null', () => {
    mockGetToken.mockReturnValue(null);
    const config: any = { headers: {} };
    const result = requestHandler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('calls onUnauthorized on 401 from a protected endpoint', async () => {
    const err = {
      response: { status: 401 },
      config: { url: '/activities' },
    };
    await expect(responseRejectionHandler(err)).rejects.toBe(err);
    expect(mockOnUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call onUnauthorized on 401 from /auth/login', async () => {
    const err = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    };
    await expect(responseRejectionHandler(err)).rejects.toBe(err);
    expect(mockOnUnauthorized).not.toHaveBeenCalled();
  });

  it('does not call onUnauthorized on 401 from /auth/register', async () => {
    const err = {
      response: { status: 401 },
      config: { url: '/auth/register' },
    };
    await expect(responseRejectionHandler(err)).rejects.toBe(err);
    expect(mockOnUnauthorized).not.toHaveBeenCalled();
  });

  it('does not call onUnauthorized for non-401 statuses', async () => {
    const err = {
      response: { status: 500 },
      config: { url: '/activities' },
    };
    await expect(responseRejectionHandler(err)).rejects.toBe(err);
    expect(mockOnUnauthorized).not.toHaveBeenCalled();
  });
});
