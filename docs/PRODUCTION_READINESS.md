# Resume Lens production-readiness runbook

## Required production services

- A paid Gemini API project in every supported operating region.
- Upstash Redis for globally shared abuse limits.
- An error-monitoring service and uptime monitor pointed at `/api/health`.
- An HTTPS feedback collector configured through `FEEDBACK_WEBHOOK_URL`.
- A privacy contact and reviewed privacy notice.

## Required Vercel variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini credential |
| `GEMINI_MODEL` | Pinned model version |
| `UPSTASH_REDIS_REST_URL` | Shared rate-limit store |
| `UPSTASH_REDIS_REST_TOKEN` | Shared rate-limit credential |
| `FEEDBACK_WEBHOOK_URL` | Optional anonymous quality events |

## Release gates

1. `npm test` and `npm run lint` pass.
2. The Vercel and Sites builds pass.
3. A text PDF and an injection-test PDF return expected results.
4. The health endpoint reports AI and durable limiting configured.
5. No resume text, name, email, phone number, or file is logged.
6. Provider-region eligibility and age restrictions are reflected in product access.

## Accuracy program

The checked-in 20-case benchmark is a starter taxonomy, not a scientific
validation set. Before removing the Beta label:

- expand to at least 100 synthetic or consented examples;
- have two reviewers label each case independently;
- measure evidence precision, unsupported-claim rate, parsing success, score
  repeatability, and role-recommendation relevance;
- version results by prompt and model;
- block releases that regress the approved thresholds.

Suggested initial gates:

- evidence precision at least 95%;
- unsupported factual claims below 1%;
- supported text-PDF parsing success at least 95%;
- repeated score variation no greater than five points.

## Incident response

1. Disable `GEMINI_API_KEY` or the production deployment if sensitive data may
   be exposed.
2. Preserve infrastructure metadata without copying resume content.
3. Rotate affected credentials.
4. Notify the privacy owner and providers.
5. Follow applicable breach-notification requirements.
6. Document the cause, impact, remediation, and regression test.

## External work that code cannot replace

- Legal review and international-transfer assessment.
- Provider data-processing agreements.
- Native-language reviewers and localized benchmark labels.
- Consented benchmark data.
- Support and incident-response staffing.
