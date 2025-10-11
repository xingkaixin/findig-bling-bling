import { statusToLabel } from '@shared/ktr/status';
import type { NormalizedKtrData, NormalizedRun, NormalizedStep } from '@shared/ktr/types';

const PANEL_ID = 'ktr-visualization-panel';
const RUN_CONTENT_ID = 'ktr-run-content';
const TAB_CONTAINER_ID = 'ktr-viz-tabs';
const STYLES_ID = 'ktr-viz-styles';

let currentData: NormalizedKtrData | null = null;
let outsideClickHandler: ((event: MouseEvent) => void) | null = null;

function ensureStyles() {
  if (document.getElementById(STYLES_ID)) {
    return;
  }

  const styles = `
    .ktr-viz-panel { position: fixed; top: 50px; right: 20px; width: 900px; max-height: 90vh; background: #fff; border: 1px solid #dcdfe6; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
    .ktr-viz-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f5f7fa; border-bottom: 1px solid #ebeef5; border-radius: 8px 8px 0 0; }
    .ktr-viz-header h3 { margin: 0; font-size: 16px; color: #303133; }
    .ktr-viz-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #909399; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .ktr-viz-close:hover { color: #606266; }
    .ktr-viz-content { padding: 0; overflow-y: auto; max-height: calc(90vh - 70px); }
    .ktr-viz-tabs { display: flex; background: #f5f7fa; border-bottom: 1px solid #dcdfe6; padding: 0 16px; gap: 8px; overflow-x: auto; }
    .ktr-viz-tab { background: transparent; border: none; padding: 12px 16px; cursor: pointer; border-radius: 6px 6px 0 0; display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; transition: all 0.3s; }
    .ktr-viz-tab:hover { background: rgba(64,158,255,0.1); }
    .ktr-viz-tab.active { background: #fff; box-shadow: 0 -2px 4px rgba(0,0,0,0.05); }
    .tab-batch { font-weight: 500; color: #303133; }
    .tab-status { font-size: 11px; padding: 2px 6px; border-radius: 3px; color: #fff; }
    .tab-status.success { background: #67c23a; }
    .tab-status.error { background: #f56c6c; }
    .tab-status.running { background: #409eff; }
    .tab-status.warning { background: #e6a23c; }
    .tab-status.stopped { background: #909399; }
    .tab-status.pending { background: #909399; }
    .tab-errors { font-size: 11px; color: #f56c6c; font-weight: 500; }
    .ktr-viz-timeline { padding: 20px; }
    .timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #ebeef5; }
    .timeline-summary { display: flex; gap: 16px; font-size: 12px; color: #606266; }
    .summary-item.success { color: #67c23a; font-weight: 500; }
    .summary-item.error { color: #f56c6c; font-weight: 500; }
    .summary-item.running { color: #409eff; font-weight: 500; }
    .timeline-item { display: flex; margin-bottom: 20px; position: relative; }
    .timeline-marker { flex-shrink: 0; width: 60px; text-align: center; position: relative; }
    .marker-number { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; color: #fff; margin: 0 auto 4px; }
    .timeline-marker.success .marker-number { background: #67c23a; }
    .timeline-marker.error .marker-number { background: #f56c6c; }
    .timeline-marker.running .marker-number { background: #409eff; }
    .timeline-marker.warning .marker-number { background: #e6a23c; }
    .timeline-marker.pending .marker-number { background: #909399; }
    .timeline-marker.not_executed .marker-number { background: #c0c4cc; }
    .timeline-marker.stopped .marker-number { background: #909399; }
    .marker-status { font-size: 10px; color: #909399; }
    .timeline-content-block { flex: 1; margin-left: 16px; padding: 16px; background: #fafbfc; border-radius: 6px; border: 1px solid #ebeef5; position: relative; }
    .timeline-content-block::before { content: ''; position: absolute; left: -8px; top: 16px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 8px solid #ebeef5; }
    .timeline-content-block.error-highlight { border-left: 3px solid #f56c6c; background: #fef0f0; }
    .step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
    .step-name { font-weight: 500; color: #303133; font-size: 13px; }
    .step-duration, .step-speed { font-size: 12px; color: #606266; background: #fff; padding: 2px 6px; border-radius: 3px; }
    .step-progress { margin-bottom: 8px; }
    .progress-bar { height: 6px; border-radius: 3px; margin-bottom: 4px; transition: width 0.3s; }
    .progress-bar.success { background: #67c23a; }
    .progress-bar.error { background: #f56c6c; }
    .progress-bar.running { background: #409eff; }
    .progress-bar.warning { background: #e6a23c; }
    .progress-bar.pending { background: #909399; }
    .progress-bar.not_executed { background: #c0c4cc; }
    .progress-bar.stopped { background: #909399; }
    .progress-text { font-size: 11px; color: #909399; }
    .step-info, .step-comment { font-size: 11px; color: #606266; margin-top: 4px; font-family: 'SF Mono', Monaco, Consolas, monospace; }
    .step-comment { color: #e6a23c; }
    .step-error { font-size: 11px; color: #f56c6c; margin-top: 4px; font-weight: 500; }
    .timeline-connector { position: absolute; left: 30px; top: 60px; width: 2px; height: 20px; background: #dcdfe6; }
    .ktr-viz-metrics, .ktr-viz-batch-info { padding: 20px; border-top: 1px solid #ebeef5; background: #fafcff; }
    .ktr-viz-metrics h4, .ktr-viz-batch-info h4 { margin: 0 0 16px 0; font-size: 15px; color: #303133; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .metric-item { display: flex; flex-direction: column; padding: 12px; background: #fff; border-radius: 4px; border: 1px solid #ebeef5; }
    .metric-item.success { border-left: 3px solid #67c23a; }
    .metric-item.error { border-left: 3px solid #f56c6c; }
    .metric-item.running { border-left: 3px solid #409eff; }
    .metric-item.slow { border-left: 3px solid #e6a23c; }
    .metric-label { font-size: 11px; color: #909399; margin-bottom: 4px; }
    .metric-value { font-size: 13px; font-weight: 500; color: #303133; }
    .ktr-viz-batch-info .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .batch-section { background: #fff; border-radius: 6px; padding: 16px; border: 1px solid #ebeef5; }
    .batch-section h5 { margin: 0 0 12px 0; font-size: 13px; color: #606266; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .batch-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f5f7fa; }
    .batch-item:last-child { border-bottom: none; }
    .batch-label { font-size: 12px; color: #909399; flex-shrink: 0; margin-right: 8px; }
    .batch-value { font-size: 12px; color: #303133; font-weight: 500; text-align: right; word-break: break-all; }
    .ktr-viz-no-data { text-align: center; color: #909399; padding: 40px 20px; font-size: 14px; }
    .ktr-viz-error { text-align: center; padding: 40px 20px; background: #fef0f0; border-radius: 6px; border: 1px solid #f56c6c; margin: 20px; }
    .ktr-viz-error .error-title { font-size: 16px; font-weight: 500; color: #f56c6c; margin-bottom: 8px; }
    .ktr-viz-error .error-message { font-size: 14px; color: #606266; }
    .loading-state { text-align: center; padding: 40px 20px; color: #909399; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .loading-state::before { content: ''; width: 16px; height: 16px; border: 2px solid #dcdfe6; border-top-color: #409eff; border-radius: 50%; animation: ktr-spin 1s linear infinite; }
    @keyframes ktr-spin { to { transform: rotate(360deg); } }
  `;

  const styleElement = document.createElement('style');
  styleElement.id = STYLES_ID;
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

function detachOutsideListener() {
  if (outsideClickHandler) {
    document.removeEventListener('mousedown', outsideClickHandler, true);
    outsideClickHandler = null;
  }
}

function attachOutsideListener(panel: HTMLElement) {
  detachOutsideListener();
  outsideClickHandler = (event: MouseEvent) => {
    if (!panel.contains(event.target as Node)) {
      closePanel();
    }
  };
  document.addEventListener('mousedown', outsideClickHandler, true);
}

function formatHtml(text: unknown): string {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function renderTabs(panel: HTMLElement, data: NormalizedKtrData, activeIndex: number) {
  const container = panel.querySelector(`#${TAB_CONTAINER_ID}`);
  if (!container) {
    return;
  }

  if (data.runs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = data.runs
    .map((run, index) => {
      const isActive = index === activeIndex;
      const statusClass = run.overallStatus;
      const label = run.batchId ? `批次: ${formatHtml(run.batchId)}` : `运行 ${index + 1}`;
      const errorBadge = run.errors > 0 ? `<span class="tab-errors">${run.errors} 错误</span>` : '';
      return `
        <button class="ktr-viz-tab ${isActive ? 'active' : ''}" data-run-index="${index}">
          <span class="tab-batch">${label}</span>
          <span class="tab-status ${statusClass}">${statusToLabel(run.overallStatus)}</span>
          ${errorBadge}
        </button>
      `;
    })
    .join('');
}

function renderRunContent(panel: HTMLElement, data: NormalizedKtrData, runIndex: number) {
  const container = panel.querySelector(`#${RUN_CONTENT_ID}`);
  if (!container) {
    return;
  }

  const run = data.runs[runIndex];
  if (!run) {
    container.innerHTML = `
      <div class="ktr-viz-error">
        <div class="error-title">数据错误</div>
        <div class="error-message">未找到运行记录</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading-state">正在加载数据...</div>';

  requestAnimationFrame(() => {
    container.innerHTML = [
      generateTimeline(run),
      generateBatchInfo(run),
      generateMetrics(run)
    ]
      .filter(Boolean)
      .join('');
  });
}

function generateTimeline(run: NormalizedRun): string {
  if (!run.steps || run.steps.length === 0) {
    return `
      <div class="ktr-viz-error">
        <div class="error-title">暂无步骤数据</div>
        <div class="error-message">该运行记录中没有找到步骤执行信息</div>
      </div>
    `;
  }

  const maxRealDuration = Math.max(...run.steps.map((step) => step.realDuration), 1);

  const items = run.steps
    .map((step, index) => {
      const widthPercent = Math.max(5, Math.floor((step.realDuration / maxRealDuration) * 100));
      const isLast = index === run.steps.length - 1;
      const markerClass = step.status;
      const durationLabel = `${step.realDuration}ms`;
      const cumulativeLabel = `${step.cumulativeTime}ms`;
      const comment = step.comment ? `<div class="step-comment">${formatHtml(step.comment)}</div>` : '';
      const info = step.stepInfo ? `<div class="step-info">${formatHtml(step.stepInfo)}</div>` : '';
      const error = step.errorCount > 0 ? `<div class="step-error">⚠️ 错误数: ${step.errorCount}</div>` : '';
      const speed = step.speed != null ? `${step.speed}/s` : 'N/A';
      return `
        <div class="timeline-item">
          <div class="timeline-marker ${markerClass}">
            <div class="marker-number">${index + 1}</div>
            <div class="marker-status">${statusToLabel(step.status)}</div>
          </div>
          <div class="timeline-content-block ${step.isError ? 'error-highlight' : ''}">
            <div class="step-header">
              <span class="step-name">${formatHtml(step.name)}</span>
              <span class="step-duration">${durationLabel}</span>
              <span class="step-speed">${speed}</span>
            </div>
            <div class="step-progress">
              <div class="progress-bar ${markerClass}" style="width: ${widthPercent}%"></div>
              <span class="progress-text">累计: ${cumulativeLabel}</span>
            </div>
            ${info}
            ${comment}
            ${error}
          </div>
          ${!isLast ? '<div class="timeline-connector"></div>' : ''}
        </div>
      `;
    })
    .join('');

  const summaryItems = [
    `<span class="summary-item">开始: ${formatHtml(run.startAt ?? 'N/A')}</span>`,
    `<span class="summary-item">总耗时: ${run.takeTime ?? 0}ms</span>`,
    `<span class="summary-item ${run.overallStatus}">状态: ${statusToLabel(run.overallStatus)}</span>`
  ].join('');

  return `
    <div class="ktr-viz-timeline">
      <div class="timeline-header">
        <h4>执行时间线</h4>
        <div class="timeline-summary">${summaryItems}</div>
      </div>
      <div class="timeline-content">${items}</div>
    </div>
  `;
}

function generateBatchInfo(run: NormalizedRun): string {
  const events = run.events;
  if (!events) {
    return '';
  }

  const safe = (key: string) => formatHtml((events as Record<string, unknown>)[key]);
  const counter = (events as Record<string, Record<string, unknown>>).counter ?? {};
  const pull = (events as Record<string, Record<string, unknown>>).pull ?? {};
  const push = (events as Record<string, Record<string, unknown>>).push ?? {};
  const fetchInfo = (events as Record<string, Record<string, unknown>>).fetch ?? {};
  const trans = (events as Record<string, Record<string, unknown>>).trans ?? {};

  return `
    <div class="ktr-viz-batch-info">
      <h4>批次信息</h4>
      <div class="batch-grid">
        <div class="batch-section">
          <h5>数据源</h5>
          <div class="batch-item"><span class="batch-label">Topic:</span><span class="batch-value">${safe('topic') || 'N/A'}</span></div>
          <div class="batch-item"><span class="batch-label">指标:</span><span class="batch-value">${formatHtml(run.metrics ?? 'N/A')}</span></div>
        </div>
        <div class="batch-section">
          <h5>数据获取</h5>
          <div class="batch-item"><span class="batch-label">获取时间:</span><span class="batch-value">${formatHtml(pull.reqTime ?? 'N/A')}</span></div>
          <div class="batch-item"><span class="batch-label">获取耗时:</span><span class="batch-value">${pull.takeTime ?? 0}ms</span></div>
          <div class="batch-item"><span class="batch-label">数据条数:</span><span class="batch-value">${fetchInfo.count ?? 0}</span></div>
          <div class="batch-item"><span class="batch-label">主键范围:</span><span class="batch-value">${formatHtml(fetchInfo.range ?? 'N/A')}</span></div>
          <div class="batch-item"><span class="batch-label">更新时间:</span><span class="batch-value">${formatHtml(fetchInfo.opTime ?? 'N/A')}</span></div>
        </div>
        <div class="batch-section">
          <h5>数据处理</h5>
          <div class="batch-item"><span class="batch-label">推送时间:</span><span class="batch-value">${formatHtml(push.reqTime ?? 'N/A')}</span></div>
          <div class="batch-item"><span class="batch-label">推送耗时:</span><span class="batch-value">${push.takeTime ?? 0}ms</span></div>
        </div>
        <div class="batch-section">
          <h5>变更统计</h5>
          <div class="batch-item"><span class="batch-label">总记录数:</span><span class="batch-value">${counter.size ?? 0}</span></div>
          <div class="batch-item"><span class="batch-label">去重记录:</span><span class="batch-value">${counter.key ?? 0}</span></div>
          <div class="batch-item"><span class="batch-label">操作统计:</span><span class="batch-value">${formatHtml(counter.op ?? 'N/A')}</span></div>
          <div class="batch-item"><span class="batch-label">转换统计:</span><span class="batch-value">${formatHtml(trans.nr ?? 'N/A')}</span></div>
        </div>
      </div>
    </div>
  `;
}

function generateMetrics(run: NormalizedRun): string {
  const totalSteps = run.steps.length;
  const successSteps = run.steps.filter((step) => step.status === 'success').length;
  const errorSteps = run.steps.filter((step) => step.status === 'error').length;
  const runningSteps = run.steps.filter((step) => step.status === 'running').length;
  const slowest = run.steps.reduce<NormalizedStep | null>((prev, current) => {
    if (!prev || current.realDuration > prev.realDuration) {
      return current;
    }
    return prev;
  }, null);

  return `
    <div class="ktr-viz-metrics">
      <h4>运行指标</h4>
      <div class="metrics-grid">
        <div class="metric-item"><span class="metric-label">总步骤</span><span class="metric-value">${totalSteps}</span></div>
        <div class="metric-item success"><span class="metric-label">成功</span><span class="metric-value">${successSteps}</span></div>
        <div class="metric-item error"><span class="metric-label">失败</span><span class="metric-value">${errorSteps}</span></div>
        <div class="metric-item running"><span class="metric-label">运行中</span><span class="metric-value">${runningSteps}</span></div>
        <div class="metric-item slow"><span class="metric-label">最慢步骤</span><span class="metric-value">${slowest ? `${formatHtml(slowest.name)} (${slowest.realDuration}ms)` : 'N/A'}</span></div>
        <div class="metric-item"><span class="metric-label">总耗时</span><span class="metric-value">${run.takeTime ?? 0}ms</span></div>
      </div>
    </div>
  `;
}

export function closePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel?.parentNode) {
    panel.parentNode.removeChild(panel);
  }
  currentData = null;
  detachOutsideListener();
}

export function showPanel(data: NormalizedKtrData) {
  ensureStyles();
  closePanel();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'ktr-viz-panel';

  panel.innerHTML = `
    <div class="ktr-viz-header">
      <h3>KTR作业运行监控</h3>
      <button class="ktr-viz-close" type="button">×</button>
    </div>
    <div class="ktr-viz-content">
      <div id="${TAB_CONTAINER_ID}" class="ktr-viz-tabs"></div>
      <div id="${RUN_CONTENT_ID}"></div>
    </div>
  `;

  panel.querySelector('.ktr-viz-close')?.addEventListener('click', () => closePanel());

  panel.querySelector(`#${TAB_CONTAINER_ID}`)?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button[data-run-index]') as HTMLButtonElement | null;
    if (!button) {
      return;
    }
    const index = Number.parseInt(button.dataset.runIndex ?? '0', 10);
    if (Number.isInteger(index) && currentData) {
      renderTabs(panel, currentData, index);
      renderRunContent(panel, currentData, index);
    }
  });

  document.body.appendChild(panel);
  currentData = data;
  renderTabs(panel, data, 0);
  renderRunContent(panel, data, 0);
  attachOutsideListener(panel);
}
