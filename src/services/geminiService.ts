import { AnalysisResult, ContentType, RiskLevel, ComplianceIssue } from "../types";
import { encryptForTransport, decryptLocal } from "../utils/encryption";

// Helper to convert file to base64 (still needed for preview or if we want to send base64, but API expects FormData for files)
// Actually API expects FormData for files.
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeContent = async (
  type: ContentType,
  data: string | File
): Promise<AnalysisResult> => {

  let targetEndpoint = '';
  let body: any;
  let headers: any = {};

  if (type === ContentType.TEXT) {
    targetEndpoint = '/api/analyze/text';
    body = JSON.stringify({ text: data });
    headers['Content-Type'] = 'application/json';
  } else if (type === ContentType.URL) {
    targetEndpoint = '/api/analyze/url';
    body = JSON.stringify({ url: data });
    headers['Content-Type'] = 'application/json';
  } else if (type === ContentType.IMAGE || type === ContentType.VIDEO) {
    targetEndpoint = type === ContentType.IMAGE ? '/api/analyze/image' : '/api/analyze/video';
    const formData = new FormData();
    formData.append('file', data as File);
    body = formData;
    // Content-Type header is set automatically with boundary for FormData
  }

  let finalEndpoint = targetEndpoint;

  // Check for Custom API Key
  const encryptedLocalKey = localStorage.getItem('custom_api_key');

  if (encryptedLocalKey) {
    try {
      // 1. Decrypt from LocalStorage
      const plainKey = await decryptLocal(encryptedLocalKey);

      // 2. Encrypt for Transport
      const transportKey = await encryptForTransport(plainKey);

      // 3. Use Secure Proxy
      finalEndpoint = '/api/secure-proxy';
      headers['X-Encrypted-Key'] = transportKey;
      headers['X-Target-Endpoint'] = targetEndpoint;

    } catch (e) {
      console.error("Failed to process External Key", e);
      // Fallback to Internal or Throw? 
      // If key is invalid/expired, we should probably fail or warn.
      // For now, let's throw so the UI prompts user to re-enter key.
      throw new Error("Session Key Expired. Please re-enter your API Key in Settings.");
    }
  }

  try {
    const response = await fetch(finalEndpoint, {
      method: 'POST',
      headers,
      body
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Error ${response.status}: ${response.statusText}`);
    }

    const { data: resultData, mode, quota } = json;

    // Map Backend response to Frontend types
    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      contentType: type,
      score: resultData.riskScore || 0,
      riskLevel: resultData.riskScore > 90 ? RiskLevel.SAFE : (resultData.riskScore > 70 ? RiskLevel.LOW : (resultData.riskScore > 50 ? RiskLevel.MEDIUM : RiskLevel.HIGH)),
      summary: "Analysis complete.", // Backend doesn't return summary yet? Or maybe it does in 'data'?
      issues: (resultData.issues || []).map((issue: any, idx: number) => ({
        id: `issue-${idx}`,
        category: issue.category || "General",
        description: issue.description || "Potential issue detected",
        severity: (issue.severity as RiskLevel) || RiskLevel.LOW,
        suggestion: issue.suggestion || "Review content manually.",
        location: issue.location
      })),
      preview: type === ContentType.TEXT ? (data as string).substring(0, 50) + "..." : "Media Content",
      mode,
      quota
    };

  } catch (error: any) {
    console.error("Analysis Failed", error);
    throw error; // Re-throw to let UI handle it (Toast, etc)
  }
};
