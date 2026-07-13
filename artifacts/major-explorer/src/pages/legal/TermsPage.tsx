import LegalLayout, { LegalSection, ContactLine } from "./LegalLayout";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="July 13, 2026">
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service ("Terms") govern your use of Next Steps ("the
          app", "we", "us"). By creating an account or using the app, you agree
          to these Terms and to our{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
          If you do not agree, please do not use the app.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use Next Steps">
        <p>
          You must be at least 13 years old to use Next Steps. If you are under
          18, you may use the app only with the consent of a parent or
          guardian. By using the app, you confirm that you meet these
          requirements.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <p>
          You are responsible for keeping your account credentials secure and
          for all activity under your account. Sign-in is provided by a
          third-party authentication service. Notify us promptly if you suspect
          unauthorized use of your account.
        </p>
      </LegalSection>

      <LegalSection title="4. AI-generated content — important disclaimer">
        <p>
          Next Steps uses artificial intelligence to generate major
          descriptions, college lists, rankings, course plans, deadline
          research, and assistant replies. AI-generated content{" "}
          <strong>may be inaccurate, incomplete, or out of date</strong>.
        </p>
        <ul>
          <li>Always verify important details — especially application deadlines, admission statistics, and program availability — directly with each college's official website.</li>
          <li>Next Steps is an exploration tool. It is <strong>not</strong> professional college-counseling, financial, or legal advice, and it does not guarantee admission to any institution.</li>
          <li>College fit labels (Reach / Match / Safety) are rough estimates based on the information you provide and publicly known statistics.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the app to harass, harm, or deceive others, or to generate harmful content;</li>
          <li>Attempt to break, overload, probe, or bypass the app's security or rate limits;</li>
          <li>Scrape, resell, or redistribute the service or its AI outputs as your own service;</li>
          <li>Impersonate others or provide false account information;</li>
          <li>Use the app in violation of any applicable law or school policy.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these Terms.</p>
      </LegalSection>

      <LegalSection title="6. Your content">
        <p>
          You keep ownership of the information you add to Next Steps (such as
          notes, goals, and saved lists). You grant us the limited right to
          store and process that information solely to provide the service, as
          described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Our content">
        <p>
          The app's design, branding, and software are owned by us or our
          licensors. You may not copy, modify, or distribute them except as
          allowed by these Terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Termination">
        <p>
          You may stop using Next Steps at any time and may request deletion of
          your account and data. We may suspend or terminate access if you
          violate these Terms, or discontinue the service with reasonable
          notice where practical.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          Next Steps is provided <strong>"as is"</strong> and{" "}
          <strong>"as available"</strong>, without warranties of any kind,
          express or implied, including fitness for a particular purpose and
          accuracy of content. We do not warrant that the app will be
          uninterrupted, error-free, or that AI-generated information is
          correct.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, we will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or
          for missed application deadlines, admission outcomes, or decisions
          made in reliance on content in the app. Our total liability for any
          claim relating to the service will not exceed the greater of $50 or
          the amount you paid us (currently $0) in the 12 months before the
          claim.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will update the effective date above and, where
          appropriate, notify you in the app. Continued use after changes take
          effect means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <ContactLine />
      </LegalSection>
    </LegalLayout>
  );
}
