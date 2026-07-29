# Resume Lens

An AI-assisted resume analyzer built for the first edition of **Demo Wednesday**.
Resume Lens compares a PDF resume with a target role and job description, then
returns an estimated ATS score, keyword gaps, role-fit feedback, writing
suggestions, and a prioritized improvement plan.

> The score is an explainable compatibility estimate. It is not a score from a
> recruiter's actual applicant tracking system and does not guarantee an
> interview.

## Features

- PDF resume upload with type and size validation
- Target-role and job-description comparison
- Weighted ATS compatibility score
- Matched and missing keywords
- Role-fit explanation
- Grammar and clarity suggestions
- Prioritized improvement recommendations
- Recruiter-style resume summary
- Demo mode when no Gemini API key is configured
- Responsive interface and social sharing card
- Deterministic PDF text extraction and evidence verification
- Prompt-injection detection and untrusted-document isolation
- Provider timeout and retry handling
- Optional globally shared Upstash rate limiting
- Explicit adult-user privacy consent
- Health and privacy-preserving feedback endpoints
- DOCX and PDF improvement exports

## How scoring works

| Category | Weight |
| --- | ---: |
| Keyword alignment | 30% |
| Skills match | 25% |
| Experience relevance | 20% |
| Structure and completeness | 15% |
| Writing quality | 10% |

The score is designed to be transparent and useful for revision. Resume Lens
does not evaluate protected characteristics and instructs the model not to
invent candidate experience or qualifications.

## Tech stack

- React 19 and TypeScript
- Next.js-compatible app routing through vinext
- Cloudflare Workers-compatible server runtime
- Gemini Developer API with structured JSON output
- Native PDF file input
- CSS-based responsive design

## Run locally

Requirements:

- Node.js 22.13 or newer
- A Gemini API key for live analysis

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add your key to `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Without a key, the app intentionally returns a realistic demo analysis so the
complete interface can still be explored.

## Validate

```bash
npm run build
npm run lint
```

## Privacy

- Uploaded resumes are processed per request and are not intentionally stored
  by the application.
- API keys remain server-side.
- Users should remove unnecessary sensitive information before testing.

## Production configuration

For durable worldwide rate limiting, configure `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`. Without them, the application falls back to a
per-instance limiter suitable only for development. Configure
`FEEDBACK_WEBHOOK_URL` to collect anonymous usefulness signals; resume text is
never included.

Use `/api/health` for uptime checks and deployment diagnostics.

See [the production-readiness runbook](docs/PRODUCTION_READINESS.md) for release
gates and the external legal, regional, and operational work required before a
broad launch.

## Current limitations

- Scanned PDFs require a future OCR worker; unreadable scans are rejected.
- The 20 checked-in benchmark cases are a starter taxonomy, not a statistically
  validated accuracy claim.
- Durable global rate limiting requires external Upstash credentials.
- International launch still requires regional eligibility, privacy review,
  provider agreements, and native-language evaluation.

## Roadmap

- Add isolated OCR processing for scanned resumes
- Expand the benchmark to 100+ consented or synthetic resumes
- Add model-version score-drift reporting
- Validate additional languages one at a time with native reviewers

## Demo Wednesday

This project demonstrates document input, structured AI output, explainable
scoring, privacy-aware product design, and a practical user experience around a
real graduate job-search problem.
