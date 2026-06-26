import { Toolbar } from "@base-ui-components/react/toolbar";
import { Section } from "./components/layout/section";
import { getRoute, routes } from "./routes";

type AppProps = {
  url?: string;
};

export function App({ url }: AppProps) {
  const pathname = url ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  const route = getRoute(pathname);

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black py-5">
        <Section.Container className="flex items-center justify-between">
          <a className="text-2xl font-semibold tracking-tight" href="/">
            Three Acts
          </a>
          <Toolbar.Root className="flex items-center gap-2" aria-label="Primary navigation">
            {routes.map((item) => (
              <Toolbar.Link
                key={item.path}
                href={item.path}
                className="border border-transparent px-4 py-2 text-sm font-medium text-black transition hover:border-black hover:bg-black hover:text-white"
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
