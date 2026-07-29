import Link from "next/link";

export default function LimitationsPage() {
  return (
    <main className="legal-page shell">
      <Link href="/">← Back to Resume Lens</Link>
      <span className="kicker">AI limitations</span>
      <h1>Useful guidance, not a hiring decision.</h1>
      <p>The compatibility score is an explainable estimate based on the supplied resume and job description. It is not a score from a recruiter’s ATS and does not predict interviews or employment.</p>
      <h2>Scores depend on the input</h2>
      <p>Short or vague job descriptions reduce keyword accuracy. Formatting, scanned PDFs, unusual layouts, and incomplete resume details can also affect the analysis.</p>
      <h2>AI can make mistakes</h2>
      <p>Evidence labels and consistency checks reduce unsupported claims, but users must still review every suggestion. Never add a skill, metric, qualification, or responsibility you cannot defend.</p>
      <h2>Fair-use boundary</h2>
      <p>Resume Lens does not evaluate protected characteristics and should not be used as an automated hiring decision system.</p>
      <h2>Score calculation</h2>
      <p>Keywords contribute 30%, skills 25%, experience relevance 20%, structure 15%, and writing quality 10%. The final score is recalculated by the server from those components.</p>
    </main>
  );
}
