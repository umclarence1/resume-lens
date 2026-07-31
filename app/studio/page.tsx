"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EvidenceResult = {
  project_title: string;
  capability_summary: string;
  verified_skills: { skill: string; evidence: string; confidence: "explicit" | "inferred" }[];
  verification_questions: { id: string; question: string; why_it_matters: string }[];
  resume_bullets: { text: string; evidence_basis: string[]; needs_verification: boolean }[];
  interview_story: { situation: string; task: string; action: string; result: string };
  matching_roles: string[];
  demo?: boolean;
};

type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  projects: { title: string; bullets: string[] }[];
};

const emptyResume: ResumeData = {
  name: "", headline: "", email: "", phone: "", location: "", links: "",
  summary: "", skills: "", experience: "", education: "", projects: [],
};

export default function Studio() {
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<ResumeData>(() => {
    if (typeof window === "undefined") return emptyResume;
    const cached = localStorage.getItem("resume-lens-studio-v1");
    if (!cached) return emptyResume;
    try { return JSON.parse(cached); } catch { return emptyResume; }
  });
  const [template, setTemplate] = useState<"classic" | "modern" | "technical">("modern");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    localStorage.setItem("resume-lens-studio-v1", JSON.stringify(resume));
  }, [resume]);

  const contact = useMemo(
    () => [resume.email, resume.phone, resume.location, resume.links].filter(Boolean).join(" • "),
    [resume],
  );

  async function analyzeProject() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/project-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: projectTitle, description, targetRole, answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Project analysis failed.");
      setResult(data);
      setSelected(new Set(data.resume_bullets.map((_: unknown, index: number) => index)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function addApprovedBullets() {
    if (!result) return;
    const bullets = result.resume_bullets
      .filter((_, index) => selected.has(index))
      .map((item) => item.text);
    setResume((current) => {
      const projects = current.projects.filter((item) => item.title !== result.project_title);
      return { ...current, projects: [...projects, { title: result.project_title, bullets }] };
    });
    document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
  }

  function update(field: keyof Omit<ResumeData, "projects">, value: string) {
    setResume((current) => ({ ...current, [field]: value }));
  }

  function resumeLines() {
    return [
      resume.name, resume.headline, contact, "", "PROFESSIONAL SUMMARY", resume.summary, "",
      "SKILLS", resume.skills, "", "EXPERIENCE", resume.experience, "", "PROJECTS",
      ...resume.projects.flatMap((project) => [project.title, ...project.bullets.map((bullet) => `• ${bullet}`), ""]),
      "EDUCATION", resume.education,
    ].filter((line) => line !== undefined);
  }

  async function exportDocx() {
    if (!verified) return;
    const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ text: resume.name || "Your Name", heading: HeadingLevel.TITLE }),
          new Paragraph({ text: resume.headline }),
          new Paragraph({ text: contact }),
          new Paragraph({ text: "Professional Summary", heading: HeadingLevel.HEADING_1 }),
          new Paragraph(resume.summary),
          new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }),
          new Paragraph(resume.skills),
          new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 }),
          ...resume.experience.split("\n").filter(Boolean).map((line) => new Paragraph(line)),
          new Paragraph({ text: "Projects", heading: HeadingLevel.HEADING_1 }),
          ...resume.projects.flatMap((project) => [
            new Paragraph({ text: project.title, heading: HeadingLevel.HEADING_2 }),
            ...project.bullets.map((bullet) => new Paragraph({ text: bullet, bullet: { level: 0 } })),
          ]),
          new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }),
          ...resume.education.split("\n").filter(Boolean).map((line) => new Paragraph(line)),
        ],
      }],
    });
    download(await Packer.toBlob(document), "resume-lens-resume.docx");
  }

  async function exportPdf() {
    if (!verified) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    let y = 18;
    for (const line of resumeLines()) {
      const wrapped = pdf.splitTextToSize(line || " ", 175);
      if (y + wrapped.length * 6 > 282) { pdf.addPage(); y = 18; }
      pdf.text(wrapped, 18, y);
      y += wrapped.length * 6;
    }
    pdf.save("resume-lens-resume.pdf");
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <nav className="shell nav">
        <Link className="brand" href="/"><span className="brand-mark">R</span><span>Resume Lens</span></Link>
        <div className="nav-links"><Link href="/">Analyzer</Link><Link href="/privacy">Privacy</Link></div>
      </nav>

      <section className="studio-hero shell">
        <span className="kicker">Evidence Studio</span>
        <h1>Turn what you built into <em>proof.</em></h1>
        <p>Most resume tools rewrite words. Resume Lens helps you verify what a project demonstrates, uncover missing evidence, and build an ATS-friendly resume without inventing claims.</p>
        <div className="trust-row"><span>✓ Evidence-linked claims</span><span>✓ Local autosave</span><span>✓ No permanent resume storage</span></div>
      </section>

      <section className="shell evidence-workspace">
        <div className="section-heading">
          <div><span className="step-number">1</span></div>
          <div><span className="kicker">Project Evidence Engine</span><h2>Describe one project honestly</h2><p>Include what you built, your contribution, tools, tests, users, and measurable outcomes. Missing facts become questions—not inventions.</p></div>
        </div>
        <div className="studio-form-grid">
          <label>Project title<input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="Solar monitoring prototype" /></label>
          <label>Target role <span className="optional">optional</span><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Embedded Systems Engineer" /></label>
        </div>
        <label className="wide-label">What did you build?<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="I designed… I used… I tested… The result was…" /></label>
        {Object.keys(answers).length > 0 && (
          <div className="answer-summary"><strong>Verified follow-up answers included</strong><span>{Object.values(answers).filter(Boolean).length} answered</span></div>
        )}
        {error && <p className="error">{error}</p>}
        <button className="analyze" disabled={loading || projectTitle.length < 3 || description.length < 40} onClick={analyzeProject}>
          {loading ? <><i className="spinner" /> Checking the evidence…</> : <>Analyze demonstrated skills <span>→</span></>}
        </button>
      </section>

      {result && (
        <section className="shell evidence-results">
          {result.demo && <div className="demo-banner">Demo mode is active. Add a Gemini API key in deployment settings for project-specific AI results.</div>}
          <div className="evidence-intro"><span className="kicker">Evidence report</span><h2>{result.project_title}</h2><p>{result.capability_summary}</p></div>
          <div className="evidence-dashboard">
            <article><h3>Demonstrated capabilities</h3><div className="proof-list">{result.verified_skills.map((item) => <div key={item.skill}><b>{item.skill}</b><span className={`confidence ${item.confidence}`}>{item.confidence}</span><q>{item.evidence}</q></div>)}</div></article>
            <article><h3>Suitable role directions</h3><div className="role-pills">{result.matching_roles.map((role) => <span key={role}>{role}</span>)}</div><small>Role directions are guidance, not hiring guarantees.</small></article>
          </div>
          <article className="verification-card">
            <span className="kicker">Accuracy checkpoint</span><h3>Strengthen claims with facts only you know</h3>
            {result.verification_questions.map((question) => <label key={question.id}>{question.question}<small>{question.why_it_matters}</small><textarea value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Your factual answer…" /></label>)}
            <button className="ghost" onClick={analyzeProject}>Refine using my answers</button>
          </article>
          <article className="bullet-card">
            <span className="kicker">Truth-grounded bullets</span><h3>Choose what belongs in your resume</h3>
            {result.resume_bullets.map((item, index) => <label className="bullet-choice" key={`${item.text}-${index}`}><input type="checkbox" checked={selected.has(index)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /><span><b>{item.text}</b><small>{item.needs_verification ? "Needs your verification" : `Supported by: ${item.evidence_basis.join(" · ")}`}</small></span></label>)}
            <button className="analyze" disabled={selected.size === 0} onClick={addApprovedBullets}>Add approved evidence to resume <span>→</span></button>
          </article>
          <article className="star-card"><span className="kicker">Interview readiness</span><h3>Your evidence-based STAR story</h3><div>{Object.entries(result.interview_story).map(([key, value]) => <p key={key}><b>{key}</b>{value}</p>)}</div></article>
        </section>
      )}

      <section className="shell builder-section" id="builder">
        <div className="section-heading"><div><span className="step-number">2</span></div><div><span className="kicker">Resume Builder</span><h2>Build from verified evidence</h2><p>Your draft autosaves only in this browser. Review every claim before exporting.</p></div><span className="save-state">Saved locally</span></div>
        <div className="builder-grid">
          <div className="builder-form">
            <div className="studio-form-grid">
              <label>Name<input value={resume.name} onChange={(e) => update("name", e.target.value)} /></label>
              <label>Professional headline<input value={resume.headline} onChange={(e) => update("headline", e.target.value)} /></label>
              <label>Email<input value={resume.email} onChange={(e) => update("email", e.target.value)} /></label>
              <label>Phone<input value={resume.phone} onChange={(e) => update("phone", e.target.value)} /></label>
              <label>Location<input value={resume.location} onChange={(e) => update("location", e.target.value)} /></label>
              <label>Portfolio / LinkedIn<input value={resume.links} onChange={(e) => update("links", e.target.value)} /></label>
            </div>
            <label className="wide-label">Professional summary<textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} /></label>
            <label className="wide-label">Skills<textarea value={resume.skills} onChange={(e) => update("skills", e.target.value)} placeholder="React, TypeScript, FastAPI…" /></label>
            <label className="wide-label">Experience<textarea value={resume.experience} onChange={(e) => update("experience", e.target.value)} placeholder={"Role — Organization | Dates\nAchievement supported by evidence"} /></label>
            <label className="wide-label">Education<textarea value={resume.education} onChange={(e) => update("education", e.target.value)} /></label>
          </div>
          <div className="preview-wrap">
            <div className="template-picker"><span>Template</span>{(["classic", "modern", "technical"] as const).map((name) => <button className={template === name ? "active" : ""} key={name} onClick={() => setTemplate(name)}>{name}</button>)}</div>
            <article className={`resume-preview ${template}`}>
              <header><h1>{resume.name || "Your Name"}</h1><h2>{resume.headline || "Professional headline"}</h2><p>{contact || "email • phone • location • portfolio"}</p></header>
              <Preview title="Profile" text={resume.summary} />
              <Preview title="Skills" text={resume.skills} />
              <Preview title="Experience" text={resume.experience} />
              {resume.projects.length > 0 && <section><h3>Projects</h3>{resume.projects.map((project) => <div className="preview-project" key={project.title}><h4>{project.title}</h4><ul>{project.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}</section>}
              <Preview title="Education" text={resume.education} />
            </article>
            <label className="export-check"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> I have checked every claim and metric for accuracy.</label>
            <div className="export-actions"><button disabled={!verified} onClick={exportDocx}>Download DOCX</button><button disabled={!verified} onClick={exportPdf}>Download PDF</button></div>
          </div>
        </div>
      </section>
      <footer className="shell"><span>Resume Lens Evidence Studio</span><p>Evidence-first guidance—not a hiring guarantee.</p><div><Link href="/">Analyzer</Link><Link href="/limitations">Limitations</Link></div></footer>
    </main>
  );
}

function Preview({ title, text }: { title: string; text: string }) {
  return <section><h3>{title}</h3><p>{text || `${title} will appear here.`}</p></section>;
}
