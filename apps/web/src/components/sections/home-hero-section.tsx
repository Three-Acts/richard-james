import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Stat } from "../ui/stat";
import { Typography } from "../ui/typography";

const metrics = [
  ["< 100ms", "static-first page response target"],
  ["2 apps", "separate public web and private CMS"],
  ["100%", "route-owned SEO metadata"]
];

const dashboardSteps = ["Positioning above the fold", "Proof before pricing", "CMS drafts stay private"];

export function HomeHeroSection() {
  return (
    <Section.Container className="grid min-h-hero items-center gap-10 pb-14 pt-6 tablet:grid-cols-hero">
      <div>
        <Typography.Eyebrow className="mb-5">Marketing site system</Typography.Eyebrow>
        <h1 className="max-w-3xl text-5xl font-semibold leading-display tracking-tight text-black landscape:text-7xl">
          Static pages built to sell the launch before the demo call.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
          A public Astro site scaffolded like a marketing website: clear positioning, conversion sections, SEO metadata, and a private CMS shell ready for real editorial workflows.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button.Link href="#contact">Plan a launch</Button.Link>
          <Button.Link href="#services" variant="secondary">
            Explore services
          </Button.Link>
        </div>
        <dl className="mt-10 grid gap-4 portrait:grid-cols-3">
          {metrics.map(([value, label]) => (
            <Stat.Root key={label} value={value} label={label} />
          ))}
        </dl>
      </div>
      <div className="relative min-h-115 overflow-hidden border border-black bg-black p-6 text-white">
        <div className="absolute inset-x-8 top-8 h-2 bg-white" />
        <div className="pt-8">
          <p className="text-sm font-semibold uppercase tracking-eyebrow text-white">Campaign dashboard</p>
          <p className="mt-4 text-5xl font-semibold leading-none tracking-tight">42 qualified leads</p>
          <p className="mt-3 text-neutral-300">Projected from three static landing pages and a single conversion path.</p>
        </div>
        <div className="mt-10 grid gap-4">
          {dashboardSteps.map((item, index) => (
            <div key={item} className="grid grid-cols-check items-center gap-4 border border-white p-4">
              <span className="grid size-11 place-items-center border border-white bg-white text-xl font-semibold text-black">{index + 1}</span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Section.Container>
  );
}
