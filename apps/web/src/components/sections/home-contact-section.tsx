import { Section } from "../layout/section";
import { Island } from "../islands/island";
import { ContactFormIsland } from "../islands/contact-form-island";

export function HomeContactSection() {
  return (
    <Section.Root id="contact" className="border-t border-black bg-black text-white">
      <Section.Container className="flex flex-col justify-between gap-8 landscape:flex-row landscape:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Next step</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight landscape:text-6xl">Turn this scaffold into the campaign site.</h2>
        </div>
        <div className="w-full max-w-md">
          {/* Interactive island: hydrates on its own; the rest of the page ships zero JS. */}
          <Island name="contact-form" component={ContactFormIsland} />
        </div>
      </Section.Container>
    </Section.Root>
  );
}
