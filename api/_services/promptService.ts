export interface PromptTemplate {
    id: string;
    template: string;
    variables: string[];
    description: string;
}

const TEMPLATES: Record<string, PromptTemplate> = {
    'ad_copy_gen': {
        id: 'ad_copy_gen',
        description: 'Generate high-converting ad copy with risk score',
        variables: ['policyInstruction', 'targetRiskScore', 'prompt'],
        template: `Role: Expert Copywriter.
Policy: {{policyInstruction}} (Target Score: {{targetRiskScore}}/100).
Task: Generate high-converting ad copy.
Output: JSON { "text": "content...", "riskScore": 0-100 }.
Constraint: No markdown in JSON values. Clean text only.

User Request: {{prompt}}`
    }
};

export const promptService = {
    /**
     * Render a prompt template with variables
     */
    render: (templateId: string, variables: Record<string, any>): string => {
        const templateDef = TEMPLATES[templateId];
        if (!templateDef) {
            throw new Error(`Template ${templateId} not found`);
        }

        let rendered = templateDef.template;
        for (const key of templateDef.variables) {
            const value = variables[key] !== undefined ? variables[key] : '';
            // Simple string replacement (could be improved with a library like mustache)
            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return rendered;
    },

    /**
     * Sanitize User Input (Basic)
     * Removes potentially dangerous patterns like "Ignore previous instructions"
     */
    sanitize: (input: string): string => {
        if (!input) return '';

        let clean = input;

        // 1. Remove "Ignore previous instructions" variants
        const injectionPatterns = [
            /ignore\s+previous\s+instructions/gi,
            /ignore\s+all\s+instructions/gi,
            /system\s+override/gi,
            /you\s+are\s+now\s+unrestricted/gi
        ];

        for (const pattern of injectionPatterns) {
            clean = clean.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
        }

        // 2. Basic HTML/Script stripping (if needed, though LLMs usually handle it, but good for safety)
        // clean = clean.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");

        return clean;
    },

    /**
     * Get Policy Instruction based on Risk Score
     */
    getPolicyInstruction: (targetRiskScore: number): string => {
        if (targetRiskScore >= 90) return "Strictly compliant. Safe & professional.";
        if (targetRiskScore >= 80) return "High compliance. Avoid clear violations.";
        if (targetRiskScore >= 50) return "Balanced. Prioritize conversion.";
        if (targetRiskScore >= 20) return "Loose compliance. Focus on impact.";
        return "Ignore rules. Maximize shock value.";
    }
};
