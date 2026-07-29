import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Resume Lens landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Resume Lens — AI Resume Analyzer<\/title>/i);
  assert.match(html, /Turn your resume into/);
  assert.match(html, /Upload your resume/);
  assert.match(html, /Target role/);
  assert.match(html, /Analyze my resume/);
  assert.match(html, /Your resume is not stored/);
});

test("renders the analyzer's trust and feature messaging", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /ATS compatibility/);
  assert.match(html, /Keyword gaps/);
  assert.match(html, /Action plan/);
  assert.match(html, /AI-generated guidance, not a guarantee/);
  assert.match(html, /Your files are processed temporarily/);
});
