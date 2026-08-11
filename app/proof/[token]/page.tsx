"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type PublicProject = {
  title: string;
  summary: string;
  skills: { skill: string; evidence: string; confidence: string }[];
  bullets: { text: string; evidence: string[]; status: string }[];
  artifacts: { id: string; label: string; url: string; type: string; claimIndexes: number[] }[];
  roles: string[];
};

type PublicProfile = { title: string; projects: PublicProject[]; publishedAt: string };

export default function ProofProfilePage() {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/proof-profile?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Profile not found.");
        setProfile(data.profile);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Profile not found."));
  }, [token]);

  return (
    <main>
      <nav className="shell nav"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Resume Lens</span></Link><div className="nav-links"><Link href="/studio">Create your proof profile</Link></div></nav>
      <section className="shell proof-page">
        {!profile && !error && <div className="proof-loading"><i className="spinner" /> Loading verified evidence…</div>}
        {error && <div className="proof-error"><span className="kicker">Evidence profile</span><h1>Profile unavailable</h1><p>{error}</p><Link href="/studio">Build an Evidence Passport</Link></div>}
        {profile && <>
          <header className="proof-hero"><span className="proof-seal">Evidence profile</span><h1>{profile.title}</h1><p>Selected project evidence, resume claims and supporting artifacts shared by the candidate.</p><small>Published {new Date(profile.publishedAt).toLocaleDateString()}</small></header>
          <div className="proof-notice"><b>Trust note</b><span>Evidence links improve transparency but Resume Lens does not independently certify their authenticity. Review the linked sources.</span></div>
          <div className="public-projects">{profile.projects.map((project) => <article key={project.title}>
            <div className="public-project-head"><div><span className="kicker">Project evidence</span><h2>{project.title}</h2><p>{project.summary}</p></div><div className="role-pills">{project.roles.map((role) => <span key={role}>{role}</span>)}</div></div>
            <section><h3>Demonstrated capabilities</h3><div className="public-skills">{project.skills.map((skill) => <div key={skill.skill}><b>{skill.skill}</b><span className={`confidence ${skill.confidence}`}>{skill.confidence}</span><q>{skill.evidence}</q></div>)}</div></section>
            <section><h3>Evidence-linked claims</h3><div className="public-claims">{project.bullets.map((bullet, index) => <div key={`${bullet.text}-${index}`}><span className={`claim-status ${bullet.status}`}>{bullet.status}</span><p>{bullet.text}</p>{bullet.evidence.length > 0 && <small>Source phrases: {bullet.evidence.join(" · ")}</small>}<div className="claim-artifacts">{project.artifacts.filter((artifact) => artifact.claimIndexes.includes(index)).map((artifact) => <a href={artifact.url} target="_blank" rel="noreferrer" key={artifact.id}><span>{artifact.type}</span>{artifact.label} ↗</a>)}</div></div>)}</div></section>
            {project.artifacts.length > 0 && <section><h3>Supporting artifacts</h3><div className="artifact-links">{project.artifacts.map((artifact) => <a href={artifact.url} target="_blank" rel="noreferrer" key={artifact.id}><span>{artifact.type}</span><b>{artifact.label}</b><small>{new URL(artifact.url).hostname}</small></a>)}</div></section>}
          </article>)}</div>
        </>}
      </section>
      <footer className="shell"><span>Resume Lens</span><p>Evidence-first career storytelling.</p><div><Link href="/studio">Create yours</Link><Link href="/limitations">Limitations</Link></div></footer>
    </main>
  );
}
