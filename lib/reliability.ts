export const SCORE_WEIGHTS = {
  keyword_alignment: 0.3,
  skills_match: 0.25,
  experience_relevance: 0.2,
  structure: 0.15,
  writing_quality: 0.1,
} as const;

export type ScoreBreakdown = Record<keyof typeof SCORE_WEIGHTS, number>;

const injectionPatterns = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/i,
  /system\s*(override|message)/i,
  /do\s+not\s+analy[sz]e\s+(this|the)\s+resume/i,
];

export function weightedScore(scores: ScoreBreakdown) {
  return Math.round(
    Object.entries(SCORE_WEIGHTS).reduce(
      (total, [key, weight]) => total + scores[key as keyof ScoreBreakdown] * weight,
      0,
    ),
  );
}

export function normalizeForEvidence(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function containsExactEvidence(resumeText: string, evidence: string) {
  return normalizeForEvidence(resumeText).includes(normalizeForEvidence(evidence));
}

export function detectsPromptInjection(text: string) {
  return injectionPatterns.some((pattern) => pattern.test(text));
}
