export type Id = string | number;
export interface Page<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}
export interface Document {
  docId: Id;
  docTitle: string;
  description: string;
  status: string;
  currentVersionId?: Id;
  lockVersion?: number;
  extension?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Version {
  versionId: Id;
  docId: Id;
  version: string;
  status: string;
  docUrl?: string;
  convertedDocUrl?: string;
  changelog?: string;
  uploadUser?: string;
  createdAt?: string;
}
export interface Segment {
  id: Id;
  text: string;
  chunkId: string;
  documentId: Id;
  documentVersion: Id;
  chunkOrder: number;
  status: string;
  skipEmbedding?: number;
  lockVersion?: number;
  metadata?: string;
}
export interface Reference {
  documentId?: string;
  documentTitle?: string;
  url?: string;
  chunkId?: string;
  parentChunkId?: string;
  chunkContent?: string;
  similarityScore?: number;
  rerankScore?: number;
  retrievalSource?: string;
}
export interface Conversation {
  conversationId: string;
  title: string;
  createdAt?: string;
}
export interface Message {
  messageId: string;
  type: "USER" | "ASSISTANT";
  content: string;
  ragReferences?: Reference[];
  createdAt?: string;
  transformContent?: string;
  modelName?: string;
  tokenCount?: number;
  progress?: string;
  notice?: string;
}
export interface EvalConfig {
  topK: number;
  concurrency: number;
  enableLlmJudge: boolean;
  reviewScoreThreshold: number;
  reviewMrrThreshold: number;
  reviewRecallAtKThreshold: number;
}
export interface EvalCase {
  caseId: string;
  question: string;
  answer: string;
  success: boolean;
  error?: string;
  latencyMs: number;
  transformContent?: string;
  retrievalScores?: Record<string, number | boolean>;
  generationScores?: Record<string, number | string | null>;
  ragReferences?: Reference[];
  retrievedChunkIds?: string[];
  retrievedDocumentIds?: string[];
}
export interface EvalRun {
  runId: string;
  datasetPath: string;
  createdAt: string;
  totalCases: number;
  evaluatedCases: number;
  generationEvaluatedCases: number;
  hitAtK?: number;
  faithfulness?: number;
  failedCount?: number;
  reviewCount?: number;
}
export interface Report extends EvalRun {
  config: EvalConfig;
  retrieval?: Record<string, number>;
  generation?: Record<string, number>;
  context?: Record<string, number>;
  caseResults: EvalCase[];
  failedCaseIds: string[];
  reviewCaseIds: string[];
}
export interface Delta {
  baseline: number | null;
  candidate: number | null;
  delta: number | null;
}
export interface Comparison {
  baselineRunId: string;
  candidateRunId: string;
  improvedCaseIds: string[];
  regressedCaseIds: string[];
  [key: string]: Delta | string | string[];
}
