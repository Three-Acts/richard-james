import { Dialog } from "@base-ui-components/react/dialog";
import { Tabs } from "@base-ui-components/react/tabs";
import { Button } from "@three-acts/template/button";
import { Card } from "@three-acts/template/card";
import { Section } from "@three-acts/template/section";
import { Typography } from "@three-acts/template/typography";
import { useAuth } from "./auth/AuthContext";

export function App() {
  const { user, isLoading, signIn, signOut } = useAuth();

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-charcoal px-6 text-panel">
        <section className="w-full max-w-md rounded-lg border border-panel/15 bg-panel/10 p-6 shadow-soft backdrop-blur">
          <Typography.Eyebrow className="text-gold">Private CMS</Typography.Eyebrow>
          <h1 className="mt-4 font-serif text-4xl font-semibold">Authentication required</h1>
          <p className="mt-4 leading-7 text-panel/80">
            This shell is ready for a Clerk, Auth0, or Supabase client behind the same provider interface.
          </p>
          <Button.Root
            className="mt-6 w-full rounded-md bg-gold text-ink hover:brightness-105"
            disabled={isLoading}
            onClick={signIn}
            variant="primary"
          >
            {isLoading ? "Connecting..." : "Continue as local editor"}
          </Button.Root>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-panel py-4">
        <Section.Container className="flex items-center justify-between">
          <div>
            <Typography.Eyebrow>Three Acts CMS</Typography.Eyebrow>
            <h1 className="font-serif text-3xl font-semibold">Editorial console</h1>
          </div>
          <Button.Root className="rounded-md px-4 py-2" onClick={signOut} variant="secondary">
            Sign out
          </Button.Root>
        </Section.Container>
      </header>
      <Section.Container className="grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
        <Tabs.Root defaultValue="pages" className="contents">
          <Tabs.List className="flex gap-2 lg:flex-col" aria-label="CMS sections">
            {["pages", "assets", "settings"].map((tab) => (
              <Tabs.Tab
                key={tab}
                value={tab}
                className="rounded-md px-4 py-3 text-left text-sm font-semibold capitalize data-[selected]:bg-ink data-[selected]:text-paper"
              >
                {tab}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <section className="rounded-lg border border-ink/10 bg-panel p-6 shadow-soft">
            <Tabs.Panel value="pages">
              <DashboardPanel title="Pages" description="Draft, review, and publish static page content." />
            </Tabs.Panel>
            <Tabs.Panel value="assets">
              <DashboardPanel title="Assets" description="Prepare media records before connecting storage." />
            </Tabs.Panel>
            <Tabs.Panel value="settings">
              <DashboardPanel title="Settings" description="Swap the auth adapter and deployment settings here." />
            </Tabs.Panel>
          </section>
        </Tabs.Root>
      </Section.Container>
    </div>
  );
}

function DashboardPanel({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-4xl font-semibold">{title}</h2>
          <p className="mt-2 leading-7 text-charcoal">{description}</p>
        </div>
        <Dialog.Root>
          <Dialog.Trigger className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper">
            New entry
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-ink/50" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-panel p-6 shadow-soft">
              <Dialog.Title className="sr-only">Content adapter pending</Dialog.Title>
              <Dialog.Description className="sr-only">
                This scaffold keeps CMS storage out of scope until the content model is defined.
              </Dialog.Description>
              <Card.Marketing
                body="This scaffold keeps CMS storage out of scope until the content model is defined."
                className="border-0 bg-transparent p-0"
                title="Content adapter pending"
              />
              <Dialog.Close className="mt-6 rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold">
                Close
              </Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="mt-8 grid gap-3">
        {["Homepage", "About", "Launch notes"].map((item) => (
          <article key={item} className="flex items-center justify-between rounded-md border border-ink/10 bg-paper px-4 py-3">
            <span className="font-semibold">{item}</span>
            <span className="text-sm text-charcoal">Draft</span>
          </article>
        ))}
      </div>
    </div>
  );
}
