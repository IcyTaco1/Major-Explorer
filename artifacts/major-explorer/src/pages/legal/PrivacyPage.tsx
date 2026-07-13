import LegalLayout, { LegalSection, ContactLine } from "./LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="July 13, 2026">
      <LegalSection title="Overview">
        <p>
          Next Steps ("we", "us", or "the app") helps students explore college
          majors, compare colleges, and plan for college applications. This
          Privacy Policy explains what information we collect, how we use it,
          and the choices you have. We designed Next Steps to collect only what
          it needs to personalize your experience — we do not sell your
          information, and we do not show ads.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p><strong>Account information.</strong> When you create an account, our sign-in provider (Clerk) collects your name and email address so you can sign in securely. We use your email to identify your account.</p>
        <p><strong>Academic profile.</strong> Information you choose to add, such as your grade level, GPA, SAT/ACT scores, and goals. All of these are optional.</p>
        <p><strong>Interests and plans.</strong> Your interest-quiz answers and results, majors and colleges you save, application statuses, deadlines, and notes you write.</p>
        <p><strong>AI assistant messages.</strong> Messages you send to the built-in AI assistant, which are processed to generate a response.</p>
        <p><strong>Technical information.</strong> Standard server logs (such as request timestamps and status codes) used to keep the service reliable and secure. We do not use advertising trackers.</p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul>
          <li>To personalize major recommendations, college fit estimates (Reach / Match / Safety), and your college-prep roadmap.</li>
          <li>To save your colleges, majors, deadlines, and notes to your account so they follow you across devices.</li>
          <li>To generate AI-powered content (major descriptions, college lists, course plans, and assistant replies). When you use these features, relevant parts of your profile (such as your grade level, scores, and saved items) may be included in the request so the response fits you.</li>
          <li>To operate, secure, and improve the service, including rate limiting and abuse prevention.</li>
        </ul>
        <p>We do <strong>not</strong> sell or rent your personal information, and we do not use it for third-party advertising.</p>
      </LegalSection>

      <LegalSection title="Who we share information with">
        <p>We share information only with the service providers needed to run Next Steps:</p>
        <ul>
          <li><strong>Clerk</strong> — handles sign-in and account security.</li>
          <li><strong>OpenAI</strong> — processes AI requests (for example, your quiz answers or assistant messages) to generate responses. These requests are sent for processing, not for advertising.</li>
          <li><strong>Hosting and database providers</strong> — store your account data on secure infrastructure.</li>
        </ul>
        <p>We may also disclose information if required by law, or to protect the rights and safety of our users and service.</p>
      </LegalSection>

      <LegalSection title="Children and students">
        <p>
          Next Steps is intended for students age 13 and older. We do not
          knowingly collect personal information from children under 13. If you
          are under 18, you should use Next Steps with the knowledge and
          consent of a parent or guardian. If you believe a child under 13 has
          created an account, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Where your data lives">
        <p>
          Your profile, quiz results, saved majors, and saved colleges are
          stored privately in your account database, keyed to your account. A
          copy of some settings is cached in your browser for faster loading;
          the account copy is the source of truth. Server logs are kept only as
          long as needed for reliability and security.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <ul>
          <li><strong>Access and update</strong> — you can view and edit your profile, scores, saved majors, and saved colleges at any time in the app.</li>
          <li><strong>Delete</strong> — you can remove saved items in the app, and you can request deletion of your entire account and its data by contacting us.</li>
          <li><strong>Optional fields</strong> — GPA, test scores, grade level, and goals are always optional; the app works without them.</li>
        </ul>
        <p>Depending on where you live, you may have additional rights under laws such as the CCPA or GDPR (for example, the right to access or delete your data). Contact us to exercise them.</p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          All traffic to Next Steps is encrypted in transit (HTTPS).
          Sign-in is handled by a dedicated authentication provider, and your
          data is only accessible through your authenticated account.
          No method of storage is 100% secure, but we work to protect your
          information with industry-standard practices.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we make material changes to this policy, we will update the
          effective date above and, where appropriate, notify you in the app.
          Continued use of Next Steps after changes take effect means you
          accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <ContactLine />
      </LegalSection>
    </LegalLayout>
  );
}
