import { Section } from "../layout/section";
import { Card } from "../ui/card";
import { Typography } from "../ui/typography";

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

export function HomeServicesSection() {
  return (
    <Section.Root id="services" className="border-y border-black bg-white text-black">
      <Section.Container>
        <div className="max-w-2xl">
          <Typography.Eyebrow>What the web app is shaped for</Typography.Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight landscape:text-5xl">A marketing site that can grow from landing page to content engine.</h2>
        </div>
        <div className="mt-10 grid gap-6 landscape:grid-cols-3">
          {offers.map((offer) => (
            <Card.Marketing key={offer.title} title={offer.title} body={offer.body} />
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
