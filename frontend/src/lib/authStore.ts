import { createContext, useContext } from "react";

export interface CurrentUser {
  email: string;
  name: string;
  emailVerified?: boolean;
  accountBalance?: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  updateProfile: (payload: {
    name?: string;
    accountBalance?: number;
  }) => Promise<AuthResult>;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

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

export function hasStoredSession(): boolean {
  return Boolean(getAuthToken() || getRefreshToken());
}

export function clearStoredTokens(): void {
  setAuthToken(null);
  setRefreshToken(null);
}
