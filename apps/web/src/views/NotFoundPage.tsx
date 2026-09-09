import { Section } from "../components/layout/section";
import { Button } from "../components/ui/button";
import { Typography } from "../components/ui/typography";

export function NotFoundPage() {
  return (
    <Section.Root className="py-28">
      <Section.Container className="max-w-3xl text-center">
        <Typography.Eyebrow className="justify-center">Error 404</Typography.Eyebrow>
        <h1 className="mt-5 text-6xl font-semibold tracking-tight">Page not found</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-700">
          The page you were looking for does not exist or may have moved.
        </p>
        <div className="mt-10 flex justify-center">
          <Button.Link href="/">Back to home</Button.Link>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
