// 工作版抽屉增强器 - 基于实际数据结构
(function() {
  'use strict';

  console.log('=== 工作版抽屉增强器已加载 ===');

  // 注入样式
  function injectStyles() {
    if (document.getElementById('ktr-working-styles')) return;

    const styles = `
      #ktr-visualize-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        margin-left: 12px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }
      #ktr-visualize-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      #ktr-visualize-btn:active {
        transform: translateY(0);
      }
      #ktr-visualize-btn.visualizing {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
      }

      .ktr-flow-container {
        margin: 20px 0;
        padding: 25px;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
        backdrop-filter: blur(4px);
      }

      .ktr-flow-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 25px;
        text-align: center;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .ktr-flow-step {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        margin: 12px 0;
        background: white;
        border-radius: 10px;
        border-left: 5px solid #e2e8f0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .ktr-flow-step::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(66, 153, 225, 0.3), transparent);
      }

      .ktr-flow-step:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      .ktr-flow-step.success {
        border-left-color: #48bb78;
        background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
      }

      .ktr-flow-step.error {
        border-left-color: #f56565;
        background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
      }

      .ktr-flow-step.running {
        border-left-color: #4299e1;
        background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%);
      }

      .ktr-step-icon {
        font-size: 24px;
        margin-right: 15px;
        width: 30px;
        text-align: center;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .ktr-step-content {
        flex: 1;
      }

      .ktr-step-name {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
        letter-spacing: 0.3px;
      }

      .ktr-step-type {
        font-size: 12px;
        color: #718096;
        margin-bottom: 6px;
        font-weight: 500;
      }

      .ktr-step-status {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 20px;
        display: inline-block;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ktr-step-status.success {
        background: #c6f6d5;
        color: #22543d;
        box-shadow: 0 2px 4px rgba(72, 187, 120, 0.2);
      }

      .ktr-step-status.error {
        background: #fed7d7;
        color: #742a2a;
        box-shadow: 0 2px 4px rgba(245, 101, 101, 0.2);
      }

      .ktr-step-status.running {
        background: #bee3f8;
        color: #2a4365;
        box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
      }

      .ktr-step-duration {
        font-size: 12px;
        color: #48bb78;
        margin-top: 6px;
        font-weight: 500;
      }

      .ktr-step-comment {
        font-size: 11px;
        color: #ed8936;
        margin-top: 4px;
        font-style: italic;
      }

      .ktr-flow-arrow {
        text-align: center;
        color: #a0aec0;
        font-size: 20px;
        margin: 8px 0;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .ktr-overview {
        background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 25px;
        border: 1px solid rgba(226, 232, 240, 0.5);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }

      .ktr-overview-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ktr-overview-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.2s ease;
      }

      .ktr-overview-item:hover {
        background: rgba(66, 153, 225, 0.05);
        margin: 0 -10px;
        padding: 10px;
        border-radius: 6px;
      }

      .ktr-overview-item:last-child {
        border-bottom: none;
      }

      .ktr-overview-label {
        color: #4a5568;
        font-size: 13px;
        font-weight: 500;
      }

      .ktr-overview-value {
        color: #2d3748;
        font-size: 13px;
        font-weight: 600;
      }

      .ktr-overview-value.success {
        color: #38a169;
      }

      .ktr-overview-value.error {
        color: #e53e3e;
      }

      .ktr-overview-value.running {
        color: #3182ce;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ktr-flow-container {
        animation: fadeInUp 0.6s ease-out;
      }

      .ktr-flow-step {
        animation: fadeInUp 0.5s ease-out;
        animation-fill-mode: both;
      }

      .ktr-flow-step:nth-child(1) { animation-delay: 0.1s; }
      .ktr-flow-step:nth-child(2) { animation-delay: 0.2s; }
      .ktr-flow-step:nth-child(3) { animation-delay: 0.3s; }
      .ktr-flow-step:nth-child(4) { animation-delay: 0.4s; }
      .ktr-flow-step:nth-child(5) { animation-delay: 0.5s; }
      .ktr-flow-step:nth-child(6) { animation-delay: 0.6s; }
      .ktr-flow-step:nth-child(7) { animation-delay: 0.7s; }
      .ktr-flow-step:nth-child(8) { animation-delay: 0.8s; }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = 'ktr-working-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  // 解析KTR数据（基于实际格式）
  function parseKTRData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);

      // 实际数据格式直接包含rs和steps
      if (data.rs && data.steps) {
        console.log('成功解析KTR数据格式');
        return {
          data: data,
          extData: {
            rs: data.rs,
            steps: data.steps
          },
          extSummary: {
            rs: data.rs
          }
        };
      }

      // 备用：检查是否有result包装
      if (data.result && data.result[0]) {
        const result = data.result[0];
        if (result.ext_data && result.ext_summary) {
          return {
            data: data,
            extData: typeof result.ext_data === 'string' ? JSON.parse(result.ext_data) : result.ext_data,
            extSummary: typeof result.ext_summary === 'string' ? JSON.parse(result.ext_summary) : result.ext_summary
          };
        }
      }

      return null;
    } catch (error) {
      console.log('KTR数据解析失败:', error);
      return null;
    }
  }

  // 从抽屉提取KTR数据
  function extractKTRFromDrawer(drawer) {
    try {
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (!jsonEditor) {
        console.log('未找到JSON编辑器');
        return null;
      }

      // 获取pre元素中的JSON文本
      const preElement = jsonEditor.querySelector('pre.jsoneditor-preview');
      if (!preElement) {
        console.log('未找到pre元素');
        return null;
      }

      const jsonText = preElement.textContent;
      console.log('提取到JSON文本，长度:', jsonText.length);

      return parseKTRData(jsonText);
    } catch (error) {
      console.log('提取KTR数据失败:', error);
      return null;
    }
  }

  // 获取步骤图标
  function getStepIcon(type) {
    const icons = {
      'LookupValueStep': '🔍',
      'FilterRows': '🔎',
      'RedoDatabaseJoin': '🔗',
      'SelectValues': '✏️',
      'Calculator': '🧮',
      'RedoUpdate': '💾',
      'RedisWriterStep': '📮',
      'JsonOutput': '📄',
      'OpEventInput': '📋',
      'RedoTableInput': '📊',
      'RedisLookupStep': '🗝️',
      'ScriptValueMod': '📝',
      'SwitchCase': '🔄',
      'Dummy': '🎯',
      'default': '⚙️'
    };
    return icons[type] || icons.default;
  }

  // 获取步骤状态
  function getStepStatus(stepName, statuses) {
    for (const status of statuses) {
      if (status.step && status.step.includes(stepName)) {
        return {
          className: getStatusClass(status.exit, status.speed),
          text: getStatusText(status.exit, status.comment),
          duration: status.duration,
          comment: status.comment,
          speed: status.speed,
          nr: status.nr
        };
      }
    }
    return { className: 'pending', text: '待执行' };
  }

  function getStatusClass(exitCode, speed) {
    if (exitCode === 0) return 'success';
    if (exitCode === 1) return 'warning';
    if (exitCode === 2) return 'running';
    return 'error';
  }

  function getStatusText(exitCode, comment) {
    if (exitCode === 0) return '✅ 成功';
    if (exitCode === 1) return '⚠️ 警告';
    if (exitCode === 2) return '🔄 运行中';
    if (comment && comment.includes('Running')) return '🏃 正在运行';
    return '❌ 失败';
  }

  // 创建流程图HTML
  function createFlowVisualization(ktrData) {
    if (!ktrData || !ktrData.extData) {
      return '<div style="text-align: center; color: #999; padding: 20px;">无法解析KTR数据</div>';
    }

    const { extData, extSummary } = ktrData;
    let html = '';

    // 运行概览
    if (extSummary.rs && extSummary.rs.length > 0) {
      const summary = extSummary.rs[0];
      const overallStatus = summary.exit === 0 ? 'success' : summary.exit === 2 ? 'running' : 'error';
      const metrics = summary.metrics || '';
      const events = summary.events || {};

      html += `
        <div class="ktr-overview">
          <div class="ktr-overview-title">📊 运行概览</div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">批次:</span>
            <span class="ktr-overview-value">${summary.batch || 'N/A'}</span>
          </div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">开始时间:</span>
            <span class="ktr-overview-value">${summary.startAt || 'N/A'}</span>
          </div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">状态:</span>
            <span class="ktr-overview-value ${overallStatus}">${overallStatus === 'success' ? '✅ 已完成' : overallStatus === 'running' ? '🔄 运行中' : '❌ 失败'}</span>
          </div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">耗时:</span>
            <span class="ktr-overview-value">${summary.takeTime || 0}ms</span>
          </div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">错误数:</span>
            <span class="ktr-overview-value">${summary.errors || 0}</span>
          </div>
          ${metrics ? `<div class="ktr-overview-item">
            <span class="ktr-overview-label">性能指标:</span>
            <span class="ktr-overview-value">${metrics}</span>
          </div>` : ''}
          ${events.pull ? `<div class="ktr-overview-item">
            <span class="ktr-overview-label">拉取耗时:</span>
            <span class="ktr-overview-value">${events.pull.takeTime || 0}ms</span>
          </div>` : ''}
        </div>
      `;
    }

    // 数据处理流程
    if (extData.steps && extData.steps.length > 0) {
      html += '<div class="ktr-flow-container">';
      html += '<div class="ktr-flow-title">🔄 数据处理链路</div>';

      extData.steps.forEach((step, index) => {
        const status = getStepStatus(step.name, extData.rs[0].statuses || []);
        const isLast = index === extData.steps.length - 1;

        html += `
          <div class="ktr-flow-step ${status.className}">
            <div class="ktr-step-icon">${getStepIcon(step.type)}</div>
            <div class="ktr-step-content">
              <div class="ktr-step-name">${step.name}</div>
              <div class="ktr-step-type">${step.type}</div>
              <div class="ktr-step-status ${status.className}">${status.text}</div>
              ${status.duration ? `<div class="ktr-step-duration">⏱️ ${status.duration}ms</div>` : ''}
              ${status.comment ? `<div class="ktr-step-comment">💬 ${status.comment}</div>` : ''}
              ${status.speed !== undefined ? `<div style="font-size: 10px; color: #718096; margin-top: 2px;">🚀 速度: ${status.speed}/s</div>` : ''}
              ${status.nr ? `<div style="font-size: 10px; color: #718096;">📊 ${status.nr}</div>` : ''}
            </div>
          </div>
        `;

        if (!isLast) {
          html += '<div class="ktr-flow-arrow">↓</div>';
        }
      });

      html += '</div>';
    }

    return html;
  }

  // 在抽屉中添加按钮
  function addVisualizeButton(drawer) {
    if (!drawer) {
      console.log('抽屉元素为null');
      return;
    }

    // 检查是否已存在按钮
    if (drawer.querySelector('#ktr-visualize-btn')) {
      console.log('按钮已存在');
      return;
    }

    console.log('创建图形展示按钮...');

    // 查找抽屉头部
    const header = drawer.querySelector('.el-drawer__header') ||
                   drawer.querySelector('.el-drawer__title') ||
                   drawer.querySelector('[class*="header"]');

    if (!header) {
      console.log('未找到标准头部，使用降级方案');
      return createFloatingButton(drawer);
    }

    const button = document.createElement('button');
    button.id = 'ktr-visualize-btn';
    button.textContent = '📊 图形展示';
    button.title = '显示数据处理链路图';

    header.appendChild(button);
    console.log('按钮创建成功');

    button.addEventListener('click', function() {
      handleVisualizationClick(drawer);
    });
  }

  // 创建浮动按钮（降级方案）
  function createFloatingButton(drawer) {
    const button = document.createElement('button');
    button.id = 'ktr-visualize-btn';
    button.textContent = '📊 展示';
    button.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 1000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
    `;

    // 确保drawer有相对定位
    if (drawer.style.position === '' || drawer.style.position === 'static') {
      drawer.style.position = 'relative';
    }

    drawer.appendChild(button);
    console.log('浮动按钮创建成功');

    button.addEventListener('click', function() {
      handleVisualizationClick(drawer);
    });
  }

  // 处理可视化点击
  function handleVisualizationClick(drawer) {
    const button = drawer.querySelector('#ktr-visualize-btn');
    if (!button) return;

    // 切换按钮状态
    button.classList.toggle('visualizing');
    const isVisualizing = button.classList.contains('visualizing');
    button.textContent = isVisualizing ? '🔄 隐藏图形' : '📊 图形展示';

    if (isVisualizing) {
      showVisualizationInDrawer(drawer);
    } else {
      hideVisualizationInDrawer(drawer);
    }
  }

  // 在抽屉内显示可视化
  function showVisualizationInDrawer(drawer) {
    // 移除已存在的可视化
    hideVisualizationInDrawer(drawer);

    const ktrData = extractKTRFromDrawer(drawer);
    if (!ktrData) {
      console.log('未能提取KTR数据');
      return;
    }

    const container = document.createElement('div');
    container.id = 'ktr-flow-visualization';
    container.innerHTML = createFlowVisualization(ktrData);
    container.className = 'ktr-flow-container';

    // 添加到抽屉
    const body = drawer.querySelector('.el-drawer__body') || drawer.querySelector('section') || drawer;
    if (body) {
      body.appendChild(container);
      console.log('可视化已添加到抽屉');
    } else {
      console.log('无法找到抽屉body，直接添加到drawer');
      drawer.appendChild(container);
    }
  }

  // 隐藏可视化
  function hideVisualizationInDrawer(drawer) {
    const existing = drawer.querySelector('#ktr-flow-visualization');
    if (existing) {
      existing.remove();
      console.log('可视化已隐藏');
    }
  }

  // 监听抽屉出现
  function monitorDrawer() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('el-drawer')) {
            console.log('检测到抽屉出现');
            setTimeout(() => {
              addVisualizeButton(node);
            }, 800); // 等待内容加载
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初始化
  injectStyles();
  monitorDrawer();

  console.log('工作版抽屉增强器初始化完成');

})();