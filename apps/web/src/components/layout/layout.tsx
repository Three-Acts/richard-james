import type { ReactNode } from "react";
import { Section } from "./section";
import { navLinks, site } from "../../routes";

/**
 * Shared site chrome (header + footer) around page content. Navigation uses
 * plain anchors so static pages need no JavaScript for links to work; the SPA
 * router intercepts same-app navigations when hydrated.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <header className="border-b border-black py-5">
        <Section.Container className="flex items-center justify-between">
          <a className="text-2xl font-semibold tracking-tight" href="/">
            {site.name}
          </a>
          <nav aria-label="Primary" className="flex items-center gap-2">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border border-transparent px-4 py-2 text-sm font-medium text-black transition hover:border-black hover:bg-black hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </Section.Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black py-8">
        <Section.Container className="flex flex-col items-center justify-between gap-3 text-sm text-neutral-600 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span>Static-first · Vite + React · Supabase · Vercel</span>
        </Section.Container>
      </footer>
    </div>
  );
}
