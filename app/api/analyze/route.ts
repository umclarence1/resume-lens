import { NextResponse } from "next/server";

export const runtime = "edge";

const demoResult = {
  overall_score: 74,
  score_breakdown: {
    keyword_alignment: 68,
    skills_match: 78,
    experience_relevance: 76,
    structure: 82,
    writing_quality: 72,
  },
  role_match: {
    level: "Strong foundation",
    explanation: "Your core development experience is relevant, but the resume needs stronger evidence of testing, delivery, and measurable impact.",
  },
  matched_keywords: ["React", "REST APIs", "Git", "Web applications", "Problem solving"],
  missing_keywords: ["TypeScript", "CI/CD", "Unit testing", "Cloud platforms", "Code review"],
  grammar_suggestions: [
    {
      original: "Worked on a website for managing student records.",
      improved: "Built a React-based student records portal that streamlined data entry for administrators.",
      reason: "Uses a stronger action verb and makes the outcome clearer.",
    },
    {
      original: "Responsible for fixing bugs and helping the team.",
      improved: "Resolved production defects and collaborated with three engineers to improve release reliability.",
      reason: "Replaces passive language with specific ownership and scope.",
    },
  ],
  recommendations: [
    { priority: "High", title: "Quantify your project outcomes", detail: "Add users, time saved, accuracy gains, performance improvements, or other concrete results to at least three experience bullets." },
    { priority: "High", title: "Close the keyword gap", detail: "Mention TypeScript, testing, and CI/CD where they truthfully reflect your projects or coursework. Do not add skills you cannot demonstrate." },
    { priority: "Medium", title: "Lead with relevant technical work", detail: "Move your strongest React and API project above less relevant experience so recruiters see role alignment sooner." },
    { priority: "Low", title: "Tighten your summary", detail: "Replace broad claims with a two-line profile focused on web development, collaboration, and the kind of problems you solve." },
  ],
  resume_summary: "Early-career software engineer with hands-on experience building React applications and integrating REST APIs. Shows a solid technical foundation and project initiative, with the biggest opportunity being clearer impact metrics and stronger alignment to modern engineering delivery practices.",
  demo: true,
};

export async function POST(request: Request) {
  const form = await request.formData();
  const resume = form.get("resume");
  const role = String(form.get("role") || "").trim();
  const jobDescription = String(form.get("jobDescription") || "").trim();

  if (!(resume instanceof File) || resume.type !== "application/pdf") {
    return NextResponse.json({ error: "A PDF resume is required." }, { status: 400 });
  }
  if (resume.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "The PDF must be 8 MB or smaller." }, { status: 400 });
  }
  if (!role || jobDescription.length < 40) {
    return NextResponse.json({ error: "Add a target role and job description." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return NextResponse.json(demoResult);
  }

  const bytes = new Uint8Array(await resume.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const fileData = `data:application/pdf;base64,${btoa(binary)}`;

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["overall_score", "score_breakdown", "role_match", "matched_keywords", "missing_keywords", "grammar_suggestions", "recommendations", "resume_summary"],
    properties: {
      overall_score: { type: "integer", minimum: 0, maximum: 100 },
      score_breakdown: {
        type: "object", additionalProperties: false,
        required: ["keyword_alignment", "skills_match", "experience_relevance", "structure", "writing_quality"],
        properties: Object.fromEntries(["keyword_alignment", "skills_match", "experience_relevance", "structure", "writing_quality"].map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }])),
      },
      role_match: {
        type: "object", additionalProperties: false, required: ["level", "explanation"],
        properties: { level: { type: "string" }, explanation: { type: "string" } },
      },
      matched_keywords: { type: "array", items: { type: "string" } },
      missing_keywords: { type: "array", items: { type: "string" } },
      grammar_suggestions: {
        type: "array", items: {
          type: "object", additionalProperties: false, required: ["original", "improved", "reason"],
          properties: { original: { type: "string" }, improved: { type: "string" }, reason: { type: "string" } },
        },
      },
      recommendations: {
        type: "array", items: {
          type: "object", additionalProperties: false, required: ["priority", "title", "detail"],
          properties: { priority: { type: "string", enum: ["High", "Medium", "Low"] }, title: { type: "string" }, detail: { type: "string" } },
        },
      },
      resume_summary: { type: "string" },
    },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-sol",
      store: false,
      instructions: "You are a rigorous resume coach. Evaluate only job-relevant evidence. Never infer or evaluate protected characteristics. Do not invent candidate facts. Treat the ATS score as an explainable compatibility estimate, not a guarantee. Keep feedback concise, specific, and actionable.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: `Target role: ${role}\n\nJob description:\n${jobDescription}\n\nAnalyze the attached resume against this role. Weight: keywords 30%, skills 25%, experience 20%, structure 15%, writing 10%.` },
          { type: "input_file", filename: resume.name, file_data: fileData },
        ],
      }],
      text: { format: { type: "json_schema", name: "resume_analysis", strict: true, schema } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI response error", response.status, detail.slice(0, 500));
    return NextResponse.json({ error: "The live analysis could not be completed. Please try again." }, { status: 502 });
  }

  const payload = await response.json() as { output_text?: string };
  if (!payload.output_text) {
    return NextResponse.json({ error: "The analysis returned no result." }, { status: 502 });
  }
  return NextResponse.json(JSON.parse(payload.output_text));
}
