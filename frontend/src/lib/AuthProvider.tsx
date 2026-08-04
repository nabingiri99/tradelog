import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
  type CurrentUser,
  type UserAccount,
  clearSession,
  getSessionUser,
  hashPassword,
  loadAccounts,
  saveAccounts,
  setSession,
} from "./authStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => getSessionUser());

  const value = useMemo<AuthContextValue>(() => {
    async function register(name: string, email: string, password: string) {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName) return { ok: false, error: "Name is required." };
      if (!EMAIL_RE.test(cleanEmail)) {
        return { ok: false, error: "Enter a valid email address." };
      }
      if (password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }

      const accounts = loadAccounts();
      if (accounts[cleanEmail]) {
        return { ok: false, error: "An account with this email already exists." };
      }

      const account: UserAccount = {
        email: cleanEmail,
        name: cleanName,
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      accounts[cleanEmail] = account;
      saveAccounts(accounts);
      setSession(cleanEmail, true);
      setUser({ email: cleanEmail, name: cleanName });
      return { ok: true };
    }

    async function login(email: string, password: string, remember: boolean) {
      const cleanEmail = email.trim().toLowerCase();
      const account = loadAccounts()[cleanEmail];
      if (!account) {
        return { ok: false, error: "No account found for this email." };
      }
      const hash = await hashPassword(password);
      if (hash !== account.passwordHash) {
        return { ok: false, error: "Incorrect password." };
      }
      setSession(cleanEmail, remember);
      setUser({ email: account.email, name: account.name });
      return { ok: true };
    }

    function logout() {
      clearSession();
      setUser(null);
    }

    async function updateProfile(name: string): Promise<AuthResult> {
      const cleanName = name.trim();
      if (!cleanName) return { ok: false, error: "Name is required." };
      if (!user) return { ok: false, error: "Not signed in." };
      const accounts = loadAccounts();
      const account = accounts[user.email];
      if (!account) return { ok: false, error: "Account not found." };
      account.name = cleanName;
      saveAccounts(accounts);
      setUser({ email: account.email, name: account.name });
      return { ok: true };
    }

    async function changePassword(
      current: string,
      next: string,
    ): Promise<AuthResult> {
      if (!user) return { ok: false, error: "Not signed in." };
      if (next.length < 6) {
        return { ok: false, error: "New password must be at least 6 characters." };
      }
      const accounts = loadAccounts();
      const account = accounts[user.email];
      if (!account) return { ok: false, error: "Account not found." };
      const currentHash = await hashPassword(current);
      if (currentHash !== account.passwordHash) {
        return { ok: false, error: "Current password is incorrect." };
      }
      account.passwordHash = await hashPassword(next);
      saveAccounts(accounts);
      return { ok: true };
    }

    return { user, login, register, updateProfile, changePassword, logout };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
