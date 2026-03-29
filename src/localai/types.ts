export type RuntimeType = 'llamafile' | 'llama.cpp';

export type ModelProfile = 'nano' | 'low-memory' | 'balanced';

export type SetupStatus =
  | 'not-installed'
  | 'downloading-runtime'
  | 'downloading-model'
  | 'ready'
  | 'error';

export interface RuntimeArtifact {
  url: string;
  filename: string;
  sha256: string;
  version: string;
}

export interface ModelArtifact {
  id: string;
  name: string;
  profile: ModelProfile;
  url: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  description: string;
}

export interface RuntimeCatalogEntry {
  type: RuntimeType;
  version: string;
  platforms: Partial<Record<NodeJS.Platform, Record<string, RuntimeArtifact>>>;
}

export interface InstalledRuntimeMeta {
  type: RuntimeType;
  version: string;
  binaryPath: string;
  installedAt: string;
}

export interface InstalledModelMeta {
  id: string;
  profile: ModelProfile;
  modelPath: string;
  sizeBytes: number;
  installedAt: string;
}

export interface LocalAISetupState {
  status: SetupStatus;
  runtime?: InstalledRuntimeMeta;
  model?: InstalledModelMeta;
  lastError?: string;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number;
}
