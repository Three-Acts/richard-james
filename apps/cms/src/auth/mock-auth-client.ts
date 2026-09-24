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
  async getAccessToken() {
    // Stopgap until a real auth provider issues session tokens: this must
    // equal the API's own PUBLISH_TOKEN for requests to be accepted.
    return import.meta.env.VITE_PUBLISH_TOKEN ?? null;
  },
  async signIn() {
    return demoUser;
  },
  async signOut() {
    return undefined;
  }
};
