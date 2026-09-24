import { useAuth } from "./auth/auth-context";
import { ToastProvider, TooltipProvider } from "./components/atoms";
import { CmsWorkspace } from "./screens/cms-workspace";
import { LoginScreen } from "./screens/login-screen";

export function App() {
  const { error, isInitializing, isLoading, signIn, signOut, user } = useAuth();

  return (
    <ToastProvider>
      <TooltipProvider>
        {isInitializing ? (
          <div className="grid min-h-screen place-items-center bg-cms-bg text-cms-muted" role="status">
            Loading…
          </div>
        ) : user ? (
          <CmsWorkspace onSignOut={signOut} user={user} />
        ) : (
          <LoginScreen error={error} isLoading={isLoading} onSignIn={signIn} />
        )}
      </TooltipProvider>
    </ToastProvider>
  );
}
