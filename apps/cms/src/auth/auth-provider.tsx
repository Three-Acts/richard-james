import { useEffect, useMemo, useState, type ReactNode } from "react";
import { configureApiClient } from "../lib/api-client";
import { AuthContext, type AuthClient, type AuthState, type AuthUser, type SignInCredentials } from "./auth-context";

export function AuthProvider({ children, client }: { children: ReactNode; client: AuthClient }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wire apiFetch up to this client's token getter so every API request
  // carries the current session's bearer token.
  useEffect(() => {
    configureApiClient({ getAuthToken: client.getAccessToken });
  }, [client]);

  // Restore an existing session on mount instead of always starting signed out.
  // isInitializing already starts true, so there's nothing to set synchronously here.
  useEffect(() => {
    let cancelled = false;

    client
      .getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        // No session to restore (or the check failed) — fail closed to signed out.
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isInitializing,
      isLoading,
      error,
      signIn: async (credentials: SignInCredentials) => {
        setIsLoading(true);
        setError(null);
        try {
          setUser(await client.signIn(credentials));
        } catch (signInError) {
          setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
        } finally {
          setIsLoading(false);
        }
      },
      signOut: async () => {
        setIsLoading(true);
        try {
          await client.signOut();
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    }),
    [client, error, isInitializing, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
