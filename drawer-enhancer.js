// 抽屉增强器 - 在原有抽屉上添加图形展示按钮
(function() {
  'use strict';

  console.log('=== 抽屉增强器已加载 ===');

  // 注入样式
  function injectStyles() {
    if (document.getElementById('ktr-enhancer-styles')) return;

    const styles = `
      #ktr-visualize-btn {
        background: #409eff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
        transition: all 0.3s;
      }
      #ktr-visualize-btn:hover {
        background: #66b1ff;
      }
      #ktr-visualize-btn:active {
        background: #3a8ee6;
      }
      #ktr-visualize-btn.visualizing {
        background: #67c23a;
      }

      .ktr-flow-container {
        margin: 20px 0;
        padding: 20px;
        background: #f5f7fa;
        border-radius: 8px;
        border: 1px solid #ebeef5;
      }

      .ktr-flow-title {
        font-size: 16px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 20px;
        text-align: center;
      }

      .ktr-flow-step {
        display: flex;
        align-items: center;
        padding: 15px;
        margin: 10px 0;
        background: white;
        border-radius: 6px;
        border-left: 4px solid #dcdfe6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .ktr-flow-step.success {
        border-left-color: #67c23a;
        background: #f0f9ff;
      }

      .ktr-flow-step.error {
        border-left-color: #f56c6c;
        background: #fef0f0;
      }

      .ktr-flow-step.running {
        border-left-color: #409eff;
        background: #ecf5ff;
      }

      .ktr-step-icon {
        font-size: 24px;
        margin-right: 15px;
        width: 30px;
        text-align: center;
      }

      .ktr-step-content {
        flex: 1;
      }

      .ktr-step-name {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        margin-bottom: 4px;
      }

      .ktr-step-type {
        font-size: 12px;
        color: #909399;
        margin-bottom: 2px;
      }

      .ktr-step-status {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 3px;
        display: inline-block;
      }

      .ktr-step-status.success {
        background: #f0f9ff;
        color: #67c23a;
      }

      .ktr-step-status.error {
        background: #fef0f0;
        color: #f56c6c;
      }

      .ktr-step-status.running {
        background: #ecf5ff;
        color: #409eff;
      }

      .ktr-step-duration {
        font-size: 12px;
        color: #67c23a;
        margin-top: 4px;
      }

      .ktr-flow-arrow {
        text-align: center;
        color: #c0c4cc;
        font-size: 20px;
        margin: 10px 0;
      }

      .ktr-overview {
        background: white;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
        border: 1px solid #ebeef5;
      }

      .ktr-overview-title {
        font-size: 14px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 10px;
      }

      .ktr-overview-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .ktr-overview-item:last-child {
        border-bottom: none;
      }

      .ktr-overview-label {
        color: #606266;
        font-size: 12px;
      }

      .ktr-overview-value {
        color: #303133;
        font-size: 12px;
        font-weight: 500;
      }

      .ktr-overview-value.success {
        color: #67c23a;
      }

      .ktr-overview-value.error {
        color: #f56c6c;
      }

      .ktr-overview-value.running {
        color: #409eff;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = 'ktr-enhancer-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  // 解析KTR数据
  function parseKTRData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.result || !data.result[0]) return null;

      const result = data.result[0];
      let extData = {};
      let extSummary = {};

      if (result.ext_data) {
        extData = typeof result.ext_data === 'string' ? JSON.parse(result.ext_data) : result.ext_data;
      }
      if (result.ext_summary) {
        extSummary = typeof result.ext_summary === 'string' ? JSON.parse(result.ext_summary) : result.ext_summary;
      }

      return { data, extData, extSummary };
    } catch (error) {
      console.log('KTR数据解析失败:', error);
      return null;
    }
  }

  // 获取步骤图标
  function getStepIcon(type) {
    const icons = {
      'TableInput': '📥',
      'TableOutput': '📤',
      'InsertUpdate': '💾',
      'RedoTableInput': '🔄',
      'default': '⚙️'
    };
    return icons[type] || icons.default;
  }

  // 获取步骤状态
  function getStepStatus(stepName, rsData) {
    for (const rs of rsData) {
      if (rs.statuses) {
        for (const status of rs.statuses) {
          if (status.step && status.step.includes(stepName)) {
            return {
              className: getStatusClass(status.exit),
              text: getStatusText(status.exit),
              duration: status.duration,
              comment: status.comment
            };
          }
        }
      }
    }
    return { className: 'pending', text: '待执行' };
  }

  function getStatusClass(exitCode) {
    if (exitCode === 0) return 'success';
    if (exitCode === 1) return 'warning';
    if (exitCode === 2) return 'running';
    return 'error';
  }

  function getStatusText(exitCode) {
    const statusMap = {
      0: '成功',
      1: '警告',
      2: '运行中'
    };
    return statusMap[exitCode] || '失败';
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
      const overallStatus = summary.finish ? 'success' : summary.stop ? 'error' : 'running';

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
            <span class="ktr-overview-value ${overallStatus}">${overallStatus === 'success' ? '✅ 已完成' : overallStatus === 'error' ? '❌ 已停止' : '🔄 运行中'}</span>
          </div>
          <div class="ktr-overview-item">
            <span class="ktr-overview-label">错误数:</span>
            <span class="ktr-overview-value">${summary.errors || 0}</span>
          </div>
        </div>
      `;
    }

    // 数据处理流程
    if (extData.steps && extData.steps.length > 0) {
      html += '<div class="ktr-flow-container">';
      html += '<div class="ktr-flow-title">🔄 数据处理链路</div>';

      extData.steps.forEach((step, index) => {
        const status = getStepStatus(step.name, extData.rs || []);
        const isLast = index === extData.steps.length - 1;

        html += `
          <div class="ktr-flow-step ${status.className}">
            <div class="ktr-step-icon">${getStepIcon(step.type)}</div>
            <div class="ktr-step-content">
              <div class="ktr-step-name">${step.name}</div>
              <div class="ktr-step-type">${step.type}</div>
              <div class="ktr-step-status ${status.className}">${status.text}</div>
              ${status.duration ? `<div class="ktr-step-duration">⏱️ ${status.duration}ms</div>` : ''}
              ${status.comment ? `<div style="font-size: 11px; color: #e6a23c; margin-top: 4px;">💬 ${status.comment}</div>` : ''}
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
    console.log('准备添加图形展示按钮...');

    // 检查是否已存在按钮
    if (drawer.querySelector('#ktr-visualize-btn')) {
      console.log('按钮已存在，跳过');
      return;
    }

    // 查找抽屉头部
    const header = drawer.querySelector('.el-drawer__header') ||
                   drawer.querySelector('.el-drawer__title') ||
                   drawer.querySelector('[class*="header"]');

    if (!header) {
      console.log('未找到抽屉头部，创建自定义头部');
      return createCustomHeader(drawer);
    }

    const button = document.createElement('button');
    button.id = 'ktr-visualize-btn';
    button.textContent = '📊 图形展示';
    button.title = '显示数据处理链路图';

    // 添加到头部
    header.appendChild(button);
    console.log('图形展示按钮已添加');

    // 绑定点击事件
    button.addEventListener('click', function() {
      console.log('图形展示按钮被点击');
      handleVisualization(drawer);
    });
  }

  // 创建自定义头部（如果没有找到）
  function createCustomHeader(drawer) {
    console.log('创建自定义头部...');

    if (!drawer) {
      console.log('抽屉元素为null，无法创建头部');
      return;
    }

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafafa;
    `;

    header.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #303133;">扩展数据详情</div>
      <button id="ktr-visualize-btn" style="
        background: #409eff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">📊 图形展示</button>
    `;

    if (drawer.firstChild) {
      drawer.insertBefore(header, drawer.firstChild);
    } else {
      drawer.appendChild(header);
    }

    // 绑定按钮事件
    const btn = header.querySelector('#ktr-visualize-btn');
    if (btn) {
      btn.addEventListener('click', function() {
        handleVisualization(drawer);
      });
    }

    console.log('自定义头部创建完成');
  }

  // 处理可视化
  function handleVisualization(drawer) {
    const button = drawer.querySelector('#ktr-visualize-btn');
    if (!button) return;

    console.log('开始处理可视化...');

    // 切换按钮状态
    button.classList.toggle('visualizing');
    const isVisualizing = button.classList.contains('visualizing');
    button.textContent = isVisualizing ? '🔄 隐藏图形' : '📊 图形展示';

    if (isVisualizing) {
      // 显示图形
      showVisualizationInDrawer(drawer);
    } else {
      // 隐藏图形
      hideVisualizationInDrawer(drawer);
    }
  }

  // 在抽屉内显示可视化
  function showVisualizationInDrawer(drawer) {
    console.log('在抽屉内显示可视化...');

    // 提取KTR数据
    const jsonEditor = drawer.querySelector('.jsoneditor');
    if (!jsonEditor) {
      console.log('未找到JSON编辑器');
      return;
    }

    const ktrData = extractKTRFromDrawer(drawer);
    if (!ktrData) {
      console.log('未能提取KTR数据');
      return;
    }

    // 移除已存在的可视化
    hideVisualizationInDrawer(drawer);

    // 创建可视化容器
    const container = document.createElement('div');
    container.id = 'ktr-flow-visualization';
    container.innerHTML = createFlowVisualization(ktrData);

    // 添加到抽屉body - 添加null检查
    const body = drawer.querySelector('.el-drawer__body') ||
                 drawer.querySelector('[class*="body"]') ||
                 drawer;

    if (body) {
      body.appendChild(container);
      console.log('可视化已添加到抽屉');
    } else {
      console.log('无法找到抽屉body元素');
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

  // 从抽屉提取KTR数据
  function extractKTRFromDrawer(drawer) {
    try {
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (!jsonEditor) return null;

      const textContent = jsonEditor.textContent;
      console.log('提取的文本长度:', textContent.length);

      // 尝试多种JSON模式
      const patterns = [
        /\{\s*"statusCode"[\s\S]*"ext_data"[\s\S]*\}/,
        /\{\s*"result"[\s\S]*"ext_data"[\s\S]*\}/,
        /\{\s*"rs"[\s\S]*"steps"[\s\S]*\}/
      ];

      for (const pattern of patterns) {
        const match = textContent.match(pattern);
        if (match) {
          const ktrData = parseKTRData(match[0]);
          if (ktrData) return ktrData;
        }
      }

      return null;
    } catch (error) {
      console.log('提取KTR数据失败:', error);
      return null;
    }
  }

  // 监听抽屉出现
  function monitorDrawer() {
    console.log('开始监听抽屉组件...');

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('el-drawer')) {
            console.log('检测到抽屉出现');

            // 延迟等待抽屉内容加载
            setTimeout(() => {
              addVisualizeButton(node);
            }, 500);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 检查已存在的抽屉
    const existingDrawers = document.querySelectorAll('.el-drawer');
    existingDrawers.forEach(drawer => {
      console.log('发现已存在的抽屉');
      setTimeout(() => {
        addVisualizeButton(drawer);
      }, 500);
    });
  }

  // 初始化
  injectStyles();
  monitorDrawer();

  console.log('抽屉增强器初始化完成');

})();