import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Milestone, ArrowLeft } from "lucide-react";

// Set this to your real contact email before submitting to app stores or
// distributing to schools — both policies reference it.
export const LEGAL_CONTACT_EMAIL: string | null = "next.steps.contact.here@gmail.com";

export function ContactLine() {
  return (
    <p>
      If you have any questions about this document or how Next Steps handles
      your information, contact us
      {LEGAL_CONTACT_EMAIL ? (
        <>
          {" "}at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </>
      ) : (
        <> through the Next Steps team.</>
      )}
    </p>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-display font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export default function LegalLayout({ title, effectiveDate, children }: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-border glass-panel shadow-sm">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2" data-testid="link-legal-home">
          <Milestone className="w-5 h-5 text-foreground" />
          <span className="font-display font-bold text-lg tracking-tight text-foreground">Next Steps</span>
        </button>
        <button onClick={() => setLocation("/")} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-4 h-4" /> Back to Next Steps
        </button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12">
        <div className="glass-panel rounded-3xl border border-border shadow-sm p-8 md:p-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">Effective date: {effectiveDate}</p>
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-2">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-foreground underline underline-offset-2">Terms of Service</Link>
        </p>
      </main>
    </div>
  );
}
