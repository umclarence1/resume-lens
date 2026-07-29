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
- Demo mode when no OpenAI API key is configured
- Responsive interface and social sharing card

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
- OpenAI Responses API with strict structured output
- Native PDF file input
- CSS-based responsive design

## Run locally

Requirements:

- Node.js 22.13 or newer
- An OpenAI API key for live analysis

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add your key to `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-sol
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
- The live OpenAI request uses `store: false`.
- API keys remain server-side.
- Users should remove unnecessary sensitive information before testing.

## Current limitations

- The first release relies on the model's native PDF understanding rather than
  a dedicated local OCR pipeline.
- It does not yet export an improved PDF or DOCX resume.
- It does not retain analysis history or user accounts.
- Scoring quality still needs evaluation against a curated set of resumes and
  job descriptions.

## Roadmap

- Add deterministic PDF text extraction and OCR fallback
- Add score-consistency and prompt-regression evaluations
- Generate an editable improved-resume draft without inventing facts
- Export approved revisions to DOCX and PDF
- Add report download and side-by-side before/after comparisons

## Demo Wednesday

This project demonstrates document input, structured AI output, explainable
scoring, privacy-aware product design, and a practical user experience around a
real graduate job-search problem.
