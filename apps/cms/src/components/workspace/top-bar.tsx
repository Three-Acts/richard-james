import { UserCircle } from "lucide-react";
import type { AuthUser } from "../../auth/auth-context";
import { Logo } from "../atoms";

export function TopBar({ onSignOut, user }: { onSignOut: () => Promise<void>; user: AuthUser }) {
  return (
    <header className="h-10 flex items-center justify-between gap-3 border-b border-cms-raised bg-cms-bg px-3">
      <div className="flex min-w-0 items-center gap-3 items-center">
        <Logo />
        <div className="truncate text-center text-[11px] font-bold text-cms-text">Three Acts CMS</div>
      </div>
      <div className="flex min-w-0 justify-end">
        <button
          className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded px-2 text-[11px] text-cms-muted transition hover:bg-cms-raised hover:text-cms-text"
          onClick={onSignOut}
          title="Sign out"
          type="button"
        >
          <UserCircle size={16} />
          <span className="truncate">{user.name}</span>
        </button>
      </div>
    </header>
  );
}
