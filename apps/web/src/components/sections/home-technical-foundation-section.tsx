import { Collapsible } from "@base-ui-components/react/collapsible";
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
          {foundationItems.map((item) => (
            <Collapsible.Root key={item.title} defaultOpen className="border border-white bg-black p-5">
              <Collapsible.Trigger className="flex w-full items-center justify-between text-left text-2xl font-semibold tracking-tight">
                {item.title}
                <span aria-hidden="true">+</span>
              </Collapsible.Trigger>
              <Collapsible.Panel className="pt-4 leading-7 text-neutral-300">{item.body}</Collapsible.Panel>
            </Collapsible.Root>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
