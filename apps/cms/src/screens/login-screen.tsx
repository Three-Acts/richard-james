import { Button } from "../components/atoms";

export function LoginScreen({ isLoading, onSignIn }: { isLoading: boolean; onSignIn: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-cms-bg p-6 text-cms-text">
      <section className="w-full max-w-[420px] rounded-lg border border-cms-raised bg-cms-surface p-6 shadow-2xl shadow-black/40">
        <p className="text-[11px] font-bold uppercase tracking-wider text-cms-info">Private CMS</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Authentication required</h1>
        <p className="mt-3 text-[13px] leading-6 text-cms-muted">
          Continue into the local editor. Supabase Auth can replace this adapter when live Supabase access is introduced.
        </p>
        <Button className="mt-5 w-full" disabled={isLoading} onClick={onSignIn} variant="primary">
          {isLoading ? "Connecting..." : "Continue as local editor"}
        </Button>
      </section>
    </main>
  );
}
