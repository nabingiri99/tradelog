import { createContext, useContext } from "react";

export interface CurrentUser {
  email: string;
  name: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  updateProfile: (name: string) => Promise<AuthResult>;
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
