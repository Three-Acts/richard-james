import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type SignInCredentials = {
  email: string;
  password: string;
};

export type AuthClient = {
  getCurrentUser: () => Promise<AuthUser | null>;
  /** Bearer token attached to API requests, or null when there isn't one. */
  getAccessToken: () => Promise<string | null>;
  signIn: (credentials: SignInCredentials) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

export type AuthState = {
  user: AuthUser | null;
  /** True only while the initial session restore (on mount) is in flight. */
  isInitializing: boolean;
  /** True while a signIn/signOut call is in flight. */
  isLoading: boolean;
  /** Message from the most recent failed signIn, if any. */
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
