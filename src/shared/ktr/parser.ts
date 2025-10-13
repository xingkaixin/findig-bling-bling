import type {
  DetailedRun,
  NormalizedKtrData,
  NormalizedRun,
  NormalizedStep,
  RawExtSummary,
  RunStatusRecord,
  StepDefinition,
  StepStatus
} from './types';

interface ParsedInput {
  steps: StepDefinition[];
  detailedRuns: DetailedRun[];
  summaryRuns: DetailedRun[];
  summaryMeta: Record<string, unknown>;
  times?: number;
  pull?: Record<string, unknown>;
  push?: Record<string, unknown>;
}

const virtualStepFlags = ['eventFlow', 'Dummy'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function parseErrorCount(nr?: string): number {
  if (!nr) return 0;
  const match = nr.match(/E=(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function resolveStepStatus(status: RunStatusRecord | undefined, errorCount: number): StepStatus {
  if (!status) {
    return 'not_executed';
  }

  if (errorCount > 0) return 'error';
  if (typeof status.exit !== 'number') {
    return 'success';
  }

  switch (status.exit) {
    case 0:
      return 'success';
    case 1:
      return 'warning';
    case 2:
      return 'running';
    default:
      return status.exit > 0 ? 'error' : 'success';
  }
}

function resolveRunStatus(run: DetailedRun): StepStatus {
  if ((run.errors ?? 0) > 0) return 'error';
  if (run.exit === 1) return 'error';
  if (run.exit === 0) return 'success';
  if (run.exit === 2) return 'running';
  if (run.finish === true && run.stop === false) return 'success';
  if (run.finish === true && run.stop === true) return 'stopped';
  if (run.stop) return 'stopped';
  return 'running';
}

function enrichStepDurations(steps: NormalizedStep[]): NormalizedStep[] {
  let previousCumulative = 0;
  return steps.map((step) => {
    const realDuration = Math.max(0, (step.duration || 0) - previousCumulative);
    previousCumulative = step.duration;
    return {
      ...step,
      realDuration,
      cumulativeTime: step.duration
    };
  });
}

function mapRun(
  runIndex: number,
  detail: DetailedRun,
  summary: DetailedRun,
  stepDefinitions: StepDefinition[]
): NormalizedRun {
  const statuses = ensureArray<RunStatusRecord>(detail.statuses ?? summary.statuses);

  const stepsWithMetadata = stepDefinitions
    .filter((step) => !virtualStepFlags.some((flag) => step.name.includes(flag)))
    .map((step, index) => {
      const matchedStatus = statuses.find((record) => record.step && record.step.includes(step.name));
      const errorCount = parseErrorCount(matchedStatus?.nr);
      const status = resolveStepStatus(matchedStatus, errorCount);
      const duration = matchedStatus?.duration ?? 0;

      return {
        definition: step,
        matchedStatus,
        errorCount,
        status,
        duration,
        originalIndex: index
      };
    });

  const sortedSteps = stepsWithMetadata
    .sort((a, b) => {
      if (a.duration === b.duration) {
        return a.originalIndex - b.originalIndex;
      }
      return a.duration - b.duration;
    })
    .map((item, index) => {
      const { definition, matchedStatus, status, errorCount, duration } = item;

      const baseStep: NormalizedStep = {
        id: index,
        name: definition.name,
        type: definition.type,
        status,
        duration,
        realDuration: duration,
        speed: matchedStatus?.speed,
        startTime: detail.startAt ?? summary.startAt,
        batchId: detail.batch ?? summary.batch,
        runIndex,
        stepInfo: matchedStatus?.nr,
        comment: matchedStatus?.comment,
        isError: errorCount > 0,
        isRunning: status === 'running',
        errorCount,
        hasExecutionData: Boolean(matchedStatus),
        cumulativeTime: duration
      };

      return baseStep;
    });

  const normalizedSteps = enrichStepDurations(sortedSteps).map((step, index) => ({
    ...step,
    id: index
  }));

  const takeTimeCandidate = detail.takeTime ?? summary.takeTime;
  const takeTime = typeof takeTimeCandidate === 'number' && takeTimeCandidate > 0
    ? takeTimeCandidate
    : Math.max(...normalizedSteps.map((step) => step.duration), 0);

  return {
    batchId: detail.batch ?? summary.batch,
    startAt: detail.startAt ?? summary.startAt,
    finish: detail.finish ?? summary.finish,
    stop: detail.stop ?? summary.stop,
    errors: detail.errors ?? summary.errors ?? 0,
    takeTime,
    slowStep: detail.slowStep ?? summary.slowStep,
    metrics: detail.metrics ?? summary.metrics,
    steps: normalizedSteps,
    events: detail.events ?? summary.events,
    overallStatus: resolveRunStatus(detail.exit !== undefined ? detail : summary),
    rawDetail: detail,
    rawSummary: summary
  };
}

function normalize(parsed: ParsedInput): NormalizedKtrData {
  const detailRuns = ensureArray<DetailedRun>(parsed.detailedRuns);
  const summaryRuns = ensureArray<DetailedRun>(parsed.summaryRuns);
  const stepDefinitions = ensureArray<StepDefinition>(parsed.steps);
  const runCount = Math.max(detailRuns.length, summaryRuns.length);

  const runs: NormalizedRun[] = Array.from({ length: runCount }, (_, index) => {
    const detail = detailRuns[index] ?? {};
    const summary = summaryRuns[index] ?? {};
    return mapRun(index, detail, summary, stepDefinitions);
  });

  const pullInfo = parsed.pull ?? (parsed.summaryMeta.pull as Record<string, unknown>) ?? {};
  const pushInfo = parsed.push ?? (parsed.summaryMeta.push as Record<string, unknown>) ?? {};

  return {
    runs,
    totalRuns: parsed.times ?? (parsed.summaryMeta.times as number) ?? runs.length,
    pullTime: (pullInfo?.takeTime as number) ?? 0,
    pushTime: (pushInfo?.takeTime as number) ?? 0,
    pullInfo,
    pushInfo,
    summaryMeta: parsed.summaryMeta as Record<string, unknown>,
    raw: {
      detailRuns,
      summaryRuns,
      steps: stepDefinitions
    }
  };
}

function parseDirectStructure(data: Record<string, unknown>): ParsedInput | null {
  const steps = ensureArray<StepDefinition>(data.steps);
  const detailedRuns = ensureArray<DetailedRun>(data.rs);
  const summary = isObject(data.summary) ? data.summary : {};
  const summaryRuns = ensureArray<DetailedRun>((summary as RawExtSummary)?.rs ?? data.rs);

  return {
    steps,
    detailedRuns,
    summaryRuns,
    summaryMeta: summary,
    times: (data as { times?: number }).times,
    pull: (data as { pull?: Record<string, unknown> }).pull,
    push: (data as { push?: Record<string, unknown> }).push
  };
}

function parseWrappedStructure(data: Record<string, unknown>): ParsedInput | null {
  const result = ensureArray<Record<string, unknown>>(data.result);
  const first = result[0];
  if (!first) return null;

  const extDataRaw = first.ext_data;
  const extSummaryRaw = first.ext_summary;

  const extData = typeof extDataRaw === 'string' ? JSON.parse(extDataRaw) : extDataRaw;
  const extSummary = typeof extSummaryRaw === 'string' ? JSON.parse(extSummaryRaw) : extSummaryRaw;

  if (!isObject(extData) || !isObject(extSummary)) {
    return null;
  }

  return {
    steps: ensureArray<StepDefinition>(extData.steps),
    detailedRuns: ensureArray<DetailedRun>(extData.rs),
    summaryRuns: ensureArray<DetailedRun>(extSummary.rs),
    summaryMeta: extSummary,
    times: (extSummary as { times?: number }).times,
    pull: (extSummary as { pull?: Record<string, unknown> }).pull,
    push: (extSummary as { push?: Record<string, unknown> }).push
  };
}

export function parseKtrPayload(raw: unknown): NormalizedKtrData | null {
  try {
    const source = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!isObject(source)) {
      return null;
    }

    const direct = parseDirectStructure(source);
    if (direct && direct.steps.length > 0) {
      return normalize(direct);
    }

    const wrapped = parseWrappedStructure(source);
    if (wrapped && wrapped.steps.length > 0) {
      return normalize(wrapped);
    }

    return null;
  } catch (error) {
    console.warn('KTR数据解析失败', error);
    return null;
  }
}

export function tryParseJson<T>(input: string | T): T | null {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as T;
    } catch (error) {
      console.warn('JSON解析失败', error);
      return null;
    }
  }
  return (input as T) ?? null;
}
