import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page shell">
      <Link href="/">← Back to Resume Lens</Link>
      <span className="kicker">Privacy</span>
      <h1>Your resume belongs to you.</h1>
      <p>Resume Lens processes an uploaded PDF in memory to produce the requested analysis. The application does not intentionally save resumes to a database or permanent file store.</p>
      <h2>What is processed</h2>
      <p>Your PDF, target role, and job description are sent to the configured AI provider for analysis. Do not upload information you are not comfortable processing through that provider.</p>
      <h2>Retention</h2>
      <p>The application does not provide resume history or permanent storage. Request data may still appear temporarily in infrastructure or provider logs according to the hosting provider’s and AI provider’s policies.</p>
      <h2>Security controls</h2>
      <p>Uploads are restricted to valid PDF files of 8 MB or less. Requests are rate-limited, and API credentials remain server-side.</p>
      <h2>Your responsibility</h2>
      <p>Remove unnecessary sensitive information before uploading, and verify all generated suggestions before using them.</p>
    </main>
  );
}
