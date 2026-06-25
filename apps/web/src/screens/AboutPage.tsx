import { Section } from "@three-acts/template/section";
import { Typography } from "@three-acts/template/typography";

export function AboutPage() {
  return (
    <Section.Root className="py-20">
      <Section.Container className="max-w-5xl">
        <Typography.Eyebrow>About the scaffold</Typography.Eyebrow>
        <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight landscape:text-6xl">
          A public web app built for static delivery and controlled editorial workflows.
        </h1>
        <div className="mt-10 grid gap-6 text-lg leading-8 text-charcoal landscape:grid-cols-2">
          <p>
            The web app is intentionally static-first. Route metadata lives beside page definitions, and the build process prerenders each route into HTML files.
          </p>
          <p>
            The CMS is separated into its own Vite app so authentication, deployment rules, and search visibility can be managed independently from the public site.
          </p>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
