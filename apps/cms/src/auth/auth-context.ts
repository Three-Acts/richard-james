import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthClient = {
  getCurrentUser: () => Promise<AuthUser | null>;
  signIn: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

export type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
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
