export interface RequestContext {
    userId: string;
    plan: "free" | "lite" | "pro" | "unlimited";
    points: number;
    ip: string;
    requestId: string;
    llmMode?: "INTERNAL" | "EXTERNAL";
    email?: string;
}

export function createEmptyContext(): RequestContext {
    return {
        userId: '',
        plan: 'free',
        points: 0,
        ip: '',
        requestId: ''
    };
}
