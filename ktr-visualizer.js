// KTR数据处理链路可视化器
// 解析ext_data并生成流程图展示

(function() {
  'use strict';

  console.log('KTR可视化器已加载');

  // 解析KTR JSON数据
  function parseKTRData(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      // 检查是否为直接KTR数据结构（包含steps和rs）
      if (data.steps && data.rs) {
        return normalizeKTRData(data);
      }

      // 检查是否为API响应格式（包含result数组）
      if (data.result && data.result[0]) {
        const result = data.result[0];
        const extData = typeof result.ext_data === 'string' ? JSON.parse(result.ext_data) : result.ext_data;

        return normalizeKTRData({steps: extData.steps, rs: extData.rs, ...extData});
      }

      console.log('KTR数据格式不正确，无法识别格式');
      return null;
    } catch (error) {
      console.log('KTR数据解析失败:', error);
      return null;
    }
  }

  // 统一数据结构，消除steps和statuses的分离
  function normalizeKTRData(data) {
    const runs = data.rs.map((run, runIndex) => {
      const steps = [];

      // 过滤虚拟步骤并合并执行状态
      if (data.steps && data.steps.length > 0) {
        const virtualSteps = ['eventFlow', 'Dummy']; // 虚拟步骤列表
        const realSteps = data.steps.filter(step =>
          !virtualSteps.some(virtual => step.name.includes(virtual))
        );

        realSteps.forEach((stepDef, stepIndex) => {
          const status = run.statuses?.find(s => s.step && s.step.includes(stepDef.name));

          // 解析错误数量：从 nr 字符串中提取 E=数字
          let errorCount = 0;
          if (status?.nr) {
            const errorMatch = status.nr.match(/E=(\d+)/);
            errorCount = errorMatch ? parseInt(errorMatch[1]) : 0;
          }

          // 状态基于错误数判断，没有status则为未执行
          let stepStatus = 'not_executed'; // 未执行状态
          if (status) {
            if (errorCount > 0) stepStatus = 'error';
            else if (status.exit === 2) stepStatus = 'running';
            else stepStatus = 'success';
          }

          steps.push({
            id: stepIndex,
            name: stepDef.name,
            type: stepDef.type,
            status: stepStatus,
            duration: status?.duration || 0, // 累计时间
            speed: status?.speed || 0,
            startTime: run.startAt,
            batchId: run.batch,
            runIndex: runIndex,
            stepInfo: status?.nr || '',
            comment: status?.comment || '',
            isError: errorCount > 0,
            isRunning: status?.exit === 2,
            errorCount: errorCount,
            hasExecutionData: !!status // 是否有执行数据
          });
        });

        // 按累计时间排序，duration越大越在后面
        steps.sort((a, b) => (a.duration || 0) - (b.duration || 0));
      }

      return {
        batchId: run.batch,
        startAt: run.startAt,
        finish: run.finish,
        stop: run.stop,
        errors: run.errors,
        takeTime: run.takeTime,
        slowStep: run.slowStep,
        metrics: run.metrics,
        steps: steps,
        events: run.events,
        overallStatus: getRunOverallStatus(run)
      };
    });

    return {
      runs: runs,
      totalRuns: data.times || 1,
      pullTime: data.pull?.takeTime || 0,
      pushTime: data.push?.takeTime || 0,
      raw: data
    };
  }

  // 获取运行整体状态
  function getRunOverallStatus(run) {
    if (run.errors > 0) return 'error';
    if (run.finish && !run.stop) return 'success';
    if (run.stop) return 'stopped';
    return 'running';
  }

  
  // 创建可视化面板
  function createVisualizationPanel(ktrData) {
    if (!ktrData) return;

    console.log('创建KTR可视化面板');

    // 移除已存在的面板
    const existingPanel = document.getElementById('ktr-visualization-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // 创建面板容器
    const panel = document.createElement('div');
    panel.id = 'ktr-visualization-panel';
    panel.className = 'ktr-viz-panel';

    // 设置面板内容
    panel.innerHTML = `
      <div class="ktr-viz-header">
        <h3>KTR作业运行监控</h3>
        <button class="ktr-viz-close" onclick="this.closest('#ktr-visualization-panel').remove()">×</button>
      </div>
      <div class="ktr-viz-content">
        ${generateRunTabs(ktrData)}
        <div id="ktr-run-content"></div>
      </div>
    `;

    // 添加样式
    addVisualizationStyles();

    return panel;
  }

  // 生成运行标签页
  function generateRunTabs(ktrData) {
    if (!ktrData.runs || ktrData.runs.length === 0) {
      return '<div class="ktr-viz-no-data">暂无运行数据</div>';
    }

    let tabsHtml = '<div class="ktr-viz-tabs">';

    ktrData.runs.forEach((run, index) => {
      const isActive = index === 0 ? 'active' : '';
      const statusClass = run.overallStatus;
      const batchLabel = run.batchId ? `批次: ${run.batchId}` : `运行 ${index + 1}`;

      tabsHtml += `
        <button class="ktr-viz-tab ${isActive} ${statusClass}"
                onclick="switchRun(${index})"
                data-run-index="${index}">
          <span class="tab-batch">${batchLabel}</span>
          <span class="tab-status ${statusClass}">${getStatusText(run.overallStatus)}</span>
          ${run.errors > 0 ? `<span class="tab-errors">${run.errors}错误</span>` : ''}
        </button>
      `;
    });

    tabsHtml += '</div>';
    return tabsHtml;
  }

  // 切换运行显示（性能优化版本）
  window.switchRun = function(runIndex) {
    // 性能优化：防抖处理
    if (window.switchRunTimeout) {
      clearTimeout(window.switchRunTimeout);
    }

    window.switchRunTimeout = setTimeout(() => {
      try {
        // 更新标签状态
        document.querySelectorAll('.ktr-viz-tab').forEach(tab => {
          tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-run-index="${runIndex}"]`);
        if (activeTab) {
          activeTab.classList.add('active');
        }

        // 更新内容区域
        const contentDiv = document.getElementById('ktr-run-content');
        if (!contentDiv) {
          console.error('找不到内容容器');
          return;
        }

        const run = window.currentKTRData?.runs?.[runIndex];
        if (!run) {
          contentDiv.innerHTML = generateErrorView('数据错误', `找不到运行记录 ${runIndex + 1}`);
          return;
        }

        // 性能优化：显示加载状态
        contentDiv.innerHTML = '<div class="loading-state">正在加载数据...</div>';

        // 使用requestAnimationFrame优化渲染性能
        requestAnimationFrame(() => {
          try {
            contentDiv.innerHTML = generateTimelineView(run);
          } catch (error) {
            console.error('渲染时间线时出错:', error);
            contentDiv.innerHTML = generateErrorView('渲染错误', '渲染时间线时发生错误');
          }
        });
      } catch (error) {
        console.error('切换运行时出错:', error);
      }
    }, 50); // 50ms防抖
  };

  // 生成时间线视图
  function generateTimelineView(run) {
    if (!run.steps || run.steps.length === 0) {
      return generateErrorView('暂无步骤数据', '该运行记录中没有找到步骤执行信息');
    }

    try {
      let timelineHtml = `
        <div class="ktr-viz-timeline">
          <div class="timeline-header">
            <h4>执行时间线</h4>
            <div class="timeline-summary">
              <span class="summary-item">开始: ${escapeHtml(run.startAt || 'N/A')}</span>
              <span class="summary-item">总耗时: ${run.takeTime || 0}ms</span>
              <span class="summary-item ${run.overallStatus}">状态: ${getStatusText(run.overallStatus)}</span>
            </div>
          </div>
          <div class="timeline-content">
      `;

      const validSteps = run.steps.filter(step => step && typeof step === 'object');

      // 性能优化：大量数据时虚拟化处理
      if (validSteps.length > 50) {
        timelineHtml += `
          <div class="performance-warning">
            ⚠️ 检测到大量步骤数据 (${validSteps.length} 个)，显示前50个步骤以优化性能
          </div>
        `;
      }

      const displaySteps = validSteps.length > 50 ? validSteps.slice(0, 50) : validSteps;

      // 计算真实耗时：当前步骤累计时间 - 前一步骤累计时间
      const stepsWithRealDuration = displaySteps.map((step, index) => {
        const currentCumulative = step.duration || 0;
        const prevCumulative = index > 0 ? (displaySteps[index - 1].duration || 0) : 0;
        const realDuration = currentCumulative - prevCumulative;

        return {
          ...step,
          realDuration: Math.max(0, realDuration), // 确保不为负数
          cumulativeTime: currentCumulative
        };
      });

      const maxDuration = Math.max(...stepsWithRealDuration.map(s => s.realDuration), 1);

      let stepsHtml = '';

      stepsWithRealDuration.forEach((step, index) => {
        try {
          const isLast = index === stepsWithRealDuration.length - 1;
          const realDuration = step.realDuration;
          const widthPercent = maxDuration > 0 ? (realDuration / maxDuration * 100) : 0;

          const stepName = escapeHtml(step.name || `步骤 ${index + 1}`);
          const stepSpeed = step.speed || 0;
          const stepInfo = escapeHtml(step.stepInfo || '');
          const stepComment = escapeHtml(step.comment || '');

          stepsHtml += `
            <div class="timeline-item">
              <div class="timeline-marker ${step.status}">
                <div class="marker-number">${index + 1}</div>
                <div class="marker-status">${getStatusText(step.status)}</div>
              </div>
              <div class="timeline-content-block ${step.isError ? 'error-highlight' : ''}">
                <div class="step-header">
                  <span class="step-name">${stepName}</span>
                  <span class="step-duration">${realDuration}ms</span>
                  <span class="step-speed">${stepSpeed}/s</span>
                </div>
                <div class="step-progress">
                  <div class="progress-bar ${step.status}" style="width: ${widthPercent}%"></div>
                  <span class="progress-text">累计: ${step.cumulativeTime}ms</span>
                </div>
                ${stepInfo ? `<div class="step-info">${stepInfo}</div>` : ''}
                ${stepComment ? `<div class="step-comment">${stepComment}</div>` : ''}
                ${step.errorCount > 0 ? `<div class="step-error">⚠️ 错误数: ${step.errorCount}</div>` : ''}
              </div>
              ${!isLast ? '<div class="timeline-connector"></div>' : ''}
            </div>
          `;
        } catch (stepError) {
          console.warn(`渲染步骤 ${index} 时出错:`, stepError);
          stepsHtml += `
            <div class="timeline-item">
              <div class="timeline-marker error">
                <div class="marker-number">${index + 1}</div>
                <div class="marker-status">错误</div>
              </div>
              <div class="timeline-content-block error-highlight">
                <div class="step-header">
                  <span class="step-name">步骤渲染错误</span>
                </div>
                <div class="step-error">无法显示此步骤的信息</div>
              </div>
            </div>
          `;
        }
      });

      timelineHtml += stepsHtml;

      timelineHtml += `
          </div>
        </div>
        ${generateBatchInfo(run)}
        ${generateStepMetrics(run)}
      `;

      return timelineHtml;
    } catch (error) {
      console.error('生成时间线视图时出错:', error);
      return generateErrorView('渲染错误', '生成时间线视图时发生错误，请检查数据格式');
    }
  }

  // 生成错误视图
  function generateErrorView(title, message) {
    return `
      <div class="ktr-viz-error">
        <div class="error-icon">⚠️</div>
        <div class="error-title">${escapeHtml(title)}</div>
        <div class="error-message">${escapeHtml(message)}</div>
        <div class="error-actions">
          <button onclick="console.log('尝试重新解析数据')" class="error-btn">重试</button>
          <button onclick="console.log('显示原始数据')" class="error-btn">查看原始数据</button>
        </div>
      </div>
    `;
  }

  // HTML转义函数
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 生成批次信息
  function generateBatchInfo(run) {
    if (!run.events) {
      return '';
    }

    const events = run.events;
    const metrics = run.metrics || '';

    return `
      <div class="ktr-viz-batch-info">
        <h4>批次信息</h4>
        <div class="batch-grid">
          <div class="batch-section">
            <h5>数据源</h5>
            <div class="batch-item">
              <span class="batch-label">Topic:</span>
              <span class="batch-value">${escapeHtml(events.topic || 'N/A')}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">指标:</span>
              <span class="batch-value metrics-text">${escapeHtml(metrics)}</span>
            </div>
          </div>

          <div class="batch-section">
            <h5>数据获取</h5>
            <div class="batch-item">
              <span class="batch-label">获取时间:</span>
              <span class="batch-value">${events.pull?.reqTime || 'N/A'}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">获取耗时:</span>
              <span class="batch-value">${events.pull?.takeTime || 0}ms</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">数据条数:</span>
              <span class="batch-value">${events.fetch?.count || 0}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">主键范围:</span>
              <span class="batch-value">${escapeHtml(events.fetch?.range || 'N/A')}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">更新时间:</span>
              <span class="batch-value">${escapeHtml(events.fetch?.opTime || 'N/A')}</span>
            </div>
          </div>

          <div class="batch-section">
            <h5>数据处理</h5>
            <div class="batch-item">
              <span class="batch-label">推送时间:</span>
              <span class="batch-value">${events.push?.reqTime || 'N/A'}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">推送耗时:</span>
              <span class="batch-value">${events.push?.takeTime || 0}ms</span>
            </div>
          </div>

          <div class="batch-section">
            <h5>变更统计</h5>
            <div class="batch-item">
              <span class="batch-label">总记录数:</span>
              <span class="batch-value">${events.counter?.size || 0}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">去重记录:</span>
              <span class="batch-value">${events.counter?.key || 0}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">操作统计:</span>
              <span class="batch-value">${escapeHtml(events.counter?.op || 'N/A')}</span>
            </div>
            <div class="batch-item">
              <span class="batch-label">转换统计:</span>
              <span class="batch-value">${escapeHtml(events.trans?.nr || 'N/A')}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 生成步骤指标
  function generateStepMetrics(run) {
    try {
      const validSteps = run.steps?.filter(step => step && typeof step === 'object') || [];
      const totalSteps = validSteps.length;

      if (totalSteps === 0) {
        return generateErrorView('无指标数据', '无法生成运行指标，请检查步骤数据');
      }

      const successSteps = validSteps.filter(s => s.status === 'success').length;
      const errorSteps = validSteps.filter(s => s.status === 'error').length;
      const runningSteps = validSteps.filter(s => s.status === 'running').length;

      // 计算真实耗时来找最慢步骤
      const stepsWithRealDuration = validSteps.map((step, index) => {
        const currentCumulative = step.duration || 0;
        const prevCumulative = index > 0 ? (validSteps[index - 1].duration || 0) : 0;
        const realDuration = currentCumulative - prevCumulative;

        return {
          ...step,
          realDuration: Math.max(0, realDuration)
        };
      });

      const slowestStep = stepsWithRealDuration.reduce((prev, current) =>
        (current.realDuration || 0) > (prev.realDuration || 0) ? current : prev
      );

      return `
        <div class="ktr-viz-metrics">
          <h4>运行指标</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">总步骤</span>
              <span class="metric-value">${totalSteps}</span>
            </div>
            <div class="metric-item success">
              <span class="metric-label">成功</span>
              <span class="metric-value">${successSteps}</span>
            </div>
            <div class="metric-item error">
              <span class="metric-label">失败</span>
              <span class="metric-value">${errorSteps}</span>
            </div>
            <div class="metric-item running">
              <span class="metric-label">运行中</span>
              <span class="metric-value">${runningSteps}</span>
            </div>
            <div class="metric-item slow">
              <span class="metric-label">最慢步骤</span>
              <span class="metric-value">${escapeHtml(slowestStep?.name || 'N/A')} (${slowestStep?.realDuration || 0}ms)</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">总耗时</span>
              <span class="metric-value">${run.takeTime || 0}ms</span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('生成步骤指标时出错:', error);
      return generateErrorView('指标错误', '生成运行指标时发生错误');
    }
  }

  
  // 获取状态文本
  function getStatusText(status) {
    const statusMap = {
      'success': '成功',
      'error': '失败',
      'warning': '警告',
      'running': '运行中',
      'pending': '待执行',
      'stopped': '已停止',
      'not_executed': '未执行'
    };
    return statusMap[status] || status;
  }

  // 添加可视化样式
  function addVisualizationStyles() {
    if (document.getElementById('ktr-viz-styles')) {
      return; // 样式已添加
    }

    const styles = `
      <style id="ktr-viz-styles">
        .ktr-viz-panel {
          position: fixed;
          top: 50px;
          right: 20px;
          width: 900px;
          max-height: 90vh;
          background: white;
          border: 1px solid #dcdfe6;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        }

        .ktr-viz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f5f7fa;
          border-bottom: 1px solid #ebeef5;
          border-radius: 8px 8px 0 0;
        }

        .ktr-viz-header h3 {
          margin: 0;
          font-size: 16px;
          color: #303133;
        }

        .ktr-viz-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #909399;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ktr-viz-close:hover {
          color: #606266;
        }

        .ktr-viz-content {
          padding: 0;
          overflow-y: auto;
          max-height: calc(90vh - 70px);
        }

        /* 标签页样式 */
        .ktr-viz-tabs {
          display: flex;
          background: #f5f7fa;
          border-bottom: 1px solid #dcdfe6;
          padding: 0 16px;
          gap: 8px;
          overflow-x: auto;
        }

        .ktr-viz-tab {
          background: transparent;
          border: none;
          padding: 12px 16px;
          cursor: pointer;
          border-radius: 6px 6px 0 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          white-space: nowrap;
          transition: all 0.3s;
        }

        .ktr-viz-tab:hover {
          background: rgba(64, 158, 255, 0.1);
        }

        .ktr-viz-tab.active {
          background: white;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
        }

        .tab-batch {
          font-weight: 500;
          color: #303133;
        }

        .tab-status {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 3px;
          color: white;
        }

        .tab-status.success { background: #67c23a; }
        .tab-status.error { background: #f56c6c; }
        .tab-status.running { background: #409eff; }
        .tab-status.warning { background: #e6a23c; }

        .tab-errors {
          font-size: 11px;
          color: #f56c6c;
          font-weight: 500;
        }

        /* 时间线样式 */
        .ktr-viz-timeline {
          padding: 20px;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #ebeef5;
        }

        .timeline-header h4 {
          margin: 0;
          font-size: 15px;
          color: #303133;
        }

        .timeline-summary {
          display: flex;
          gap: 16px;
          font-size: 12px;
        }

        .summary-item {
          color: #606266;
        }

        .summary-item.success { color: #67c23a; font-weight: 500; }
        .summary-item.error { color: #f56c6c; font-weight: 500; }
        .summary-item.running { color: #409eff; font-weight: 500; }

        .timeline-content {
          position: relative;
        }

        .timeline-item {
          display: flex;
          margin-bottom: 20px;
          position: relative;
        }

        .timeline-item:last-child {
          margin-bottom: 0;
        }

        .timeline-marker {
          flex-shrink: 0;
          width: 60px;
          text-align: center;
          position: relative;
        }

        .marker-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          color: white;
          margin: 0 auto 4px;
        }

        .timeline-marker.success .marker-number { background: #67c23a; }
        .timeline-marker.error .marker-number { background: #f56c6c; }
        .timeline-marker.running .marker-number { background: #409eff; }
        .timeline-marker.warning .marker-number { background: #e6a23c; }
        .timeline-marker.pending .marker-number { background: #909399; }
        .timeline-marker.not_executed .marker-number { background: #c0c4cc; }

        .marker-status {
          font-size: 10px;
          color: #909399;
        }

        .timeline-content-block {
          flex: 1;
          margin-left: 16px;
          padding: 16px;
          background: #fafbfc;
          border-radius: 6px;
          border: 1px solid #ebeef5;
          position: relative;
        }

        .timeline-content-block::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 16px;
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-right: 8px solid #ebeef5;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .step-name {
          font-weight: 500;
          color: #303133;
          font-size: 13px;
        }

        .step-duration, .step-speed {
          font-size: 12px;
          color: #606266;
          background: white;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .step-progress {
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 6px;
          border-radius: 3px;
          margin-bottom: 4px;
          transition: width 0.3s;
        }

        .progress-bar.success { background: #67c23a; }
        .progress-bar.error { background: #f56c6c; }
        .progress-bar.running { background: #409eff; }
        .progress-bar.warning { background: #e6a23c; }
        .progress-bar.pending { background: #909399; }
        .progress-bar.not_executed { background: #c0c4cc; }

        .progress-text {
          font-size: 11px;
          color: #909399;
        }

        .step-info, .step-comment {
          font-size: 11px;
          color: #606266;
          margin-top: 4px;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
        }

        .step-comment {
          color: #e6a23c;
        }

        .timeline-connector {
          position: absolute;
          left: 30px;
          top: 60px;
          width: 2px;
          height: 20px;
          background: #dcdfe6;
        }

        /* 指标样式 */
        .ktr-viz-metrics {
          padding: 20px;
          border-top: 1px solid #ebeef5;
          background: #f8f9fa;
        }

        .ktr-viz-metrics h4 {
          margin: 0 0 16px 0;
          font-size: 15px;
          color: #303133;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ebeef5;
        }

        .metric-item.success { border-left: 3px solid #67c23a; }
        .metric-item.error { border-left: 3px solid #f56c6c; }
        .metric-item.running { border-left: 3px solid #409eff; }
        .metric-item.slow { border-left: 3px solid #e6a23c; }

        .metric-label {
          font-size: 11px;
          color: #909399;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 13px;
          font-weight: 500;
          color: #303133;
        }

        .ktr-viz-no-data {
          text-align: center;
          color: #909399;
          padding: 40px 20px;
          font-size: 14px;
        }

        /* 错误样式 */
        .ktr-viz-error {
          text-align: center;
          padding: 40px 20px;
          background: #fef0f0;
          border-radius: 6px;
          border: 1px solid #f56c6c;
        }

        .error-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .error-title {
          font-size: 16px;
          font-weight: 500;
          color: #f56c6c;
          margin-bottom: 8px;
        }

        .error-message {
          font-size: 14px;
          color: #606266;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .error-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          color: #606266;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .error-btn:hover {
          border-color: #409eff;
          color: #409eff;
        }

        .timeline-content-block.error-highlight {
          border-left: 3px solid #f56c6c;
          background: #fef0f0;
        }

        .step-error {
          font-size: 11px;
          color: #f56c6c;
          margin-top: 4px;
          font-weight: 500;
        }

        /* 性能优化样式 */
        .performance-warning {
          background: #fdf6ec;
          border: 1px solid #e6a23c;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #e6a23c;
          text-align: center;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          color: #909399;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .loading-state::before {
          content: '';
          width: 16px;
          height: 16px;
          border: 2px solid #dcdfe6;
          border-top-color: #409eff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 批次信息样式 */
        .ktr-viz-batch-info {
          padding: 20px;
          border-top: 1px solid #ebeef5;
          background: #fafcff;
        }

        .ktr-viz-batch-info h4 {
          margin: 0 0 16px 0;
          font-size: 15px;
          color: #303133;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ktr-viz-batch-info h4::before {
          content: '📊';
          font-size: 16px;
        }

        .batch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .batch-section {
          background: white;
          border-radius: 6px;
          padding: 16px;
          border: 1px solid #ebeef5;
        }

        .batch-section h5 {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #606266;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .batch-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f5f7fa;
        }

        .batch-item:last-child {
          border-bottom: none;
        }

        .batch-label {
          font-size: 12px;
          color: #909399;
          flex-shrink: 0;
          margin-right: 8px;
        }

        .batch-value {
          font-size: 12px;
          color: #303133;
          font-weight: 500;
          text-align: right;
          word-break: break-all;
        }

        .metrics-text {
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 11px;
          background: #f5f7fa;
          padding: 2px 6px;
          border-radius: 3px;
        }
      </style>
    `;

    const styleElement = document.createElement('div');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement.firstElementChild);
  }

  // 显示可视化面板
  function showVisualization(ktrData) {
    const panel = createVisualizationPanel(ktrData);
    if (panel) {
      document.body.appendChild(panel);
      // 保存数据到全局变量供标签页切换使用
      window.currentKTRData = ktrData;
      // 自动显示第一个运行结果
      window.switchRun(0);

      // 重新定位渲染按钮，避免遮挡面板
      setTimeout(() => {
        const renderBtn = document.getElementById('ktr-render-btn');
        if (renderBtn) {
          const panelRect = panel.getBoundingClientRect();
          renderBtn.style.top = (panelRect.top + 80) + 'px';
          renderBtn.style.left = (panelRect.left - 180) + 'px';
        }
      }, 100);

      console.log('KTR可视化面板已显示');
    }
  }

  // 检查当前网站是否已启用且符合功能范围
  function isWebsiteEnabled() {
    // 首先检查路径是否包含findig-web
    if (!window.location.pathname.includes('findig-web')) {
      console.log('当前网站路径不符合插件功能范围（不包含findig-web）');
      return false;
    }

    // 检查是否在扩展环境中
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.log('不在扩展环境中，跳过网站检查');
      return true; // 开发模式时启用
    }

    try {
      chrome.storage.local.get(['ktr-enabled-websites'], (result) => {
        const enabledWebsites = result['ktr-enabled-websites'] || [];
        const currentHost = window.location.host;
        const currentOrigin = window.location.origin;

        const isEnabled = enabledWebsites.some(website => {
          try {
            const url = new URL(website);
            return url.host === currentHost || website === currentOrigin;
          } catch (error) {
            return website === currentOrigin;
          }
        });

        // 如果启用，开始监听KTR数据
        if (isEnabled) {
          console.log('当前网站已启用，开始监听KTR数据...');
          startMonitoring();
        } else {
          console.log('当前网站未启用');
        }
      });
    } catch (error) {
      console.log('无法访问存储，启用监听:', error);
      startMonitoring(); // 出错时默认启用
    }

    return false; // 异步检查，返回false让调用者不继续执行
  }

  // 开始监听KTR数据
  function startMonitoring() {
    // 监听抽屉出现
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('el-drawer')) {
            console.log('检测到抽屉，开始解析KTR数据');
            setTimeout(() => {
              extractKTRDataFromDrawer(node);
            }, 500); // 等待内容加载
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 监听抽屉组件中的JSON数据
  function monitorDrawerForKTR() {
    console.log('检查网站启用状态...');
    isWebsiteEnabled();
  }

  // 从抽屉中提取KTR数据
  function extractKTRDataFromDrawer(drawer) {
    try {
      // 查找JSON编辑器
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (!jsonEditor) {
        console.log('抽屉中未找到JSON编辑器');
        return;
      }

      // 尝试获取原始JSON数据
      const rawData = findRawJSONData(jsonEditor);
      if (rawData) {
        console.log('找到KTR原始数据:', rawData);
        const parsedData = parseKTRData(rawData);
        if (parsedData) {
          showVisualization(parsedData);
        }
      }
    } catch (error) {
      console.log('提取KTR数据失败:', error);
    }
  }

  // 从JSON编辑器中查找原始数据
  function findRawJSONData(jsonEditor) {
    // 首先尝试从预览模式的pre元素中获取JSON
    const previewElement = jsonEditor.querySelector('.jsoneditor-preview');
    if (previewElement && previewElement.textContent) {
      try {
        return JSON.parse(previewElement.textContent.trim());
      } catch (e) {
        console.log('预览模式内容解析失败:', e);
      }
    }

    // 尝试从ace编辑器的内容中获取JSON
    const aceTextarea = jsonEditor.querySelector('.ace_text-input');
    if (aceTextarea && aceTextarea.value) {
      try {
        return JSON.parse(aceTextarea.value);
      } catch (e) {
        console.log('ACE编辑器内容解析失败:', e);
      }
    }

    // 尝试从DOM文本内容中提取JSON
    const textContent = jsonEditor.textContent;
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log('文本内容解析失败:', e);
      }
    }

    // 尝试从可能的全局变量中获取
    if (window.lastKTRResponse) {
      return window.lastKTRResponse;
    }

    return null;
  }

  // 手动触发渲染的函数
  function manualRenderKTR() {
    const drawer = document.querySelector('.el-drawer');
    if (!drawer) {
      console.log('未找到抽屉组件');
      alert('请先打开侧边栏并点击预览');
      return;
    }

    const jsonEditor = drawer.querySelector('.jsoneditor');
    if (!jsonEditor) {
      console.log('抽屉中未找到JSON编辑器');
      alert('请在抽屉中查看JSON内容');
      return;
    }

    const jsonData = findRawJSONData(jsonEditor);
    if (!jsonData) {
      console.log('无法提取JSON数据');
      alert('无法提取JSON数据，请确保已点击预览并显示JSON内容');
      return;
    }

    console.log('手动提取的KTR数据:', jsonData);
    const parsedData = parseKTRData(jsonData);
    if (parsedData) {
      showVisualization(parsedData);
    } else {
      alert('KTR数据解析失败，请检查数据格式');
    }
  }

  // 动态管理渲染按钮的显示/隐藏
  function manageRenderButton() {
    // 直接查找包含JSON编辑器的可见元素
    const jsonEditors = document.querySelectorAll('.jsoneditor');
    let targetDrawer = null;

    // 找到第一个可见的JSON编辑器，然后找到其所在的抽屉
    for (const editor of jsonEditors) {
      const rect = editor.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // 向上查找抽屉容器
        targetDrawer = editor.closest('.el-drawer__container, .el-drawer, [role="dialog"]');
        if (targetDrawer) break;
      }
    }

    const existingBtn = document.getElementById('ktr-render-btn');

    // 如果找到目标抽屉，显示按钮
    if (targetDrawer) {
      if (!existingBtn) {
        addRenderButtonToDrawer(targetDrawer);
      } else {
        // 确保按钮位置正确
        positionButtonNearDrawer(targetDrawer, existingBtn);
      }
    } else if (existingBtn) {
      // 没有目标抽屉，移除按钮
      existingBtn.remove();
    }
  }

  // 添加渲染按钮到抽屉附近
  function addRenderButtonToDrawer(drawer) {
    const renderBtn = document.createElement('button');
    renderBtn.id = 'ktr-render-btn';
    renderBtn.innerHTML = '🚀 渲染数据链路图';

    renderBtn.style.cssText = `
      position: fixed;
      z-index: 10000;
      background: #409eff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      transition: all 0.3s;
      display: block;
      visibility: visible;
    `;

    renderBtn.onmouseover = function() {
      this.style.background = '#66b1ff';
      this.style.transform = 'translateY(-2px)';
    };

    renderBtn.onmouseout = function() {
      this.style.background = '#409eff';
      this.style.transform = 'translateY(0)';
    };

    renderBtn.onclick = manualRenderKTR;

    document.body.appendChild(renderBtn);
    positionButtonNearDrawer(drawer, renderBtn);
  }

  // 定位按钮到抽屉附近
  function positionButtonNearDrawer(drawer, button) {
    const drawerRect = drawer.getBoundingClientRect();
    const vizPanel = document.getElementById('ktr-visualization-panel');

    // 如果监控面板已显示，将按钮移到左侧避免遮挡
    if (vizPanel) {
      const panelRect = vizPanel.getBoundingClientRect();
      button.style.top = (panelRect.top + 80) + 'px';
      button.style.left = (panelRect.left - 180) + 'px';
    } else if (drawerRect.left === 0 && drawerRect.top === 0 && drawerRect.width > 0) {
      // 如果抽屉位置是(0,0)但有尺寸，说明使用了transform
      // 将按钮放在页面右侧，靠近抽屉可能出现的位置
      const viewportWidth = window.innerWidth;
      button.style.top = '100px';
      button.style.left = (viewportWidth - drawerRect.width - 200) + 'px';
    } else {
      // 正常情况：将按钮放在抽屉左上角外侧
      button.style.top = (drawerRect.top + 20) + 'px';
      button.style.left = (drawerRect.left - 180) + 'px';
    }

    button.style.display = 'block';
    button.style.visibility = 'visible';
  }

  // 监听抽屉状态变化
  function monitorDrawerState() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        // 检查类名变化或属性变化
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          manageRenderButton();
        }

        // 检查添加/移除的节点
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList) {
            if (node.classList.contains('el-drawer') ||
                node.classList.contains('el-drawer__container') ||
                node.classList.contains('jsoneditor')) {
              manageRenderButton();
            }
          }
        });

        mutation.removedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList &&
              (node.classList.contains('el-drawer') || node.classList.contains('el-drawer__container'))) {
            manageRenderButton();
          }
        });
      });
    });

    // 监听body的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // 初始检查和定期检查
    setTimeout(manageRenderButton, 100);
    setInterval(manageRenderButton, 1000); // 每秒检查一次
  }

  // 初始化
  function init() {
    console.log('KTR可视化器初始化');
    monitorDrawerForKTR();
    monitorDrawerState();

    // 监听来自content script的消息
    window.addEventListener('message', function(event) {
      if (event.data.type === 'KTR_DATA' && event.data.data) {
        console.log('收到KTR数据消息:', event.data.data);
        const parsedData = parseKTRData(event.data.data);
        if (parsedData) {
          showVisualization(parsedData);
        }
      }
    });
  }

  // 启动
  init();

})();