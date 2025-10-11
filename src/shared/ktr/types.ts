export type StepStatus = 'success' | 'error' | 'warning' | 'running' | 'pending' | 'not_executed' | 'stopped';

export interface StepDefinition {
  name: string;
  type: string;
}

export interface RunStatusRecord {
  step?: string;
  exit?: number;
  duration?: number;
  comment?: string;
  speed?: number;
  nr?: string;
}

export interface DetailedRun {
  batch?: string;
  startAt?: string;
  takeTime?: number;
  finish?: boolean;
  stop?: boolean;
  exit?: number;
  errors?: number;
  statuses?: RunStatusRecord[];
  events?: Record<string, unknown>;
  metrics?: string;
  slowStep?: string;
}

export type SummaryRun = DetailedRun;

export interface RawExtData {
  steps?: StepDefinition[];
  rs?: DetailedRun[];
}

export interface RawExtSummary {
  rs?: SummaryRun[];
  times?: number;
  pull?: Record<string, unknown>;
  push?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NormalizedStep {
  id: number;
  name: string;
  type: string;
  status: StepStatus;
  duration: number;
  realDuration: number;
  speed?: number;
  startTime?: string;
  batchId?: string;
  runIndex: number;
  stepInfo?: string;
  comment?: string;
  isError: boolean;
  isRunning: boolean;
  errorCount: number;
  hasExecutionData: boolean;
  cumulativeTime: number;
}

export interface NormalizedRun {
  batchId?: string;
  startAt?: string;
  finish?: boolean;
  stop?: boolean;
  errors: number;
  takeTime: number;
  slowStep?: string;
  metrics?: string;
  steps: NormalizedStep[];
  events?: Record<string, unknown>;
  overallStatus: StepStatus;
  rawDetail: DetailedRun;
  rawSummary: SummaryRun;
}

export interface NormalizedKtrData {
  runs: NormalizedRun[];
  totalRuns: number;
  pullTime: number;
  pushTime: number;
  pullInfo?: Record<string, unknown>;
  pushInfo?: Record<string, unknown>;
  summaryMeta: RawExtSummary;
  raw: {
    detailRuns: DetailedRun[];
    summaryRuns: SummaryRun[];
    steps: StepDefinition[];
  };
}
