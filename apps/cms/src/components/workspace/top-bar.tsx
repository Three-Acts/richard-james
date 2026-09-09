import { Loader2, Rocket, UserCircle } from "lucide-react";
import type { AuthUser } from "../../auth/auth-context";
import { Button, Logo, PanelHeader, Tooltip } from "../atoms";
import { usePublish } from "../../hooks/use-publish";

export function TopBar({ onSignOut, user }: { onSignOut: () => Promise<void>; user: AuthUser }) {
  const { publish, isPublishing } = usePublish();

  return (
    <PanelHeader className="justify-between border-cms-line-strong bg-cms-bg">
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Tooltip content="Build and deploy the live site">
          <Button aria-label="Publish the site" disabled={isPublishing} onClick={publish} variant="primary">
            {isPublishing ? <Loader2 className="animate-spin" size={13} /> : <Rocket size={13} />}
            {isPublishing ? "Publishing…" : "Publish site"}
          </Button>
        </Tooltip>
        <Tooltip content="Sign out">
          {/* The tooltip is visual only, so the action stays in the accessible name. */}
          <Button aria-label={`Sign out ${user.name}`} className="max-w-[200px]" onClick={onSignOut} variant="ghost">
            <UserCircle size={15} />
            <span className="truncate">{user.name}</span>
          </Button>
        </Tooltip>
      </div>
    </PanelHeader>
  );
}
