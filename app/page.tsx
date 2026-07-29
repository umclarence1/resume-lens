"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

type Result = {
  overall_score: number;
  score_breakdown: Record<string, number>;
  role_match: { level: string; explanation: string };
  matched_keywords: string[];
  missing_keywords: string[];
  grammar_suggestions: { original: string; improved: string; reason: string }[];
  recommendations: { priority: string; title: string; detail: string }[];
  resume_summary: string;
  demo?: boolean;
};

const SAMPLE_JOB = `We are looking for a Junior Software Engineer with experience building web applications using React, TypeScript, REST APIs, Git, testing, and cloud platforms. You will collaborate with product and engineering teams, write maintainable code, troubleshoot issues, and contribute to CI/CD workflows.`;

const labels: Record<string, string> = {
  keyword_alignment: "Keyword alignment",
  skills_match: "Skills match",
  experience_relevance: "Experience relevance",
  structure: "Structure",
  writing_quality: "Writing quality",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("Junior Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const canAnalyze = file && role.trim() && jobDescription.trim().length > 40;

  const scoreTone = useMemo(() => {
    const score = result?.overall_score ?? 0;
    return score >= 80 ? "great" : score >= 60 ? "good" : "needs-work";
  }, [result]);

  function selectFile(next?: File) {
    setError("");
    setResult(null);
    if (!next) return;
    if (next.type !== "application/pdf") {
      setError("Please choose a PDF resume.");
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setError("That PDF is over the 8 MB limit.");
      return;
    }
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!canAnalyze || !file) return;
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.append("resume", file);
    form.append("role", role);
    form.append("jobDescription", jobDescription);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResult(data);
      requestAnimationFrame(() =>
        document.querySelector("#results")?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#" aria-label="Resume Lens home">
          <span className="brand-mark">R</span>
          <span>Resume Lens</span>
        </a>
        <span className="privacy"><i /> Your resume is not stored</span>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span>AI-powered resume feedback</span></div>
        <h1>Turn your resume into<br /><em>an interview magnet.</em></h1>
        <p className="hero-copy">
          See how your resume matches the role, uncover missing keywords, and get
          practical improvements in minutes.
        </p>

        <div className="workspace">
          <div className="step-head">
            <span className="step-number">1</span>
            <div><h2>Upload your resume</h2><p>PDF only · Maximum 8 MB</p></div>
          </div>
          <label
            className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0])}
            />
            {file ? (
              <>
                <span className="file-icon">PDF</span>
                <div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · Ready to analyze</small></div>
                <button type="button" className="remove" onClick={(event) => { event.preventDefault(); setFile(null); }}>×</button>
              </>
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <div><strong>Drop your resume here</strong><small>or click to browse your files</small></div>
                <span className="browse">Choose PDF</span>
              </>
            )}
          </label>

          <div className="divider" />
          <div className="step-head">
            <span className="step-number">2</span>
            <div><h2>Tell us what you&apos;re aiming for</h2><p>We&apos;ll compare your resume with this opportunity.</p></div>
          </div>

          <div className="form-grid">
            <label>Target role
              <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Data Analyst" />
            </label>
            <label className="job-field">Job description
              <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here..." />
              <button type="button" className="sample" onClick={() => setJobDescription(SAMPLE_JOB)}>Use sample job</button>
            </label>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="analyze" disabled={!canAnalyze || loading} onClick={analyze}>
            {loading ? <><span className="spinner" /> Reading your resume…</> : <>Analyze my resume <span>→</span></>}
          </button>
          <p className="fine-print">AI-generated guidance, not a guarantee of recruiter or ATS outcomes.</p>
        </div>
      </section>

      {!result && (
        <section className="benefits shell" aria-label="Analysis features">
          {[
            ["01", "ATS compatibility", "A clear score with a transparent breakdown."],
            ["02", "Keyword gaps", "Skills and phrases the role expects to see."],
            ["03", "Action plan", "Prioritized edits you can make immediately."],
          ].map(([number, title, copy]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </section>
      )}

      {result && (
        <section className="results shell" id="results">
          <div className="results-head">
            <div><span className="kicker">Analysis complete</span><h2>Your resume report</h2><p>Tailored for {role}</p></div>
            <button className="ghost" onClick={reset}>Analyze another resume</button>
          </div>
          {result.demo && <div className="demo-banner">Demo analysis — add an OpenAI API key to enable live resume reading.</div>}

          <div className="result-grid">
            <article className="score-card">
              <div className={`score-ring ${scoreTone}`} style={{ "--score": result.overall_score } as React.CSSProperties}>
                <div><strong>{result.overall_score}</strong><span>/100</span></div>
              </div>
              <div><span className="kicker">Estimated ATS score</span><h3>{result.role_match.level}</h3><p>{result.role_match.explanation}</p></div>
            </article>

            <article className="breakdown-card">
              <span className="kicker">Score breakdown</span>
              {Object.entries(result.score_breakdown).map(([key, value]) => (
                <div className="metric" key={key}>
                  <div><span>{labels[key] || key}</span><strong>{value}</strong></div>
                  <div className="bar"><i style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </article>
          </div>

          <div className="keyword-grid">
            <article><span className="kicker">Already working</span><h3>Matched keywords</h3><div className="tags matched">{result.matched_keywords.map((word) => <span key={word}>✓ {word}</span>)}</div></article>
            <article><span className="kicker">Opportunity</span><h3>Missing keywords</h3><div className="tags missing">{result.missing_keywords.map((word) => <span key={word}>+ {word}</span>)}</div></article>
          </div>

          <article className="summary-card"><span className="kicker">Recruiter snapshot</span><h3>Resume summary</h3><p>{result.resume_summary}</p></article>

          <div className="recommendations">
            <span className="kicker">Your action plan</span><h2>Start with these improvements</h2>
            {result.recommendations.map((item, index) => (
              <article key={item.title}><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>
            ))}
          </div>

          <div className="grammar">
            <span className="kicker">Writing polish</span><h2>Sharper ways to say it</h2>
            {result.grammar_suggestions.map((item) => (
              <article key={item.original}><div><span>Before</span><p>{item.original}</p></div><strong>→</strong><div><span>Try this</span><p>{item.improved}</p><small>{item.reason}</small></div></article>
            ))}
          </div>
        </section>
      )}

      <footer className="shell"><span>Resume Lens</span><p>Built for Demo Wednesday · Your files are processed temporarily.</p></footer>
    </main>
  );
}
