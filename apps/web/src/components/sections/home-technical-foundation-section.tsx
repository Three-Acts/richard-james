import { Section } from "../layout/section";

const foundationItems = [
  {
    title: "Static generation",
    body: "Routes render to static HTML during build for CDN-friendly delivery."
  },
  {
    title: "SEO metadata",
    body: "Each route owns title, description, canonical, Open Graph, and sitemap data."
  },
  {
    title: "CMS isolation",
    body: "The CMS is a separate app with search exclusion and an auth boundary."
  }
];

export function HomeTechnicalFoundationSection() {
  return (
    <Section.Root id="pipeline" className="border-y border-black bg-black text-white">
      <Section.Container>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Technical foundation</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight landscape:text-5xl">Marketing polish without giving up static performance.</h2>
        <div className="mt-10 grid gap-6 landscape:grid-cols-3">
          {foundationItems.map((item, index) => (
            // Native <details>/<summary>: genuinely collapsible with zero JS,
            // unlike a hydration-less Base UI Collapsible (this section ships
            // with no `client:*` directive).
            <details key={item.title} open={index === 0} className="group border border-white bg-black p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                {item.title}
                <span aria-hidden="true" className="text-3xl leading-none transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pt-4 leading-7 text-neutral-300">{item.body}</p>
            </details>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
