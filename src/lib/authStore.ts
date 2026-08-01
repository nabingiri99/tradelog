import { createContext, useContext } from "react";

export interface UserAccount {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

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

const USERS_KEY = "tradelog.users";
const SESSION_LOCAL = "tradelog.session";
const SESSION_TEMP = "tradelog.session.tmp";

export function loadAccounts(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UserAccount>) : {};
  } catch {
    return {};
  }
}

export function saveAccounts(accounts: Record<string, UserAccount>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
}

export function setSession(email: string, remember: boolean): void {
  clearSession();
  try {
    if (remember) {
      localStorage.setItem(SESSION_LOCAL, email);
    } else {
      sessionStorage.setItem(SESSION_TEMP, email);
    }
  } catch {
    try {
      localStorage.setItem(SESSION_LOCAL, email);
    } catch {
      /* storage unavailable */
    }
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_LOCAL);
  } catch {
    /* storage unavailable */
  }
  try {
    sessionStorage.removeItem(SESSION_TEMP);
  } catch {
    /* storage unavailable */
  }
}

export function getSessionUser(): CurrentUser | null {
  let email: string | null;
  try {
    email =
      localStorage.getItem(SESSION_LOCAL) ?? sessionStorage.getItem(SESSION_TEMP);
  } catch {
    email = null;
  }
  if (!email) return null;
  const account = loadAccounts()[email];
  if (!account) return null;
  return { email: account.email, name: account.name };
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tradelog:${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 5381;
  for (const byte of data) {
    h = (h * 33) ^ byte;
  }
  return `djb2_${(h >>> 0).toString(16)}`;
}

export function emailKey(email: string): string {
  return `tradelog.trades.${email}`;
}
