import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { evidenceProjects } from "@/db/schema";

export const runtime = "edge";

function passportKey(request: Request) {
  const key = request.headers.get("x-passport-key") || "";
  return /^[a-f0-9-]{36}$/i.test(key) ? key : null;
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Evidence Passport is unavailable.";
  return message.includes("no such table")
    ? "Evidence Passport is being prepared. Please try again shortly."
    : "Evidence Passport could not be updated.";
}

export async function GET(request: Request) {
  const key = passportKey(request);
  if (!key) return Response.json({ error: "Invalid passport key." }, { status: 400 });
  try {
    const db = await getDb();
    const rows = await db.select().from(evidenceProjects)
      .where(eq(evidenceProjects.passportKey, key))
      .orderBy(desc(evidenceProjects.updatedAt)).limit(50);
    return Response.json({ projects: rows.map((row) => ({ id: row.id, title: row.title, payload: JSON.parse(row.payload), createdAt: row.createdAt, updatedAt: row.updatedAt })) });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const key = passportKey(request);
  if (!key) return Response.json({ error: "Invalid passport key." }, { status: 400 });
  const body = await request.json().catch(() => null) as { id?: unknown; title?: unknown; payload?: unknown } | null;
  const id = typeof body?.id === "string" && /^[a-f0-9-]{36}$/i.test(body.id) ? body.id : crypto.randomUUID();
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  const payload = JSON.stringify(body?.payload ?? {});
  if (!title || payload.length > 80_000) return Response.json({ error: "Invalid evidence project." }, { status: 400 });
  try {
    const db = await getDb();
    await db.insert(evidenceProjects).values({ id, passportKey: key, title, payload })
      .onConflictDoUpdate({
        target: evidenceProjects.id,
        set: { title, payload, updatedAt: new Date().toISOString() },
        setWhere: and(eq(evidenceProjects.passportKey, key), eq(evidenceProjects.id, id)),
      });
    return Response.json({ saved: true, id });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const key = passportKey(request);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!key || !/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    const db = await getDb();
    await db.delete(evidenceProjects).where(and(eq(evidenceProjects.passportKey, key), eq(evidenceProjects.id, id)));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
