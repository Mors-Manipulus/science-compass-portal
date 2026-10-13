import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/SiteChrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact", "How to get in touch with BlackSeaShark5 Labs."),
  component: Contact,
});

// Verified contact details have not yet been supplied. Add them here once confirmed —
// do not add a form until a real submission service is connected.
const CONTACTS: { label: string; value: string; href?: string }[] = [];

function Contact() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch">
        For research collaborations, press and general enquiries.
      </PageHeader>
      <div className="mx-auto max-w-3xl px-5 py-14">
        {CONTACTS.length ? (
          <dl className="divide-y divide-border border-y border-border">
            {CONTACTS.map((c) => (
              <div key={c.label} className="grid gap-1 py-5 sm:grid-cols-[160px_1fr]">
                <dt className="eyebrow">{c.label}</dt>
                <dd>{c.href ? <a href={c.href} className="text-primary hover:underline">{c.value}</a> : c.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="rounded-md border border-border bg-surface p-8">
            <p className="font-medium">Contact details coming soon</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Verified contact information for the lab is being confirmed and will be published here shortly.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
