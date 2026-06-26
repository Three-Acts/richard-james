import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthClient, type AuthState, type AuthUser } from "./auth-context";

export function AuthProvider({ children, client }: { children: ReactNode; client: AuthClient }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      signIn: async () => {
        setIsLoading(true);
        try {
          setUser(await client.signIn());
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
    [client, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
