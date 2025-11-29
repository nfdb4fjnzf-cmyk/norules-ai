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
