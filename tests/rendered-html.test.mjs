import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the Resume Lens landing-page workflow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Turn your resume into/);
  assert.match(page, /Upload your resume/);
  assert.match(page, /Target role/);
  assert.match(page, /Analyze my resume/);
  assert.match(page, /Your resume is not stored/);
  assert.match(page, /ATS compatibility/);
  assert.match(page, /Keyword gaps/);
  assert.match(page, /Action plan/);
});

test("keeps Gemini credentials server-side with a safe demo fallback", async () => {
  const route = await readFile(
    new URL("../app/api/analyze/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.match(route, /generativelanguage\.googleapis\.com/);
  assert.match(route, /resume\.size > 8 \* 1024 \* 1024/);
  assert.match(route, /return NextResponse\.json\(demoResult\)/);
  assert.doesNotMatch(route, /sk-proj-/);
});
