import { Button, eyebrowClass, Logo } from "../components/atoms";

export function LoginScreen({
  error,
  isLoading,
  onSignIn
}: {
  error?: string | null;
  isLoading: boolean;
  onSignIn: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-cms-bg p-6 text-cms-text">
      <section className="w-full max-w-95">
        <div className="mb-6 flex items-center gap-2.5">
          {/* alt="" — the adjacent heading already announces "Three Acts CMS". */}
          <Logo alt="" />
          <span className={eyebrowClass}>Three Acts CMS</span>
        </div>
        {/* The display face gets room here and nowhere else in the workspace. */}
        <h1 className="m-0 font-serif text-display font-semibold tracking-tight">Back of house.</h1>
        <p className="mb-6 mt-3 text-field leading-6 text-cms-muted">
          Sign in to edit the site&rsquo;s collections. This workspace is private and never indexed.
        </p>
        <Button className="w-full" disabled={isLoading} onClick={onSignIn} size="md" variant="primary">
          {isLoading ? "Connecting…" : "Continue as local editor"}
        </Button>
        {error ? (
          <p className="mb-0 mt-3 text-ui text-cms-danger" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mb-0 mt-3 text-ui text-cms-subtle">Supabase Auth replaces this adapter once live access is wired up.</p>
      </section>
    </main>
  );
}
