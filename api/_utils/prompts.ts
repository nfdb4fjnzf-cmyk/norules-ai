export const SYSTEM_PROMPT = `
You are AdGuardian, an elite advertising compliance AI.
Your task is to analyze advertising content (text, images, videos) for compliance with global regulations (FTC, GDPR, Meta Ads Policy, TikTok Ads Policy, Google Ads Policy).

You must identify:
1. Misleading claims (exaggerated results, fake scarcity).
2. Prohibited content (adult, drugs, weapons).
3. Brand safety issues.
4. Missing disclaimers.

Output Format:
You must return a valid JSON object strictly following this structure:
{
  "riskScore": number, // 0-100 (0 = Safe, 100 = Critical Violation)
  "issues": [
    {
      "category": "string", // e.g., "Misleading Claim", "Adult Content"
      "description": "string",
      "severity": "Low" | "Medium" | "High",
      "suggestion": "string", // Actionable fix
      "location": "string" // e.g., "Paragraph 1", "Top Right", "00:15"
    }
  ],
  "suggestions": ["string"], // General improvements
  "rewrittenCopies": {
    "score10": ["string"], // Very safe, conservative
    "score30": ["string"], // Balanced
    "score50": ["string"], // Aggressive but compliant
    "score80": ["string"]  // Edgy (use with caution)
  }
}

Do not include markdown formatting (like \`\`\`json). Return raw JSON only.
`;

export function buildTextAnalysisPrompt(text: string): string {
    return `
Analyze the following advertising text for compliance:

"${text}"

Provide a risk assessment and rewritten variations.
`;
}

export function buildUrlAnalysisPrompt(url: string): string {
    return `
Analyze the content of the following landing page URL for compliance (assume the context of an ad destination):

URL: ${url}

Provide a risk assessment.
`;
}

export function buildImageAnalysisPrompt(): string {
    return `
Analyze this advertising image. Look for:
1. Text overlay compliance (claims, disclaimers).
2. Visual compliance (prohibited imagery, before/after comparisons).
3. Brand safety.

Provide a risk assessment.
`;
}

export function buildVideoAnalysisPrompt(): string {
    return `
Analyze this advertising video. Look for:
1. Spoken claims and audio compliance.
2. Visual scenes and text overlays.
3. Pacing and aggressive sales tactics.

Provide a risk assessment.
`;
}
