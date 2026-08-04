import type { Trade } from "../types/Trade";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
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
  data: T[];
}

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const TOKEN_KEY = "tradelog.token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const payload: { message?: string; errors?: string[] } | null = await res
    .json()
    .catch(() => null);

  if (!res.ok) {
    const message =
      payload?.message ?? `Request failed with status ${res.status}`;
    const errors = Array.isArray(payload?.errors) ? payload.errors : undefined;
    if (res.status === 401) {
      setAuthToken(null);
    }
    throw new ApiError(res.status, message, errors);
  }

  return payload as T;
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

    me: () => request<ApiDataResponse<AuthUser>>("/auth/me"),

    updateProfile: (name: string) =>
      request<ApiDataResponse<AuthUser>>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),

    changePassword: (current: string, next: string) =>
      request<ApiDataResponse<unknown>>("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      }),
  },

  trades: {
    list: () => request<ApiListResponse<Trade>>("/trades"),

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
};
