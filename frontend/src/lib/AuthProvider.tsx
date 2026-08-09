import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
  type CurrentUser,
  hasStoredSession,
  setAuthToken,
  setRefreshToken,
  clearStoredTokens,
} from "./authStore";
import { api } from "./api";

function toCurrentUser(user: {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  accountBalance?: number;
}): CurrentUser {
  return {
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    accountBalance: user.accountBalance,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [restoring, setRestoring] = useState<boolean>(() => hasStoredSession());

  useEffect(() => {
    if (!hasStoredSession()) return;

    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) setUser(toCurrentUser(res.data));
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredTokens();
        }
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    function applySession(
      res: {
        accessToken?: string;
        refreshToken?: string;
        data?: {
          id: string;
          email: string;
          name: string;
          emailVerified?: boolean;
          accountBalance?: number;
        };
      },
      remember: boolean,
    ) {
      if (res.accessToken) setAuthToken(res.accessToken, remember);
      if (res.refreshToken) setRefreshToken(res.refreshToken, remember);
      if (res.data) setUser(toCurrentUser(res.data));
    }

    async function register(
      name: string,
      email: string,
      password: string,
    ): Promise<AuthResult> {
      try {
        const res = await api.auth.register({ name, email, password });
        applySession(res, true);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Registration failed.",
        };
      }
    }

    async function login(
      email: string,
      password: string,
      remember: boolean,
    ): Promise<AuthResult> {
      try {
        const res = await api.auth.login({ email, password });
        applySession(res, remember);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Login failed.",
        };
      }
    }

    async function logout() {
      try {
        await api.auth.logout();
      } catch {
        /* ignore */
      }
      clearStoredTokens();
      setUser(null);
    }

    async function updateProfile(payload: {
      name?: string;
      accountBalance?: number;
    }): Promise<AuthResult> {
      try {
        const res = await api.auth.updateProfile(payload);
        if (res.data) setUser(toCurrentUser(res.data));
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not update profile.",
        };
      }
    }

    async function changePassword(
      current: string,
      next: string,
    ): Promise<AuthResult> {
      try {
        await api.auth.changePassword(current, next);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error ? err.message : "Could not change password.",
        };
      }
    }

    return { user, login, register, updateProfile, changePassword, logout };
  }, [user]);

  if (restoring) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
