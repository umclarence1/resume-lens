"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

type Evidence = { keyword: string; evidence: string; confidence: "explicit" | "inferred" };
type Rewrite = { original: string; improved: string; reason: string };
type RoleSuggestion = { role: string; match_score: number; reason: string; skills_to_build: string[] };
type Result = {
  overall_score: number;
  score_breakdown: Record<string, number>;
  role_match: { level: string; explanation: string };
  keyword_evidence: Evidence[];
  missing_keywords: string[];
  grammar_suggestions: Rewrite[];
  recommendations: { priority: "High" | "Medium" | "Low"; title: string; detail: string }[];
  resume_summary: string;
  improved_summary: string;
  role_suggestions: RoleSuggestion[];
  job_description_warning?: string | null;
  privacy?: string;
  validation?: { evidence_checked: boolean; rejected_evidence_count: number; rejected_rewrite_count: number };
  security?: { prompt_injection_detected: boolean };
  document?: { pages: number; readable_characters: number };
  model_version?: string;
  demo?: boolean;
};

const weights: Record<string, number> = {
  keyword_alignment: 30,
  skills_match: 25,
  experience_relevance: 20,
  structure: 15,
  writing_quality: 10,
};

const labels: Record<string, string> = {
  keyword_alignment: "Keywords",
  skills_match: "Skills",
  experience_relevance: "Experience",
  structure: "Structure",
  writing_quality: "Writing",
};

const sampleJob =
  "Build and maintain responsive web applications using React and TypeScript. Integrate REST APIs, write unit tests, use Git and CI/CD, review code, troubleshoot defects, and collaborate with product and design teams to deliver accessible software.";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [summaryAccepted, setSummaryAccepted] = useState(true);
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState("");

  const jobWarning = jobDescription.length > 0 && jobDescription.length < 150;
  const canAnalyze = !!file && consent && ((!role && !jobDescription) || (!!role && jobDescription.length >= 40));
  const acceptedRewrites = useMemo(
    () => result?.grammar_suggestions.filter((_, index) => accepted.has(index)) ?? [],
    [accepted, result],
  );

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" || candidate.size > 8 * 1024 * 1024) {
      setError("Choose a valid PDF no larger than 8 MB.");
      return;
    }
    setFile(candidate);
    setError("");
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    const body = new FormData();
    body.append("resume", file);
    body.append("role", role);
    body.append("jobDescription", jobDescription);
    body.append("consent", String(consent));
    try {
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResult(data);
      setAccepted(new Set(data.grammar_suggestions.map((_: Rewrite, index: number) => index)));
      setSummaryAccepted(true);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(helpful: boolean) {
    setFeedback("Sending…");
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpful,
        score: result?.overall_score,
        role: role || result?.role_suggestions[0]?.role,
        model: result?.model_version,
      }),
    });
    setFeedback(response.ok ? "Thank you—your feedback was recorded." : "Feedback could not be sent.");
  }

  function selectSuggestedRole(suggestion: RoleSuggestion) {
    setRole(suggestion.role);
    setJobDescription(
      `Seeking a ${suggestion.role} who can demonstrate relevant technical projects, collaborative problem solving, clear communication, and continuous learning. Preferred skills include ${suggestion.skills_to_build.join(", ")}.`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function improvementText() {
    const summary = summaryAccepted && result ? result.improved_summary : result?.resume_summary || "";
    return [
      "RESUME IMPROVEMENT DRAFT",
      "",
      "PROFESSIONAL SUMMARY",
      summary,
      "",
      "APPROVED BULLET REWRITES",
      ...acceptedRewrites.flatMap((item) => [`• ${item.improved}`, ""]),
      "IMPORTANT",
      "Review every statement before using it. Resume Lens does not add unverified facts or metrics.",
    ].join("\n");
  }

  async function downloadDocx() {
    const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "Resume Improvement Draft", heading: HeadingLevel.TITLE }),
          new Paragraph({ text: "Professional Summary", heading: HeadingLevel.HEADING_1 }),
          new Paragraph(
            (summaryAccepted ? result?.improved_summary : result?.resume_summary) || "",
          ),
          new Paragraph({ text: "Approved Bullet Rewrites", heading: HeadingLevel.HEADING_1 }),
          ...acceptedRewrites.map((item) => new Paragraph({ text: item.improved, bullet: { level: 0 } })),
          new Paragraph({ text: "Review every statement before adding it to your resume." }),
        ],
      }],
    });
    const blob = await Packer.toBlob(document);
    downloadBlob(blob, "resume-lens-improvements.docx");
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(improvementText(), 175);
    let y = 18;
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(line, 18, y);
      y += 7;
    }
    pdf.save("resume-lens-improvements.pdf");
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#"><span className="brand-mark">R</span><span>Resume Lens</span><small>Evidence-first careers</small></a>
        <div className="nav-links"><a className="nav-primary" href="/studio">Open Evidence Studio <span>↗</span></a><a href="/privacy">Privacy</a><a href="/limitations">Limitations</a></div>
        <span className="privacy"><i /> Files are processed temporarily</span>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span>Evidence-backed career intelligence</span></div>
        <h1>See what your resume<br /><em>can actually prove.</em></h1>
        <p className="hero-copy">Measure job fit, trace every recommendation to evidence, and turn real experience into a resume you can defend.</p>
        <div className="hero-signals" aria-label="Product strengths"><span><b>01</b> Transparent scoring</span><span><b>02</b> Grounded improvements</span><span><b>03</b> Private by design</span></div>

        <div className="workspace">
          <div className="workspace-topbar"><div><span className="live-dot" />Resume analysis</div><small>About 60 seconds</small></div>
          <div className="step-head"><span className="step-number">1</span><div><h2>Upload your resume</h2><p>PDF only · Maximum 8 MB · Not permanently stored</p></div></div>
          <label
            className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
          >
            <input type="file" accept=".pdf,application/pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0])} />
            {file ? <><span className="file-icon">PDF</span><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div><button className="remove" type="button" onClick={(event) => { event.preventDefault(); setFile(null); }}>×</button></> :
              <><span className="upload-icon">↑</span><div><strong>Drop your resume here</strong><small>or click to browse your files</small></div><span className="browse">Choose PDF</span></>}
          </label>

          <div className="divider" />
          <div className="step-head"><span className="step-number">2</span><div><h2>Choose analysis mode</h2><p>Add a role and job description, or leave both blank to discover your three best-fit roles.</p></div></div>
          <div className="form-grid">
            <label>Target role <span className="optional">optional</span><input placeholder="e.g. Junior IoT Developer" value={role} onChange={(event) => setRole(event.target.value)} /></label>
            <label className="job-field">Job description <span className="optional">optional</span><textarea placeholder="Paste a full job description, or leave blank for role discovery..." value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} /><button type="button" className="sample" onClick={() => { setRole("Junior Software Engineer"); setJobDescription(sampleJob); }}>Use sample job</button></label>
          </div>
          {jobWarning && <p className="inline-warning">A longer job description (150+ characters) gives more reliable keyword comparisons.</p>}
          <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I am 18 or older and consent to this resume being processed by Resume Lens and its configured AI provider. I have read the <a href="/privacy" target="_blank">privacy notice</a>.</span></label>
          {error && <p className="error">{error}</p>}
          <button className="analyze" disabled={!canAnalyze || loading} onClick={analyze}>{loading ? <><i className="spinner" /> Analyzing evidence…</> : <>Analyze my resume <span>→</span></>}</button>
          <p className="fine-print">Compatibility guidance—not a hiring prediction or guarantee.</p>
        </div>
      </section>

      {!result && <section className="benefits shell" aria-label="Analysis features"><article><span>Score</span><h3>Understand every point</h3><p>Five published components show exactly where the score comes from.</p></article><article><span>Evidence</span><h3>Trace every match</h3><p>Important skills and keywords point back to your own resume text.</p></article><article><span>Control</span><h3>Approve every change</h3><p>Nothing enters your export until you review and accept it.</p></article></section>}

      {result && <section className="results shell" id="results">
        <div className="results-head"><div><span className="kicker">Your evidence-backed report</span><h2>{role || result.role_suggestions[0]?.role}</h2><p>{result.role_match.level}</p></div><button className="ghost" onClick={() => setResult(null)}>Analyze another resume</button></div>
        {result.demo && <div className="demo-banner">Demo mode is active because no Gemini key is configured in this environment.</div>}
        {result.job_description_warning && <div className="demo-banner">{result.job_description_warning}</div>}
        {result.security?.prompt_injection_detected && <div className="security-banner">Suspicious instructions were detected inside the PDF and treated as untrusted text.</div>}

        <div className="result-grid">
          <article className="score-card"><div className={`score-ring ${result.overall_score >= 75 ? "great" : result.overall_score < 55 ? "needs-work" : ""}`} style={{ "--score": result.overall_score } as React.CSSProperties}><div><strong>{result.overall_score}</strong><span>out of 100</span></div></div><div><span className="kicker">Weighted compatibility</span><h3>{result.role_match.level}</h3><p>{result.role_match.explanation}</p></div></article>
          <article className="breakdown-card"><span className="kicker">How the score is calculated</span>{Object.entries(result.score_breakdown).map(([key, value]) => <div className="metric" key={key}><div><span>{labels[key]} <small>{weights[key]}%</small></span><b>{value}</b></div><div className="bar"><i style={{ width: `${value}%` }} /></div></div>)}</article>
        </div>

        <div className="keyword-grid">
          <article><span className="kicker">Verifiable matches</span><h3>Keyword evidence</h3><div className="evidence-list">{result.keyword_evidence.map((item) => <div key={`${item.keyword}-${item.evidence}`}><span className={`confidence ${item.confidence}`}>{item.confidence}</span><b>{item.keyword}</b><q>{item.evidence}</q></div>)}</div></article>
          <article><span className="kicker">Opportunity—not permission to fabricate</span><h3>Missing keywords</h3><div className="tags missing">{result.missing_keywords.map((word) => <span key={word}>+ {word}</span>)}</div></article>
        </div>

        <div className="role-section"><span className="kicker">Career discovery</span><h2>Three realistic target roles</h2><div className="role-grid">{result.role_suggestions.map((item) => <article key={item.role}><strong>{item.match_score}% match</strong><h3>{item.role}</h3><p>{item.reason}</p><small>Build next: {item.skills_to_build.join(" · ")}</small><button onClick={() => selectSuggestedRole(item)}>Analyze for this role</button></article>)}</div></div>

        <article className="summary-card"><span className="kicker">Recruiter snapshot</span><h3>Current resume summary</h3><p>{result.resume_summary}</p></article>

        <div className="recommendations"><span className="kicker">Prioritized action plan</span><h2>Start with these improvements</h2>{result.recommendations.map((item, index) => <article key={item.title}><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div>

        <div className="improvement-lab">
          <div className="lab-head"><div><span className="kicker">Improvement workspace</span><h2>Review before you export</h2><p>Accepted rewrites are included in your downloads. Reject anything that does not accurately represent your work.</p></div><div className="download-actions"><button onClick={downloadDocx}>Download DOCX</button><button onClick={downloadPdf}>Download PDF</button></div></div>
          <article className="summary-compare"><div><span>Original summary</span><p>{result.resume_summary}</p></div><div><span>Suggested summary</span><p>{result.improved_summary}</p><button className={summaryAccepted ? "accepted" : ""} onClick={() => setSummaryAccepted(!summaryAccepted)}>{summaryAccepted ? "✓ Accepted" : "Accept suggestion"}</button></div></article>
          <div className="grammar">{result.grammar_suggestions.map((item, index) => <article key={`${item.original}-${index}`}><div><span>Original</span><p>{item.original}</p></div><strong>→</strong><div><span>Grounded rewrite</span><p>{item.improved}</p><small>{item.reason}</small><button className={accepted.has(index) ? "accepted" : ""} onClick={() => setAccepted((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })}>{accepted.has(index) ? "✓ Accepted" : "Accept rewrite"}</button></div></article>)}</div>
        </div>

        <div className="feedback-card"><div><span className="kicker">Help us measure quality</span><h3>Was this report accurate and useful?</h3><p>Feedback contains the score and selected role—not your resume text.</p></div><div><button onClick={() => sendFeedback(true)}>Yes, helpful</button><button onClick={() => sendFeedback(false)}>Needs improvement</button><small>{feedback}</small></div></div>
      </section>}

      <footer className="shell"><span>Resume Lens</span><p>Processed temporarily · No permanent resume storage · AI guidance has limitations</p><div><a href="/privacy">Privacy</a><a href="/limitations">Limitations</a></div></footer>
    </main>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
