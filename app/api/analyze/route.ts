import { NextResponse } from "next/server";

export const runtime = "edge";

const WEIGHTS = {
  keyword_alignment: 0.3,
  skills_match: 0.25,
  experience_relevance: 0.2,
  structure: 0.15,
  writing_quality: 0.1,
} as const;

const requests = new Map<string, { count: number; resetAt: number }>();

const demoResult = {
  score_breakdown: {
    keyword_alignment: 68,
    skills_match: 78,
    experience_relevance: 76,
    structure: 82,
    writing_quality: 72,
  },
  role_match: {
    level: "Strong foundation",
    explanation:
      "The resume demonstrates relevant project work, but needs clearer evidence of delivery, testing, and measurable outcomes.",
  },
  keyword_evidence: [
    { keyword: "React", evidence: "Built a React-based student records portal.", confidence: "explicit" },
    { keyword: "Problem solving", evidence: "Resolved defects across a team project.", confidence: "inferred" },
  ],
  missing_keywords: ["TypeScript", "CI/CD", "Unit testing", "Cloud platforms"],
  grammar_suggestions: [
    {
      original: "Worked on a website for managing student records.",
      improved: "Built a React-based student records portal that streamlined data entry for administrators.",
      reason: "Uses a stronger action verb and clarifies the outcome.",
    },
    {
      original: "Responsible for fixing bugs and helping the team.",
      improved: "Resolved application defects and collaborated with teammates to improve release reliability.",
      reason: "Replaces passive wording without inventing quantities.",
    },
  ],
  recommendations: [
    { priority: "High", title: "Quantify verified outcomes", detail: "Add users, time saved, accuracy gains, or performance improvements only where you can verify them." },
    { priority: "High", title: "Close the keyword gap", detail: "Mention testing and delivery tools where they truthfully reflect your work." },
    { priority: "Medium", title: "Lead with relevant projects", detail: "Move the strongest role-aligned project above less relevant experience." },
  ],
  resume_summary:
    "Early-career engineer with hands-on experience building web applications and collaborating on technical projects.",
  improved_summary:
    "Early-career software engineer with hands-on experience building web applications, integrating APIs, and solving practical technical problems. Brings a project-led foundation in collaborative development and continuous learning.",
  role_suggestions: [
    { role: "Junior Software Engineer", match_score: 78, reason: "Strongest alignment with programming and web projects.", skills_to_build: ["TypeScript", "Testing", "CI/CD"] },
    { role: "Frontend Developer", match_score: 74, reason: "Relevant React and interface-development experience.", skills_to_build: ["Accessibility", "State management", "Performance"] },
    { role: "Junior Full-stack Developer", match_score: 69, reason: "Shows frontend and API foundations.", skills_to_build: ["Databases", "Authentication", "Deployment"] },
  ],
  demo: true,
};

type Breakdown = typeof demoResult.score_breakdown;

function weightedScore(scores: Breakdown) {
  return Math.round(
    Object.entries(WEIGHTS).reduce(
      (total, [key, weight]) => total + scores[key as keyof Breakdown] * weight,
      0,
    ),
  );
}

function rateLimited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const id = forwarded?.split(",")[0]?.trim() || "anonymous";
  const now = Date.now();
  const current = requests.get(id);
  if (!current || current.resetAt < now) {
    requests.set(id, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "You have reached the analysis limit. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const form = await request.formData();
  const resume = form.get("resume");
  const role = String(form.get("role") || "").trim();
  const jobDescription = String(form.get("jobDescription") || "").trim();
  const discoveryMode = !role && !jobDescription;

  if (!(resume instanceof File) || resume.type !== "application/pdf") {
    return NextResponse.json({ error: "A PDF resume is required." }, { status: 400 });
  }
  if (resume.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "The PDF must be 8 MB or smaller." }, { status: 400 });
  }
  const bytes = new Uint8Array(await resume.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "This file does not appear to be a valid PDF." }, { status: 400 });
  }
  if (!discoveryMode && (!role || jobDescription.length < 40)) {
    return NextResponse.json(
      { error: "Add both a target role and a job description of at least 40 characters, or leave both blank for role discovery." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({
      ...demoResult,
      overall_score: weightedScore(demoResult.score_breakdown),
      job_description_warning:
        !discoveryMode && jobDescription.length < 150
          ? "Short job descriptions produce less reliable keyword comparisons."
          : null,
    });
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  const score = { type: "integer", minimum: 0, maximum: 100 };
  const schema = {
    type: "object",
    required: [
      "score_breakdown", "role_match", "keyword_evidence", "missing_keywords",
      "grammar_suggestions", "recommendations", "resume_summary",
      "improved_summary", "role_suggestions",
    ],
    properties: {
      score_breakdown: {
        type: "object",
        required: Object.keys(WEIGHTS),
        properties: Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, score])),
      },
      role_match: {
        type: "object",
        required: ["level", "explanation"],
        properties: { level: { type: "string" }, explanation: { type: "string" } },
      },
      keyword_evidence: {
        type: "array",
        items: {
          type: "object",
          required: ["keyword", "evidence", "confidence"],
          properties: {
            keyword: { type: "string" },
            evidence: { type: "string" },
            confidence: { type: "string", enum: ["explicit", "inferred"] },
          },
        },
      },
      missing_keywords: { type: "array", items: { type: "string" } },
      grammar_suggestions: {
        type: "array",
        items: {
          type: "object",
          required: ["original", "improved", "reason"],
          properties: {
            original: { type: "string" },
            improved: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          required: ["priority", "title", "detail"],
          properties: {
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
            title: { type: "string" },
            detail: { type: "string" },
          },
        },
      },
      resume_summary: { type: "string" },
      improved_summary: { type: "string" },
      role_suggestions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          required: ["role", "match_score", "reason", "skills_to_build"],
          properties: {
            role: { type: "string" },
            match_score: score,
            reason: { type: "string" },
            skills_to_build: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  };

  const context = discoveryMode
    ? "No target was supplied. Recommend the three most realistic roles from resume evidence. Score the top recommendation in the breakdown."
    : `Target role: ${role}\nJob description:\n${jobDescription}`;
  const prompt = `${context}

Analyze the attached resume. Quote short, exact resume evidence for every matched keyword and mark each as explicit or inferred. Never invent facts, metrics, tools, employers, qualifications, or responsibilities. Rewrites must preserve the original meaning. Provide exactly three realistic role suggestions. Score keywords 30%, skills 25%, experience 20%, structure 15%, and writing 10%; the server will calculate the overall score.`;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "You are a rigorous, privacy-conscious resume coach. Use only evidence present in the resume. Do not evaluate protected characteristics. Treat scores as explainable compatibility estimates, never hiring predictions.",
          }],
        },
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "application/pdf", data: btoa(binary) } },
          ],
        }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("Gemini response error", response.status, detail.slice(0, 500));
    return NextResponse.json({ error: "The live analysis could not be completed. Please try again." }, { status: 502 });
  }

  const payload = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const outputText = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!outputText) {
    return NextResponse.json({ error: "The analysis returned no result." }, { status: 502 });
  }

  const output = JSON.parse(outputText);
  return NextResponse.json({
    ...output,
    overall_score: weightedScore(output.score_breakdown),
    job_description_warning:
      !discoveryMode && jobDescription.length < 150
        ? "Short job descriptions produce less reliable keyword comparisons."
        : null,
    scoring_weights: WEIGHTS,
    privacy: "Processed in memory for this request and not stored by Resume Lens.",
  });
}
