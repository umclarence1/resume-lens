import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    helpful?: unknown;
    score?: unknown;
    role?: unknown;
    model?: unknown;
  } | null;

  if (
    !body ||
    typeof body.helpful !== "boolean" ||
    typeof body.score !== "number" ||
    typeof body.role !== "string"
  ) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const event = {
    event: "analysis_feedback",
    helpful: body.helpful,
    score: Math.max(0, Math.min(100, Math.round(body.score))),
    role: body.role.slice(0, 100),
    model: typeof body.model === "string" ? body.model.slice(0, 80) : "unknown",
    timestamp: new Date().toISOString(),
  };

  const webhook = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  } else {
    console.info(JSON.stringify(event));
  }

  return NextResponse.json({ accepted: true });
}
