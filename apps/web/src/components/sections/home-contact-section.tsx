import { Section } from "../layout/section";
import { Button } from "../ui/button";

export function HomeContactSection() {
  return (
    <Section.Root id="contact" className="border-t border-black bg-black text-white">
      <Section.Container className="flex flex-col justify-between gap-8 landscape:flex-row landscape:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Next step</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight landscape:text-6xl">Turn this scaffold into the campaign site.</h2>
        </div>
        <Button.Link className="w-fit" href="mailto:hello@example.com" variant="light">
          hello@example.com
        </Button.Link>
      </Section.Container>
    </Section.Root>
  );
}
