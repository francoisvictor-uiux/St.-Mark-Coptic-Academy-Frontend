"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "./api";
import type { ApiUser } from "./api";

type AuthState = {
  user: ApiUser | null;
  /** "loading" only while a silent refresh is in flight on first mount. */
  status: "loading" | "guest" | "authed";
  setUser: (user: ApiUser | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>(() =>
    // Guests skip the network round-trip entirely.
    typeof window !== "undefined" && api.hasSessionHint() ? "loading" : "guest",
  );

  useEffect(() => {
    if (status !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        await api.refresh();
        const current = await api.me();
        if (!cancelled) {
          setUser(current);
          setStatus("authed");
        }
      } catch {
        api.markSession(false);
        if (!cancelled) setStatus("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("guest");
  }, []);

  const applyUser = useCallback((next: ApiUser | null) => {
    setUser(next);
    setStatus(next ? "authed" : "guest");
  }, []);

  const value = useMemo(
    () => ({ user, status, setUser: applyUser, signOut }),
    [user, status, applyUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
