import type { AuthClient, SignInCredentials } from "./auth-context";

// "craig.c" -> "Craig C": each dot/dash/underscore-separated chunk of the
// local part becomes a capitalized word, standing in for a real display name.
function nameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email;

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export const mockAuthClient: AuthClient = {
  async getCurrentUser() {
    return null;
  },
  async getAccessToken() {
    // Stopgap until a real auth provider issues session tokens: this must
    // equal the API's own PUBLISH_TOKEN for requests to be accepted.
    return import.meta.env.VITE_PUBLISH_TOKEN ?? null;
  },
  async signIn({ email, password }: SignInCredentials) {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      throw new Error("Enter your email and password.");
    }

    return {
      id: "local-editor",
      name: nameFromEmail(trimmedEmail),
      email: trimmedEmail
    };
  },
  async signOut() {
    return undefined;
  }
};
