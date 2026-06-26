import { useAuth } from "./auth/auth-context";
import { CmsWorkspace } from "./screens/cms-workspace";
import { LoginScreen } from "./screens/login-screen";

export function App() {
  const { user, isLoading, signIn, signOut } = useAuth();

  if (!user) {
    return <LoginScreen isLoading={isLoading} onSignIn={signIn} />;
  }

  return <CmsWorkspace onSignOut={signOut} user={user} />;
}
