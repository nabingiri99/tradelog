import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
  type CurrentUser,
  getAuthToken,
  setAuthToken,
} from "./authStore";
import { api } from "./api";

function toCurrentUser(user: {
  id: string;
  email: string;
  name: string;
}): CurrentUser {
  return { email: user.email, name: user.name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [restoring, setRestoring] = useState<boolean>(() => Boolean(getAuthToken()));

  useEffect(() => {
    if (!getAuthToken()) return;

    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) setUser(toCurrentUser(res.data));
      })
      .catch(() => {
        if (!cancelled) setAuthToken(null);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function register(
      name: string,
      email: string,
      password: string,
    ): Promise<AuthResult> {
      try {
        const res = await api.auth.register({ name, email, password });
        if (res.token) setAuthToken(res.token);
        if (res.data) setUser(toCurrentUser(res.data));
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
        if (res.token) setAuthToken(res.token, remember);
        if (res.data) setUser(toCurrentUser(res.data));
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Login failed.",
        };
      }
    }

    function logout() {
      setAuthToken(null);
      setUser(null);
    }

    async function updateProfile(name: string): Promise<AuthResult> {
      try {
        const res = await api.auth.updateProfile(name);
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
