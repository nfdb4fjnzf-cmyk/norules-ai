export interface RequestContext {
    userId: string;
    plan: "free" | "lite" | "pro" | "ultra" | "unlimited";
    points: number;
    ip: string;
    requestId: string;
    llmMode?: "INTERNAL" | "EXTERNAL";
    mode?: string;
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
