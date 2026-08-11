import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const studio = await readFile(new URL("../app/studio/page.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../app/api/project-evidence/route.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const passportApi = await readFile(new URL("../app/api/passport/route.ts", import.meta.url), "utf8");
const matchApi = await readFile(new URL("../app/api/evidence-match/route.ts", import.meta.url), "utf8");
const proofApi = await readFile(new URL("../app/api/proof-profile/route.ts", import.meta.url), "utf8");
const proofPage = await readFile(new URL("../app/proof/[token]/page.tsx", import.meta.url), "utf8");
const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

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

test("ships a persistent, private-key Evidence Passport", () => {
  assert.equal(hosting.d1, "DB");
  assert.match(passportApi, /x-passport-key/);
  assert.match(passportApi, /passportKey/);
  assert.match(studio, /Save project to Passport/);
  assert.match(studio, /browser holds the key used to retrieve them/);
});

test("maps job requirements to proof instead of keywords alone", () => {
  assert.match(matchApi, /strong.*partial.*inferred.*missing/s);
  assert.match(matchApi, /Never invent evidence/);
  assert.match(studio, /Job Evidence Matrix/);
  assert.match(studio, /Why you can say this/);
});

test("keeps the Evidence Passport functional on Vercel", () => {
  assert.match(nextConfig, /process\.env\.VERCEL/);
  assert.match(nextConfig, /cloudflare-workers-stub/);
  assert.match(studio, /resume-lens-passport-/);
  assert.match(studio, /Saved privately on this device/);
});

test("links secure artifacts to individual evidence claims", () => {
  assert.match(studio, /Artifact Vault/);
  assert.match(studio, /claimIndexes/);
  assert.match(studio, /url\.protocol !== "https:"/);
  assert.match(studio, /Which claims does it support/);
});

test("publishes a privacy-controlled evidence profile", () => {
  assert.match(proofApi, /body\?\.consent !== true/);
  assert.doesNotMatch(proofApi, /verified_answers/);
  assert.match(proofApi, /publicProject/);
  assert.match(proofPage, /Trust note/);
  assert.match(studio, /Raw project descriptions, contact details and verification answers stay private/);
});
