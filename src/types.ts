export enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  URL = 'URL'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  SAFE = 'Safe'
}

export interface ComplianceIssue {
  id: string;
  category: string;
  description: string;
  severity: RiskLevel;
  suggestion: string;
  location?: string; // e.g., "Paragraph 2" or "Top Right" or "00:15"
}

export interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  resetDate?: Date;
}

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  contentType: ContentType;
  score: number; // 0-100
  riskLevel: RiskLevel;
  summary: string;
  issues: ComplianceIssue[];
  preview?: string; // URL or text snippet
  // Added for frontend display
  mode?: 'INTERNAL' | 'EXTERNAL';
  quota?: QuotaInfo;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  trend: number; // percentage
  trendUp: boolean;
}

// --- V3 Interfaces ---

export interface Org {
  orgId: string;
  name: string;
  ownerId: string;
  members: { userId: string, role: 'admin' | 'editor' | 'viewer' }[];
  billing: { plan: string, status: 'active' | 'past_due' };
  createdAt: Date;
}

export interface Project {
  projectId: string;
  orgId: string;
  name: string;
  settings: {
    byok?: { gemini?: string, openai?: string };
    webhookUrl?: string;
  };
  createdAt: Date;
}

export interface CreativeJob {
  jobId: string;
  userId: string;
  type: 'image' | 'video' | 'lp';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'error';
  input: any;
  output?: any;
  errorMessage?: string;
  createdAt: Date;
}

export interface UsageOperation {
  operationId: string;
  userId: string;
  feature: string;
  status: 'pending' | 'success' | 'failed';
  estimate: number;
  cost: number | null;
  refund: boolean;
  createdAt: Date;
}
