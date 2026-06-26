import { Section } from "../layout/section";
import { Typography } from "../ui/typography";

const conversionSteps = [
  {
    title: "Show the promise",
    body: "Hero copy establishes the offer, audience, and immediate value."
  },
  {
    title: "Prove the outcome",
    body: "Metrics, services, and process blocks give buyers something concrete to trust."
  },
  {
    title: "Answer the risk",
    body: "Static delivery, SEO ownership, and CMS isolation address operational concerns."
  },
  {
    title: "Ask for action",
    body: "The page closes with a simple campaign planning call to action."
  }
];

export function HomeConversionPathSection() {
  return (
    <Section.Root>
      <Section.Container className="grid gap-10 tablet:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Typography.Eyebrow>Conversion path</Typography.Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight landscape:text-5xl">Every section has a job.</h2>
        </div>
        <div className="grid gap-4">
          {conversionSteps.map((step, index) => (
            <div key={step.title} className="grid grid-cols-[72px_1fr] gap-5 border border-black bg-white p-5">
              <span className="text-4xl font-semibold tracking-tight text-black">0{index + 1}</span>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 leading-7 text-neutral-700">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
