import type { AuthClient, AuthUser } from "./auth-context";

const demoUser: AuthUser = {
  id: "local-editor",
  name: "Local Editor",
  email: "editor@example.com"
};

export const mockAuthClient: AuthClient = {
  async getCurrentUser() {
    return null;
  },
  async signIn() {
    return demoUser;
  },
  async signOut() {
    return undefined;
  }
};
