import { cn } from "@three-acts/utils";

// Brand mark for the top bar. Sources the app favicon so the logo can be
// swapped in one place (public/favicon.svg) and stay in sync with the tab icon.
export function Logo({ className }: { className?: string }) {
  return <img alt="Three Acts CMS" className={cn("size-6 rounded", className)} src="/favicon.svg" />;
}
