export type CompressionMode = 'safe' | 'balanced' | 'aggressive';

export type ContentType = 'prose' | 'code' | 'json' | 'logs' | 'diff' | 'mixed';

export interface ProtectedRange {
  start: number;
  end: number;
  reason: string;
  original: string;
}

export interface IntentStructure {
  action: string;
  target: string;
  constraints: string[];
  responseStyle: string[];
  rawText: string;
}

export interface CompressionRule {
  id: string;
  category: 'filler' | 'constraint' | 'action' | 'structural' | 'custom';
  contentTypes: ContentType[];
  safetyLevel: CompressionMode;
  pattern: RegExp;
  replacement: string;
  enabled: boolean;
  description: string;
}

export interface CompressionResult {
  original: string;
  compressed: string;
  tokensBefore: number;
  tokensAfter: number;
  savedTokens: number;
  savedPercent: number;
  mode: CompressionMode;
  contentType: ContentType;
  intent: IntentStructure;
  appliedRules: string[];
  protectedRanges: ProtectedRange[];
}

export interface PipelineContext {
  input: string;
  mode: CompressionMode;
  normalized: string;
  protectedRanges: ProtectedRange[];
  contentType: ContentType;
  intent: IntentStructure;
  compressed: string;
  appliedRules: string[];
}
