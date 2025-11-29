import { AnalysisResponse, IssueItem } from './responseFormatter';

export function parseLLMResponse(jsonString: string): Partial<AnalysisResponse> {
    try {
        // Clean up markdown code blocks if present
        let cleanJson = jsonString.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '');
        }

        const parsed = JSON.parse(cleanJson);

        // Validate and sanitize structure
        const issues: IssueItem[] = (parsed.issues || []).map((issue: any, index: number) => ({
            id: `issue-${Date.now()}-${index}`,
            category: issue.category || 'General',
            description: issue.description || 'Issue detected',
            severity: ['Low', 'Medium', 'High'].includes(issue.severity) ? issue.severity : 'Low',
            suggestion: issue.suggestion || 'Review manually',
            location: issue.location
        }));

        const rewrittenCopies = parsed.rewrittenCopies || {};

        return {
            riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 0,
            issues,
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            rewrittenCopies: {
                score10: Array.isArray(rewrittenCopies.score10) ? rewrittenCopies.score10 : [],
                score30: Array.isArray(rewrittenCopies.score30) ? rewrittenCopies.score30 : [],
                score50: Array.isArray(rewrittenCopies.score50) ? rewrittenCopies.score50 : [],
                score80: Array.isArray(rewrittenCopies.score80) ? rewrittenCopies.score80 : [],
            }
        };

    } catch (error) {
        console.error('Failed to parse LLM response:', error);
        console.error('Raw response:', jsonString);
        throw new Error('Failed to parse analysis results');
    }
}
