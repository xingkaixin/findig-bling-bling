import { extractKtrFromDrawer } from '@shared/ktr/extractors';
import { statusToLabel } from '@shared/ktr/status';
import type { NormalizedKtrData, NormalizedRun } from '@shared/ktr/types';

const BUTTON_ID = 'ktr-visualize-btn';
const CONTAINER_ID = 'ktr-flow-visualization';
const STYLE_ID = 'ktr-working-styles';
const DRAWER_CLASS = 'el-drawer';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const styles = `
    #${BUTTON_ID} { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-left: 12px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); }
    #${BUTTON_ID}:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    #${BUTTON_ID}.visualizing { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3); }
    #${CONTAINER_ID} { margin: 20px 0; padding: 24px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15); backdrop-filter: blur(4px); }
    #${CONTAINER_ID} .ktr-flow-title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 20px; text-align: center; }
    #${CONTAINER_ID} .ktr-overview { background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(226, 232, 240, 0.5); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    #${CONTAINER_ID} .ktr-overview-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #2d3748; }
    #${CONTAINER_ID} .ktr-overview-item + .ktr-overview-item { border-top: 1px solid #e2e8f0; }
    #${CONTAINER_ID} .ktr-overview-label { color: #4a5568; }
    #${CONTAINER_ID} .ktr-overview-value.success { color: #38a169; }
    #${CONTAINER_ID} .ktr-overview-value.error { color: #e53e3e; }
    #${CONTAINER_ID} .ktr-overview-value.running { color: #3182ce; }
    #${CONTAINER_ID} .ktr-flow-step { display: flex; align-items: center; padding: 16px 20px; margin: 12px 0; background: #fff; border-radius: 10px; border-left: 5px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); transition: all 0.3s ease; }
    #${CONTAINER_ID} .ktr-flow-step.success { border-left-color: #48bb78; background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%); }
    #${CONTAINER_ID} .ktr-flow-step.error { border-left-color: #f56565; background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%); }
    #${CONTAINER_ID} .ktr-flow-step.running { border-left-color: #4299e1; background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%); }
    #${CONTAINER_ID} .ktr-step-icon { font-size: 24px; margin-right: 15px; width: 32px; text-align: center; }
    #${CONTAINER_ID} .ktr-step-content { flex: 1; }
    #${CONTAINER_ID} .ktr-step-name { font-size: 14px; font-weight: 600; color: #2d3748; margin-bottom: 4px; }
    #${CONTAINER_ID} .ktr-step-status { display: inline-block; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase; }
    #${CONTAINER_ID} .ktr-step-status.success { background: #c6f6d5; color: #22543d; }
    #${CONTAINER_ID} .ktr-step-status.error { background: #fed7d7; color: #742a2a; }
    #${CONTAINER_ID} .ktr-step-status.running { background: #bee3f8; color: #2a4365; }
    #${CONTAINER_ID} .ktr-step-duration { font-size: 12px; color: #48bb78; margin-top: 6px; font-weight: 500; }
    #${CONTAINER_ID} .ktr-step-comment { font-size: 11px; color: #ed8936; margin-top: 4px; font-style: italic; }
    #${CONTAINER_ID} .ktr-flow-arrow { text-align: center; color: #a0aec0; font-size: 20px; margin: 8px 0; }
    #${CONTAINER_ID} .ktr-empty { text-align: center; color: #718096; padding: 20px; }
  `;

  const styleElement = document.createElement('style');
  styleElement.id = STYLE_ID;
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

function getStepIcon(type: string): string {
  const icons: Record<string, string> = {
    LookupValueStep: '🔍',
    FilterRows: '🔎',
    RedoDatabaseJoin: '🔗',
    SelectValues: '✏️',
    Calculator: '🧮',
    RedoUpdate: '💾',
    RedisWriterStep: '📮',
    JsonOutput: '📄',
    OpEventInput: '📋',
    RedoTableInput: '📊',
    RedisLookupStep: '🗝️',
    ScriptValueMod: '📝',
    SwitchCase: '🔄',
    Dummy: '🎯'
  };
  return icons[type] ?? '⚙️';
}

function renderOverview(run: NormalizedRun): string {
  const statusClass = `ktr-overview-value ${run.overallStatus}`;
  return `
    <div class="ktr-overview">
      <div class="ktr-overview-item"><span class="ktr-overview-label">批次</span><span class="ktr-overview-value">${run.batchId ?? 'N/A'}</span></div>
      <div class="ktr-overview-item"><span class="ktr-overview-label">开始时间</span><span class="ktr-overview-value">${run.startAt ?? 'N/A'}</span></div>
      <div class="ktr-overview-item"><span class="ktr-overview-label">状态</span><span class="${statusClass}">${statusToLabel(run.overallStatus)}</span></div>
      <div class="ktr-overview-item"><span class="ktr-overview-label">耗时</span><span class="ktr-overview-value">${run.takeTime ?? 0}ms</span></div>
      <div class="ktr-overview-item"><span class="ktr-overview-label">错误数</span><span class="ktr-overview-value">${run.errors ?? 0}</span></div>
      <div class="ktr-overview-item"><span class="ktr-overview-label">性能指标</span><span class="ktr-overview-value">${run.metrics ?? 'N/A'}</span></div>
    </div>
  `;
}

function renderSteps(run: NormalizedRun): string {
  if (!run.steps.length) {
    return `<div class="ktr-empty">未检测到步骤执行信息</div>`;
  }

  return run.steps
    .map((step, index) => {
      const duration = step.realDuration || step.duration || 0;
      const comment = step.comment ? `<div class="ktr-step-comment">💬 ${step.comment}</div>` : '';
      const durationLabel = duration > 0 ? `<div class="ktr-step-duration">⏱️ ${duration}ms</div>` : '';
      return `
        <div class="ktr-flow-step ${step.status}">
          <div class="ktr-step-icon">${getStepIcon(step.type)}</div>
          <div class="ktr-step-content">
            <div class="ktr-step-name">${step.name}</div>
            <div class="ktr-step-status ${step.status}">${statusToLabel(step.status)}</div>
            ${durationLabel}
            ${comment}
          </div>
        </div>
        ${index < run.steps.length - 1 ? '<div class="ktr-flow-arrow">↓</div>' : ''}
      `;
    })
    .join('');
}

function buildVisualization(data: NormalizedKtrData): string {
  const run = data.runs[0];
  if (!run) {
    return `<div class="ktr-empty">无法解析KTR运行数据</div>`;
  }

  return `
    <div class="ktr-flow-title">🔄 数据处理链路</div>
    ${renderOverview(run)}
    ${renderSteps(run)}
  `;
}

function showVisualization(drawer: Element, data: NormalizedKtrData) {
  hideVisualization(drawer);
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = buildVisualization(data);

  const body = drawer.querySelector('.el-drawer__body') || drawer.querySelector('section') || drawer;
  body.appendChild(container);
}

function hideVisualization(drawer: Element) {
  const existing = drawer.querySelector(`#${CONTAINER_ID}`);
  if (existing) {
    existing.remove();
  }
}

function toggleVisualization(drawer: Element, button: HTMLButtonElement) {
  const active = button.classList.toggle('visualizing');
  button.textContent = active ? '🔄 隐藏图形' : '📊 图形展示';

  if (!active) {
    hideVisualization(drawer);
    return;
  }

  const result = extractKtrFromDrawer(drawer);
  if (!result) {
    button.classList.remove('visualizing');
    button.textContent = '📊 图形展示';
    console.warn('未能提取KTR数据');
    return;
  }

  showVisualization(drawer, result.parsed);
}

function createButton(drawer: Element, target: Element) {
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = '📊 图形展示';

  button.addEventListener('click', () => toggleVisualization(drawer, button));
  target.appendChild(button);
}

function attachButton(drawer: Element) {
  if (drawer.querySelector(`#${BUTTON_ID}`)) {
    return;
  }

  const header =
    drawer.querySelector('.el-drawer__header') ||
    drawer.querySelector('.el-drawer__title') ||
    drawer.querySelector('[class*="header"]');

  if (header) {
    createButton(drawer, header);
    return;
  }

  const fallback = drawer as HTMLElement;
  if (fallback.style.position === '' || fallback.style.position === 'static') {
    fallback.style.position = 'relative';
  }

  const floating = document.createElement('button');
  floating.id = BUTTON_ID;
  floating.type = 'button';
  floating.textContent = '📊 展示';
  floating.style.cssText = 'position:absolute;top:15px;right:15px;z-index:1000;';
  floating.addEventListener('click', () => toggleVisualization(drawer, floating));
  drawer.appendChild(floating);
}

function monitorDrawer() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.classList.contains(DRAWER_CLASS)) {
            setTimeout(() => {
              injectStyles();
              attachButton(element);
            }, 800);
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function init() {
  injectStyles();
  monitorDrawer();
}

init();
