import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { evidenceProjects, publicEvidenceProfiles } from "@/db/schema";

export const runtime = "edge";

type Artifact = { id?: unknown; label?: unknown; url?: unknown; type?: unknown; claimIndexes?: unknown };

function validPassportKey(request: Request) {
  const value = request.headers.get("x-passport-key") || "";
  return /^[a-f0-9-]{36}$/i.test(value) ? value : null;
}

function safeUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function sanitizeArtifact(value: Artifact) {
  const url = safeUrl(value.url);
  if (!url || typeof value.label !== "string") return null;
  const allowedTypes = ["github", "demo", "report", "certificate", "portfolio", "other"];
  return {
    id: typeof value.id === "string" ? value.id.slice(0, 80) : crypto.randomUUID(),
    label: value.label.trim().slice(0, 100),
    url,
    type: typeof value.type === "string" && allowedTypes.includes(value.type) ? value.type : "other",
    claimIndexes: Array.isArray(value.claimIndexes) ? value.claimIndexes.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < 30) : [],
  };
}

function publicProject(title: string, rawPayload: string) {
  const source = JSON.parse(rawPayload) as Record<string, unknown>;
  const skills = Array.isArray(source.verified_skills) ? source.verified_skills.slice(0, 20).map((item) => {
    const skill = item as Record<string, unknown>;
    return { skill: String(skill.skill || "").slice(0, 100), evidence: String(skill.evidence || "").slice(0, 400), confidence: skill.confidence === "explicit" ? "explicit" : "inferred" };
  }) : [];
  const bullets = Array.isArray(source.resume_bullets) ? source.resume_bullets.slice(0, 20).map((item) => {
    const bullet = item as Record<string, unknown>;
    const evidence = Array.isArray(bullet.evidence_basis) ? bullet.evidence_basis.map(String).slice(0, 8) : [];
    return { text: String(bullet.text || "").slice(0, 600), evidence, status: bullet.needs_verification ? "incomplete" : evidence.length ? "verified" : "inferred" };
  }) : [];
  const artifacts = Array.isArray(source.artifacts) ? source.artifacts.map((item) => sanitizeArtifact(item as Artifact)).filter(Boolean).slice(0, 20) : [];
  return {
    title: title.slice(0, 160),
    summary: String(source.capability_summary || "").slice(0, 1_000),
    skills,
    bullets,
    artifacts,
    roles: Array.isArray(source.matching_roles) ? source.matching_roles.map(String).slice(0, 5) : [],
  };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{32}$/i.test(token)) return Response.json({ error: "Profile not found." }, { status: 404 });
  try {
    const db = await getDb();
    const [profile] = await db.select({ title: publicEvidenceProfiles.title, payload: publicEvidenceProfiles.payload, publishedAt: publicEvidenceProfiles.publishedAt })
      .from(publicEvidenceProfiles).where(eq(publicEvidenceProfiles.token, token)).limit(1);
    if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 });
    return Response.json({ profile: { title: profile.title, projects: JSON.parse(profile.payload), publishedAt: profile.publishedAt } });
  } catch { return Response.json({ error: "This proof profile is unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const key = validPassportKey(request);
  if (!key) return Response.json({ error: "Invalid passport key." }, { status: 400 });
  const body = await request.json().catch(() => null) as { title?: unknown; projectIds?: unknown; consent?: unknown } | null;
  const projectIds = Array.isArray(body?.projectIds) ? body.projectIds.filter((item): item is string => typeof item === "string" && /^[a-f0-9-]{36}$/i.test(item)).slice(0, 10) : [];
  if (body?.consent !== true || projectIds.length === 0) return Response.json({ error: "Select projects and confirm public sharing." }, { status: 400 });
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "Evidence Profile";
  try {
    const db = await getDb();
    const rows = await db.select().from(evidenceProjects).where(and(eq(evidenceProjects.passportKey, key), inArray(evidenceProjects.id, projectIds))).limit(10);
    if (!rows.length) return Response.json({ error: "No owned projects were selected." }, { status: 400 });
    const projects = rows.map((row) => publicProject(row.title, row.payload));
    const token = crypto.randomUUID().replaceAll("-", "");
    await db.insert(publicEvidenceProfiles).values({ token, passportKey: key, title, payload: JSON.stringify(projects) });
    return Response.json({ token, path: `/proof/${token}` }, { status: 201 });
  } catch { return Response.json({ error: "Public proof profiles require the hosted Evidence Passport database." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const key = validPassportKey(request);
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!key || !/^[a-f0-9]{32}$/i.test(token)) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    const db = await getDb();
    await db.delete(publicEvidenceProfiles).where(and(eq(publicEvidenceProfiles.token, token), eq(publicEvidenceProfiles.passportKey, key)));
    return Response.json({ unpublished: true });
  } catch { return Response.json({ error: "Profile could not be unpublished." }, { status: 503 }); }
}
