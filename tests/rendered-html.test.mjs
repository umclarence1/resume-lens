import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the Resume Lens landing-page workflow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /See what your resume/);
  assert.match(page, /can actually prove/);
  assert.match(page, /Evidence-backed career intelligence/);
  assert.match(page, /Upload your resume/);
  assert.match(page, /Target role/);
  assert.match(page, /Analyze my resume/);
  assert.match(page, /Files are processed temporarily/);
  assert.match(page, /Transparent scoring/);
  assert.match(page, /Keyword evidence/);
  assert.match(page, /Prioritized action plan/);
  assert.match(page, /Download DOCX/);
  assert.match(page, /Download PDF/);
});

test("keeps Gemini credentials server-side with a safe demo fallback", async () => {
  const route = await readFile(
    new URL("../app/api/analyze/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.match(route, /generativelanguage\.googleapis\.com/);
  assert.match(route, /resume\.size > 8 \* 1024 \* 1024/);
  assert.match(route, /\.\.\.demoResult/);
  assert.match(route, /weightedScore/);
  assert.match(route, /keyword_evidence/);
  assert.match(route, /rateLimited/);
  assert.doesNotMatch(route, /sk-proj-/);
});

test("ships a 20-case labelled accuracy benchmark", async () => {
  const cases = JSON.parse(
    await readFile(new URL("./accuracy-cases.json", import.meta.url), "utf8"),
  );
  assert.equal(cases.length, 20);
  assert.ok(cases.every((item) => item.id && item.expected_band));
  assert.ok(cases.some((item) => item.expected_band === "weak"));
  assert.ok(cases.some((item) => item.expected_band === "discovery"));
});
