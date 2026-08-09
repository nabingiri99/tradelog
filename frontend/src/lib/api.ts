import type { Trade } from "../types/Trade";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  accountBalance?: number;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  data?: AuthUser;
}

export interface ApiDataResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  count: number;
  total?: number;
  page?: number;
  pages?: number;
  data: T[];
}

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const TOKEN_KEY = "tradelog.token";
const REFRESH_KEY = "tradelog.refresh";

export function getAuthToken(): string | null {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null, remember = true): void {
  try {
    if (token) {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export function getRefreshToken(): string | null {
  try {
    return (
      localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
    );
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string | null, remember = true): void {
  try {
    if (token) {
      (remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(status: number, message: string, errors?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = (await res.json()) as {
      success?: boolean;
      accessToken?: string;
      refreshToken?: string;
    };
    if (res.ok && payload.accessToken && payload.refreshToken) {
      setAuthToken(payload.accessToken);
      setRefreshToken(payload.refreshToken);
      return true;
    }
    setAuthToken(null);
    setRefreshToken(null);
    return false;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const perform = (): Promise<T> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers }).then(
      async (res) => {
        const payload: { message?: string; errors?: string[] } | null =
          await res.json().catch(() => null);
        if (res.status === 401 && path !== "/auth/login" && path !== "/auth/register") {
          refreshing ??= tryRefresh().finally(() => {
            refreshing = null;
          });
          const ok = await refreshing;
          if (ok) {
            return perform();
          }
          setAuthToken(null);
          setRefreshToken(null);
        }
        if (!res.ok) {
          const message =
            payload?.message ?? `Request failed with status ${res.status}`;
          const errors = Array.isArray(payload?.errors) ? payload.errors : undefined;
          throw new ApiError(res.status, message, errors);
        }
        return payload as T;
      },
    );
  };
  return perform();
}

export const api = {
  auth: {
    register: (payload: { name: string; email: string; password: string }) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    refresh: (refreshToken: string) =>
      request<AuthResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    logout: () =>
      request<ApiDataResponse<unknown>>("/auth/logout", { method: "POST" }),

    verifyEmail: (token: string) =>
      request<ApiDataResponse<unknown>>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),

    resendVerification: () =>
      request<ApiDataResponse<unknown>>("/auth/resend-verification", {
        method: "POST",
      }),

    forgotPassword: (email: string) =>
      request<ApiDataResponse<unknown>>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      request<ApiDataResponse<unknown>>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }),

    me: () => request<ApiDataResponse<AuthUser>>("/auth/me"),

    updateProfile: (payload: { name?: string; accountBalance?: number }) =>
      request<ApiDataResponse<AuthUser>>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    changePassword: (current: string, next: string) =>
      request<ApiDataResponse<unknown>>("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      }),
  },

  trades: {
    list: (params?: { page?: number; limit?: number }) =>
      request<ApiListResponse<Trade>>(
        `/trades${params ? `?page=${params.page}&limit=${params.limit}` : ""}`,
      ),

    get: (id: string) => request<ApiDataResponse<Trade>>(`/trades/${id}`),

    create: (trade: Trade) =>
      request<ApiDataResponse<Trade>>("/trades", {
        method: "POST",
        body: JSON.stringify(trade),
      }),

    update: (trade: Trade) =>
      request<ApiDataResponse<Trade>>(`/trades/${trade.id}`, {
        method: "PUT",
        body: JSON.stringify(trade),
      }),

    remove: (id: string) =>
      request<ApiDataResponse<unknown>>(`/trades/${id}`, {
        method: "DELETE",
      }),

    clearAll: () =>
      request<ApiDataResponse<unknown>>("/trades", {
        method: "DELETE",
      }),

    bulkCreate: (trades: Trade[]) =>
      request<ApiListResponse<Trade>>("/trades/bulk", {
        method: "POST",
        body: JSON.stringify({ trades }),
      }),
  },

  analytics: {
    get: () => request<ApiDataResponse<Record<string, unknown>>>("/analytics"),
  },

  news: {
    calendar: (params?: { impact?: string; currency?: string; days?: number }) =>
      request<ApiDataResponse<NewsEvent[]>>(
        `/news${params ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => [k, String(v)]),
          ),
        ).toString()}` : ""}`,
      ),
  },

  backup: {
    status: () => request<ApiDataResponse<BackupStatus>>("/backup/status"),
    run: () =>
      request<ApiDataResponse<BackupStatus>>("/backup/run", { method: "POST" }),
  },
};

export interface NewsEvent {
  date: string | null;
  time: string | null;
  currency: string | null;
  impact: "High" | "Medium" | "Low" | "Holiday";
  event: string | null;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

export interface BackupStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastRunTradeCount?: number;
}
