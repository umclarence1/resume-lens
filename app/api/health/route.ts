import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "resume-lens",
    version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    ai_configured: Boolean(process.env.GEMINI_API_KEY),
    durable_rate_limit_configured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
    ),
    timestamp: new Date().toISOString(),
  });
}
