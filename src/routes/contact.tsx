import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  FileText,
  GraduationCap,
  Info,
  Laptop,
  Mail,
  MessageCircle,
  Microscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/site/SiteChrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact", "How to get in touch with BlackSeaShark5 Labs."),
  component: Contact,
});

const EMAIL = "aryan.somanna.n@gmail.com";

const OPPORTUNITIES: { icon: LucideIcon; title: string; pay?: string; badge?: string; text: string }[] = [
  {
    icon: Briefcase,
    title: "Full-Time Positions",
    pay: "₹60,000 – ₹80,000",
    text: "Join the lab full-time and contribute to ongoing research, development, and innovation initiatives.",
  },
  {
    icon: GraduationCap,
    title: "Regular Internships",
    pay: "₹10,000 – ₹25,000",
    text: "Gain practical experience by working alongside the team on research, experiments, and technical projects.",
  },
  {
    icon: Laptop,
    title: "Working Internships",
    badge: "Remote",
    text: "Work remotely on assigned projects, collaborate with the team, and develop hands-on research and technical skills.",
  },
];

const ENQUIRIES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Microscope, title: "Research Collaboration", text: "Propose joint research and projects." },
  { icon: FileText, title: "Publications & Proposals", text: "Discuss papers and research ideas." },
  { icon: Users, title: "Careers & Internships", text: "Join our team and be part of the journey." },
  { icon: MessageCircle, title: "General Enquiry", text: "For other questions and requests." },
];

function IconBox({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary ${className}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function SectionTitle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Contact() {
  return (
    <>
      <PageHeader eyebrow="Contact & Opportunities" title="Let's build the future of research.">
        Connect with BlackSeaShark5 Labs for research collaborations, career opportunities, internships, and general
        enquiries.
      </PageHeader>

      <div className="mx-auto max-w-7xl px-5 py-14">
        <SectionTitle title="Opportunities at the Lab">
          Explore the opportunity that best matches your interests and experience.
        </SectionTitle>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {OPPORTUNITIES.map((o) => (
            <div key={o.title} className="flex gap-4 rounded-lg border border-border bg-surface p-5">
              <IconBox icon={o.icon} className="h-14 w-14" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{o.title}</h3>
                  {o.badge ? (
                    <span className="rounded-full border border-primary/50 px-2 py-0.5 text-xs text-primary">{o.badge}</span>
                  ) : null}
                </div>
                {o.pay ? <p className="mt-1 text-lg font-semibold text-primary">{o.pay}</p> : null}
                <p className="mt-2 text-sm text-muted-foreground">{o.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          Compensation, eligibility, and specific role requirements can be confirmed during the application process.
        </p>

        <hr className="my-10 border-border" />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle title="Research & General Enquiries">
              Have a research idea, publication proposal, media request, or general question? We'd love to hear from you.
            </SectionTitle>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {ENQUIRIES.map((q) => (
                <div key={q.title} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
                  <IconBox icon={q.icon} className="h-10 w-10" />
                  <div>
                    <h3 className="text-sm font-semibold">{q.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{q.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold">Contact the Lab</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send us a message and we'll get back to you as soon as possible.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <IconBox icon={Mail} className="h-14 w-14" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Email</p>
                <a href={`mailto:${EMAIL}`} className="break-all text-primary hover:underline">
                  {EMAIL}
                </a>
              </div>
            </div>
            <a
              href={`mailto:${EMAIL}`}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" /> Email us <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
