export interface Issue {
    type: string;
    severity: string;
    description: string;
}

export interface AnalyzedResult {
    success: boolean;
    riskScore: number;
    issues: Issue[];
    suggestions: string[];
    rewrittenCopies: string[];
}

export function parseLLMResponse(raw: string): AnalyzedResult {
    const fallbackResult: AnalyzedResult = {
        success: false,
        riskScore: 0,
        issues: [{ type: "ParseError", severity: "high", description: "Model response invalid" }],
        suggestions: [],
        rewrittenCopies: []
    };

    if (!raw || typeof raw !== 'string') {
        return fallbackResult;
    }

    try {
        // 1. Extract JSON block using regex
        // Matches { ... } allowing for nested braces is hard with regex, 
        // but usually LLM returns a main object. We'll try to find the first '{' and the last '}'
        const firstOpen = raw.indexOf('{');
        const lastClose = raw.lastIndexOf('}');

        if (firstOpen === -1 || lastClose === -1 || lastClose < firstOpen) {
            throw new Error("No JSON object found");
        }

        const jsonString = raw.substring(firstOpen, lastClose + 1);

        // 2. Parse JSON
        const parsed = JSON.parse(jsonString);

        // 3. Sanitize and Validate Fields

        // riskScore: default 0, ensure number
        let riskScore = 0;
        if (typeof parsed.riskScore === 'number') {
            riskScore = parsed.riskScore;
        } else if (typeof parsed.riskScore === 'string') {
            riskScore = parseFloat(parsed.riskScore) || 0;
        }

        // issues: default [], ensure array of correct shape
        let issues: Issue[] = [];
        if (Array.isArray(parsed.issues)) {
            issues = parsed.issues.map((item: any) => ({
                type: String(item.type || item.category || 'General'), // Handle 'category' alias if present
                severity: String(item.severity || 'low').toLowerCase(),
                description: String(item.description || 'No description provided')
            }));
        }

        // suggestions: default [], ensure array of strings
        let suggestions: string[] = [];
        if (Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions.map((s: any) => String(s));
        }

        // rewrittenCopies: default [], ensure array of strings
        // Note: Previous prompt might return an object { score10: [], ... }
        // We need to flatten it or handle it if the user expects just string[]
        // The requirement says "rewrittenCopies: string[]". 
        // If the LLM returns an object (as per previous prompt), we should probably extract values.
        // However, the prompt in api/utils/prompts.ts returns an object. 
        // The user request here asks for string[]. I will attempt to flatten if it's an object, or use as is if array.
        let rewrittenCopies: string[] = [];
        if (Array.isArray(parsed.rewrittenCopies)) {
            rewrittenCopies = parsed.rewrittenCopies.map((s: any) => String(s));
        } else if (typeof parsed.rewrittenCopies === 'object' && parsed.rewrittenCopies !== null) {
            // Flatten values if it's the object structure
            Object.values(parsed.rewrittenCopies).forEach((val: any) => {
                if (Array.isArray(val)) {
                    rewrittenCopies.push(...val.map((s: any) => String(s)));
                } else if (typeof val === 'string') {
                    rewrittenCopies.push(val);
                }
            });
        }

        // success: infer if missing
        let success = true;
        if (typeof parsed.success === 'boolean') {
            success = parsed.success;
        } else {
            // If risk score is high or there are high severity issues, maybe success is false?
            // Or simply, if we parsed successfully, success is true.
            // The requirement says: "infer based on issues.length > 0". 
            // Usually issues > 0 means "found problems", but "success" in API usually means "analysis completed".
            // Let's follow the prompt: "success 缺 → 依照 issues.length 是否 > 0 自動推測"
            // If issues exist, maybe success = true (we successfully found issues)? 
            // Or success = false (content failed compliance)?
            // In compliance tools, usually success=true means "API worked". 
            // But "issues.length > 0" implies "failed compliance".
            // Let's assume success = true means "Safe / Passed" and false means "Violations Found" based on that logic?
            // Wait, if I have issues, success is FALSE? 
            // "If issues.length > 0, success = false" seems like a reasonable interpretation for a compliance check result.
            success = issues.length === 0;
        }

        return {
            success,
            riskScore,
            issues,
            suggestions,
            rewrittenCopies
        };

    } catch (error) {
        console.error("LLM Parsing Error:", error);
        // 4. Fallback
        return fallbackResult;
    }
}
