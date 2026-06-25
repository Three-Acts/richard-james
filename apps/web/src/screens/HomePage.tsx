import { Collapsible } from "@base-ui-components/react/collapsible";
import { Button } from "@three-acts/template/button";
import { Card } from "@three-acts/template/card";
import { Section } from "@three-acts/template/section";
import { Stat } from "@three-acts/template/stat";
import { Typography } from "@three-acts/template/typography";

export function HomePage() {
  const offers = [
    {
      title: "Launch pages",
      body: "Campaign-ready pages with strong calls to action, fast static delivery, and metadata that gives every page a clear search target."
    },
    {
      title: "Lead capture",
      body: "Sections designed around conversion: proof, objections, value, and next steps without burying the visitor in product jargon."
    },
    {
      title: "Editorial systems",
      body: "A private CMS shell sets up the workflow for future content operations without exposing draft tools to public search."
    }
  ];

  const metrics = [
    ["< 100ms", "static-first page response target"],
    ["2 apps", "separate public web and private CMS"],
    ["100%", "route-owned SEO metadata"]
  ];

  return (
    <>
      <Section.Container className="grid min-h-[calc(100vh-88px)] items-center gap-10 pb-14 pt-6 tablet:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Typography.Eyebrow className="mb-5">Marketing site system</Typography.Eyebrow>
          <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[0.95] text-ink landscape:text-7xl">
            Static pages built to sell the launch before the demo call.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-charcoal">
            A public Vite site scaffolded like a marketing website: clear positioning, conversion sections, SEO metadata, and a private CMS shell ready for real editorial workflows.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button.Link href="#contact">Plan a launch</Button.Link>
            <Button.Link href="#services" variant="secondary">Explore services</Button.Link>
          </div>
          <dl className="mt-10 grid gap-4 portrait:grid-cols-3">
            {metrics.map(([value, label]) => (
              <Stat.Root key={label} value={value} label={label} />
            ))}
          </dl>
        </div>
        <div className="relative min-h-[460px] overflow-hidden rounded-[2rem] bg-charcoal p-6 text-panel shadow-soft">
          <div className="absolute inset-x-8 top-8 h-2 rounded-full bg-gold" />
          <div className="pt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Campaign dashboard</p>
            <p className="mt-4 font-serif text-5xl font-semibold leading-none">42 qualified leads</p>
            <p className="mt-3 text-panel/70">Projected from three static landing pages and a single conversion path.</p>
          </div>
          <div className="mt-10 grid gap-4">
            {["Positioning above the fold", "Proof before pricing", "CMS drafts stay private"].map((item, index) => (
              <div key={item} className="grid grid-cols-[44px_1fr] items-center gap-4 rounded-2xl border border-panel/15 bg-panel/10 p-4 backdrop-blur">
                <span className="grid size-11 place-items-center rounded-full bg-gold font-serif text-xl text-ink">{index + 1}</span>
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section.Container>
      <Section.Root id="services" className="bg-panel text-ink">
        <Section.Container>
          <div className="max-w-2xl">
            <Typography.Eyebrow>What the web app is shaped for</Typography.Eyebrow>
            <h2 className="mt-4 font-serif text-4xl font-semibold landscape:text-5xl">A marketing site that can grow from landing page to content engine.</h2>
          </div>
          <div className="mt-10 grid gap-6 landscape:grid-cols-3">
            {offers.map((offer) => (
              <Card.Marketing key={offer.title} title={offer.title} body={offer.body} />
            ))}
          </div>
        </Section.Container>
      </Section.Root>
      <Section.Root>
        <Section.Container className="grid gap-10 tablet:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Typography.Eyebrow>Conversion path</Typography.Eyebrow>
            <h2 className="mt-4 font-serif text-4xl font-semibold landscape:text-5xl">Every section has a job.</h2>
          </div>
          <div className="grid gap-4">
            {["Show the promise", "Prove the outcome", "Answer the risk", "Ask for action"].map((step, index) => (
              <div key={step} className="grid grid-cols-[72px_1fr] gap-5 rounded-lg border border-ink/10 bg-panel p-5">
                <span className="font-serif text-4xl font-semibold text-rust">0{index + 1}</span>
                <div>
                  <h3 className="font-serif text-2xl font-semibold">{step}</h3>
                  <p className="mt-2 leading-7 text-charcoal">
                    {[
                      "Hero copy establishes the offer, audience, and immediate value.",
                      "Metrics, services, and process blocks give buyers something concrete to trust.",
                      "Static delivery, SEO ownership, and CMS isolation address operational concerns.",
                      "The page closes with a simple campaign planning call to action."
                    ][index]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section.Root>
      <Section.Root id="pipeline" className="bg-charcoal text-panel">
        <Section.Container>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Technical foundation</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold landscape:text-5xl">Marketing polish without giving up static performance.</h2>
          <div className="mt-10 grid gap-6 landscape:grid-cols-3">
            {["Static generation", "SEO metadata", "CMS isolation"].map((title, index) => (
              <Collapsible.Root key={title} defaultOpen className="rounded-lg border border-ink/10 bg-paper p-5">
                <Collapsible.Trigger className="flex w-full items-center justify-between text-left font-serif text-2xl">
                  {title}
                  <span aria-hidden="true">+</span>
                </Collapsible.Trigger>
                <Collapsible.Panel className="pt-4 leading-7 text-charcoal">
                  {[
                    "Routes render to static HTML during build for CDN-friendly delivery.",
                    "Each route owns title, description, canonical, Open Graph, and sitemap data.",
                    "The CMS is a separate app with search exclusion and an auth boundary."
                  ][index]}
                </Collapsible.Panel>
              </Collapsible.Root>
            ))}
          </div>
        </Section.Container>
      </Section.Root>
      <Section.Root id="contact" className="bg-rust text-paper">
        <Section.Container className="flex flex-col justify-between gap-8 landscape:flex-row landscape:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-paper/75">Next step</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold landscape:text-6xl">Turn this scaffold into the campaign site.</h2>
          </div>
          <Button.Link className="w-fit" href="mailto:hello@example.com" variant="light">
            hello@example.com
          </Button.Link>
        </Section.Container>
      </Section.Root>
    </>
  );
}
