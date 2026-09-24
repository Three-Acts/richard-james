import { useAuth } from "./auth/auth-context";
import { ToastProvider, TooltipProvider } from "./components/atoms";
import { CmsWorkspace } from "./screens/cms-workspace";
import { LoginScreen } from "./screens/login-screen";

export function App() {
  const { user, isLoading, signIn, signOut } = useAuth();

  return (
    <ToastProvider>
      <TooltipProvider>
        {user ? <CmsWorkspace onSignOut={signOut} user={user} /> : <LoginScreen isLoading={isLoading} onSignIn={signIn} />}
      </TooltipProvider>
    </ToastProvider>
  );
}
