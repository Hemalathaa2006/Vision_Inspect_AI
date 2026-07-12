export interface HazardLocation {
  x: number; // percentage 0 to 100
  y: number; // percentage 0 to 100
  width: number; // percentage width
  height: number; // percentage height
}

export interface DetectedHazard {
  title: string;
  severity: "Critical" | "Moderate" | "Low";
  issue: string;
  whyItMatters: string;
  recommendations: string[];
  location?: HazardLocation;
  frameIndex?: number;
  frameTimestamp?: string;
}

export interface GoodPractice {
  title: string;
  items: string[];
}

export interface AIVerdict {
  status: string; // e.g. "Unsafe", "Needs Attention", "Safe"
  reason: string; // short sentence, max 15 words
  priority: string; // e.g. "Immediate action recommended", "Routine monitoring"
}

export interface RiskDistribution {
  critical: number;
  moderate: number;
  low: number;
  safe: number;
}

export interface VideoFrameAnalysis {
  frameIndex: number;
  timestamp: string; // e.g. "0:06"
  base64: string;
  result: InspectionResult;
}

export interface InspectionResult {
  safetyScore: number;
  grade: string;
  status: string;
  sceneSummary: string;
  detectedHazards: DetectedHazard[];
  goodPractices: GoodPractice[];
  aiConfidence: number; // 0 to 100
  verdict: AIVerdict;
  riskDistribution: RiskDistribution;
  
  // Optional video-specific summary details
  videoFrames?: VideoFrameAnalysis[];
  highestRiskFrameIndex?: number;
  highestRiskFrameTimestamp?: string;
  highestRiskFrameReason?: string;
  recommendations?: string[]; // Consolidated video recommendations
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}
