import { Toolbar } from "@base-ui-components/react/toolbar";
import { Section } from "./components/template/section";
import { getRoute, routes } from "./routes";

type AppProps = {
  url?: string;
};

export function App({ url }: AppProps) {
  const pathname = url ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  const route = getRoute(pathname);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="py-5">
        <Section.Container className="flex items-center justify-between">
          <a className="font-serif text-2xl font-semibold" href="/">
            Three Acts
          </a>
          <Toolbar.Root className="flex items-center gap-2" aria-label="Primary navigation">
            {routes.map((item) => (
              <Toolbar.Link
                key={item.path}
                href={item.path}
                className="rounded-full px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-panel"
              >
                {item.path === "/" ? "Home" : "About"}
              </Toolbar.Link>
            ))}
          </Toolbar.Root>
        </Section.Container>
      </header>
      <main>{route.render()}</main>
    </div>
  );
}
