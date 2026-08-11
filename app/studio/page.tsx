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

type PassportProject = { id: string; title: string; payload: EvidenceResult & { description?: string; targetRole?: string } };
type RequirementMatch = { requirement: string; status: "strong" | "partial" | "inferred" | "missing"; evidence: string[]; recommendation: string };

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
  const [passportKey] = useState(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem("resume-lens-passport-key");
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem("resume-lens-passport-key", created);
    return created;
  });
  const [passport, setPassport] = useState<PassportProject[]>([]);
  const [passportMessage, setPassportMessage] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [matrix, setMatrix] = useState<RequirementMatch[]>([]);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    localStorage.setItem("resume-lens-studio-v1", JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    if (!passportKey) return;
    fetch("/api/passport", { headers: { "x-passport-key": passportKey } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setPassport(data.projects || []))
      .catch(() => setPassportMessage("Your passport could not be loaded yet."));
  }, [passportKey]);

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

  async function saveToPassport() {
    if (!result || !passportKey) return;
    setPassportMessage("Saving evidence…");
    const existing = passport.find((item) => item.title.toLowerCase() === result.project_title.toLowerCase());
    const response = await fetch("/api/passport", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-passport-key": passportKey },
      body: JSON.stringify({ id: existing?.id, title: result.project_title, payload: { ...result, description, targetRole, verified_answers: answers } }),
    });
    const data = await response.json();
    if (!response.ok) { setPassportMessage(data.error || "Evidence could not be saved."); return; }
    setPassport((current) => [{ id: data.id, title: result.project_title, payload: { ...result, description, targetRole } }, ...current.filter((item) => item.id !== data.id)]);
    setPassportMessage("Saved to your private Evidence Passport.");
  }

  async function removePassportProject(id: string) {
    const response = await fetch(`/api/passport?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-passport-key": passportKey } });
    if (response.ok) setPassport((current) => current.filter((item) => item.id !== id));
  }

  async function matchEvidence() {
    setMatching(true); setError(""); setMatrix([]);
    try {
      const projects = [...passport.map((item) => ({ title: item.title, payload: item.payload })), ...(result && !passport.some((item) => item.title.toLowerCase() === result.project_title.toLowerCase()) ? [{ title: result.project_title, payload: result }] : [])];
      const response = await fetch("/api/evidence-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobDescription, projects }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evidence matching failed.");
      setMatrix(data.requirements || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Evidence matching failed."); }
    finally { setMatching(false); }
  }

  function claimStatus(item: EvidenceResult["resume_bullets"][number]) {
    if (item.needs_verification || item.text.includes("[")) return "incomplete";
    if (item.evidence_basis.length > 0) return "verified";
    if (Object.values(answers).some(Boolean)) return "user-confirmed";
    return "inferred";
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
        <div className="trust-row"><span>✓ Evidence-linked claims</span><span>✓ Private Evidence Passport</span><span>✓ No uploaded resume storage</span></div>
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
            {result.resume_bullets.map((item, index) => <label className="bullet-choice" key={`${item.text}-${index}`}><input type="checkbox" checked={selected.has(index)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /><span><span className={`claim-status ${claimStatus(item)}`}>{claimStatus(item)}</span><b>{item.text}</b><small>{item.evidence_basis.length ? `Why you can say this: ${item.evidence_basis.join(" · ")}` : "No direct supporting phrase has been identified."}</small></span></label>)}
            <div className="dual-actions"><button className="analyze" disabled={selected.size === 0} onClick={addApprovedBullets}>Add approved evidence to resume <span>→</span></button><button className="passport-save" onClick={saveToPassport}>Save project to Passport</button></div>
            {passportMessage && <p className="passport-message">{passportMessage}</p>}
          </article>
          <article className="star-card"><span className="kicker">Interview readiness</span><h3>Your evidence-based STAR story</h3><div>{Object.entries(result.interview_story).map(([key, value]) => <p key={key}><b>{key}</b>{value}</p>)}</div></article>
        </section>
      )}

      <section className="shell passport-section">
        <div className="section-heading"><div><span className="step-number">2</span></div><div><span className="kicker">Evidence Passport</span><h2>Your reusable proof library</h2><p>Saved projects persist privately between sessions. Only this browser holds the key used to retrieve them.</p></div><span className="save-state">{passport.length} projects</span></div>
        {passport.length === 0 ? <div className="passport-empty"><b>No saved evidence yet.</b><p>Analyze a project and select “Save project to Passport.”</p></div> : <div className="passport-grid">{passport.map((project) => <article key={project.id}><div><span className="claim-status verified">saved evidence</span><h3>{project.title}</h3><p>{project.payload.capability_summary}</p></div><div className="passport-skills">{project.payload.verified_skills.slice(0, 5).map((skill) => <span key={skill.skill}>{skill.skill}</span>)}</div><button onClick={() => removePassportProject(project.id)}>Remove</button></article>)}</div>}
      </section>

      <section className="shell matrix-section">
        <div className="section-heading"><div><span className="step-number">3</span></div><div><span className="kicker">Job Evidence Matrix</span><h2>See what you can actually prove</h2><p>Paste a vacancy to map each important requirement to evidence across your Passport—not just matching keywords.</p></div></div>
        <label className="wide-label">Job description<textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the responsibilities and requirements from the vacancy…" /></label>
        <button className="analyze" disabled={matching || jobDescription.length < 80 || (passport.length === 0 && !result)} onClick={matchEvidence}>{matching ? <><i className="spinner" /> Auditing your evidence…</> : <>Build evidence matrix <span>→</span></>}</button>
        {matrix.length > 0 && <div className="matrix-table"><div className="matrix-head"><span>Job requirement</span><span>Proof strength</span><span>Evidence</span><span>Next action</span></div>{matrix.map((item, index) => <div className="matrix-row" key={`${item.requirement}-${index}`}><b>{item.requirement}</b><span><i className={`matrix-status ${item.status}`}>{item.status}</i></span><span>{item.evidence.length ? item.evidence.join(" · ") : "No supporting evidence found."}</span><span>{item.recommendation}</span></div>)}</div>}
      </section>

      <section className="shell builder-section" id="builder">
        <div className="section-heading"><div><span className="step-number">4</span></div><div><span className="kicker">Resume Builder</span><h2>Build from verified evidence</h2><p>Your draft autosaves only in this browser. Review every claim before exporting.</p></div><span className="save-state">Saved locally</span></div>
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
