import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const studio = await readFile(new URL("../app/studio/page.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../app/api/project-evidence/route.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("links the analyzer to the Evidence Studio", () => {
  assert.match(home, /href="\/studio"/);
  assert.match(studio, /Project Evidence Engine/);
  assert.match(studio, /Build from verified evidence/);
});

test("keeps builder drafts local and requires factual review before export", () => {
  assert.match(studio, /localStorage\.setItem\("resume-lens-studio-v1"/);
  assert.match(studio, /I have checked every claim and metric for accuracy/);
  assert.match(studio, /disabled=\{!verified\}/);
});

test("grounds project claims in evidence and rejects prompt injection", () => {
  assert.match(api, /containsExactEvidence/);
  assert.match(api, /detectsPromptInjection/);
  assert.match(api, /Never invent technologies, metrics, responsibilities/);
  assert.match(api, /square-bracket placeholder/);
});
