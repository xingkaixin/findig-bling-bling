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
        return {
          extData: data,
          extSummary: data, // 对于直接格式，使用相同的数据
          raw: data
        };
      }

      // 检查是否为API响应格式（包含result数组）
      if (data.result && data.result[0]) {
        const result = data.result[0];
        const extData = typeof result.ext_data === 'string' ? JSON.parse(result.ext_data) : result.ext_data;
        const extSummary = typeof result.ext_summary === 'string' ? JSON.parse(result.ext_summary) : result.ext_summary;

        return {
          extData: extData,
          extSummary: extSummary,
          raw: data
        };
      }

      console.log('KTR数据格式不正确，无法识别格式');
      return null;
    } catch (error) {
      console.log('KTR数据解析失败:', error);
      return null;
    }
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
        <h3>数据处理链路</h3>
        <button class="ktr-viz-close" onclick="this.closest('#ktr-visualization-panel').remove()">×</button>
      </div>
      <div class="ktr-viz-content">
        ${generateProcessingFlow(ktrData)}
        ${generateStatusOverview(ktrData)}
        ${generateStepDetails(ktrData)}
      </div>
    `;

    // 添加样式
    addVisualizationStyles();

    return panel;
  }

  // 生成处理流程图
  function generateProcessingFlow(ktrData) {
    const steps = ktrData.extData.steps || [];
    const rsData = ktrData.extData.rs || [];

    if (steps.length === 0) {
      return '<div class="ktr-viz-no-data">暂无步骤数据</div>';
    }

    let flowHtml = '<div class="ktr-viz-flow">';

    steps.forEach((step, index) => {
      const statusInfo = getStepStatus(step.name, rsData);
      const isLast = index === steps.length - 1;

      flowHtml += `
        <div class="ktr-viz-step ${statusInfo.status}" data-step="${step.name}">
          <div class="ktr-viz-step-icon">${getStepIcon(step.type)}</div>
          <div class="ktr-viz-step-info">
            <div class="ktr-viz-step-name">${step.name}</div>
            <div class="ktr-viz-step-type">${step.type}</div>
            ${statusInfo.duration ? `<div class="ktr-viz-step-duration">${statusInfo.duration}ms</div>` : ''}
          </div>
          ${statusInfo.comment ? `<div class="ktr-viz-step-comment">${statusInfo.comment}</div>` : ''}
        </div>
        ${!isLast ? '<div class="ktr-viz-arrow">→</div>' : ''}
      `;
    });

    flowHtml += '</div>';
    return flowHtml;
  }

  // 获取步骤状态
  function getStepStatus(stepName, rsData) {
    for (const rs of rsData) {
      if (rs.statuses) {
        for (const status of rs.statuses) {
          if (status.step && status.step.includes(stepName)) {
            return {
              status: getStatusClass(status.exit),
              duration: status.duration,
              comment: status.comment
            };
          }
        }
      }
    }
    return { status: 'pending', duration: null, comment: null };
  }

  // 获取状态样式类
  function getStatusClass(exitCode) {
    if (exitCode === 0) return 'success';
    if (exitCode === 1) return 'warning';
    if (exitCode === 2) return 'running';
    return 'error';
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

  // 生成状态概览
  function generateStatusOverview(ktrData) {
    const summary = ktrData.extSummary;
    const rsData = summary.rs || [];

    if (rsData.length === 0) {
      return '';
    }

    const batchInfo = rsData[0];
    const overallStatus = getOverallStatus(batchInfo);

    return `
      <div class="ktr-viz-overview">
        <h4>运行概览</h4>
        <div class="ktr-viz-batch-info">
          <div class="ktr-viz-batch-item">
            <span class="label">批次:</span>
            <span class="value">${batchInfo.batch || 'N/A'}</span>
          </div>
          <div class="ktr-viz-batch-item">
            <span class="label">开始时间:</span>
            <span class="value">${batchInfo.startAt || 'N/A'}</span>
          </div>
          <div class="ktr-viz-batch-item">
            <span class="label">状态:</span>
            <span class="value ${overallStatus}">${overallStatus.toUpperCase()}</span>
          </div>
          <div class="ktr-viz-batch-item">
            <span class="label">错误数:</span>
            <span class="value">${batchInfo.errors || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 获取整体状态
  function getOverallStatus(batchInfo) {
    if (batchInfo.errors > 0) return 'error';
    if (batchInfo.finish && !batchInfo.stop) return 'success';
    if (batchInfo.stop) return 'stopped';
    return 'running';
  }

  // 生成步骤详情
  function generateStepDetails(ktrData) {
    const steps = ktrData.extData.steps || [];
    const rsData = ktrData.extData.rs || [];

    if (steps.length === 0) {
      return '';
    }

    let detailsHtml = '<div class="ktr-viz-details">';
    detailsHtml += '<h4>步骤详情</h4>';

    steps.forEach((step, index) => {
      const statusInfo = getStepStatus(step.name, rsData);

      detailsHtml += `
        <div class="ktr-viz-detail-item">
          <div class="ktr-viz-detail-header">
            <span class="step-number">${index + 1}</span>
            <span class="step-name">${step.name}</span>
            <span class="step-status ${statusInfo.status}">${getStatusText(statusInfo.status)}</span>
          </div>
          <div class="ktr-viz-detail-body">
            <div class="detail-row">
              <span class="detail-label">类型:</span>
              <span class="detail-value">${step.type}</span>
            </div>
            ${statusInfo.duration ? `
              <div class="detail-row">
                <span class="detail-label">耗时:</span>
                <span class="detail-value">${statusInfo.duration}ms</span>
              </div>
            ` : ''}
            ${statusInfo.comment ? `
              <div class="detail-row">
                <span class="detail-label">备注:</span>
                <span class="detail-value">${statusInfo.comment}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    detailsHtml += '</div>';
    return detailsHtml;
  }

  // 获取状态文本
  function getStatusText(status) {
    const statusMap = {
      'success': '成功',
      'error': '失败',
      'warning': '警告',
      'running': '运行中',
      'pending': '待执行',
      'stopped': '已停止'
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
          width: 800px;
          max-height: 85vh;
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
          padding: 20px;
          overflow-y: auto;
          max-height: calc(85vh - 70px);
        }

        .ktr-viz-flow {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .ktr-viz-step {
          display: flex;
          align-items: center;
          padding: 12px;
          border: 1px solid #ebeef5;
          border-radius: 6px;
          background: #fafafa;
          position: relative;
        }

        .ktr-viz-step.success {
          border-color: #67c23a;
          background: #f0f9ff;
        }

        .ktr-viz-step.error {
          border-color: #f56c6c;
          background: #fef0f0;
        }

        .ktr-viz-step.running {
          border-color: #409eff;
          background: #ecf5ff;
        }

        .ktr-viz-step.warning {
          border-color: #e6a23c;
          background: #fdf6ec;
        }

        .ktr-viz-step-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .ktr-viz-step-info {
          flex: 1;
        }

        .ktr-viz-step-name {
          font-weight: 500;
          color: #303133;
          margin-bottom: 2px;
        }

        .ktr-viz-step-type {
          font-size: 12px;
          color: #909399;
        }

        .ktr-viz-step-duration {
          font-size: 12px;
          color: #67c23a;
          margin-top: 2px;
        }

        .ktr-viz-step-comment {
          font-size: 12px;
          color: #e6a23c;
          margin-top: 2px;
        }

        .ktr-viz-arrow {
          text-align: center;
          color: #c0c4cc;
          font-size: 16px;
          margin: 4px 0;
        }

        .ktr-viz-overview {
          margin-bottom: 20px;
        }

        .ktr-viz-overview h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #303133;
        }

        .ktr-viz-batch-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .ktr-viz-batch-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f5f7fa;
          border-radius: 4px;
        }

        .ktr-viz-batch-item .label {
          color: #606266;
          font-size: 12px;
        }

        .ktr-viz-batch-item .value {
          color: #303133;
          font-size: 12px;
          font-weight: 500;
        }

        .ktr-viz-batch-item .value.success {
          color: #67c23a;
        }

        .ktr-viz-batch-item .value.error {
          color: #f56c6c;
        }

        .ktr-viz-batch-item .value.running {
          color: #409eff;
        }

        .ktr-viz-details h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #303133;
        }

        .ktr-viz-detail-item {
          margin-bottom: 12px;
          border: 1px solid #ebeef5;
          border-radius: 4px;
        }

        .ktr-viz-detail-header {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          background: #f5f7fa;
          border-radius: 4px 4px 0 0;
        }

        .step-number {
          background: #409eff;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          margin-right: 8px;
        }

        .step-name {
          flex: 1;
          font-weight: 500;
          color: #303133;
        }

        .step-status {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 3px;
        }

        .step-status.success {
          background: #f0f9ff;
          color: #67c23a;
        }

        .step-status.error {
          background: #fef0f0;
          color: #f56c6c;
        }

        .step-status.running {
          background: #ecf5ff;
          color: #409eff;
        }

        .ktr-viz-detail-body {
          padding: 12px;
        }

        .detail-row {
          display: flex;
          margin-bottom: 6px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          color: #606266;
          font-size: 12px;
          width: 60px;
          flex-shrink: 0;
        }

        .detail-value {
          color: #303133;
          font-size: 12px;
          flex: 1;
        }

        .ktr-viz-no-data {
          text-align: center;
          color: #909399;
          padding: 20px;
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
      console.log('KTR可视化面板已显示');
    }
  }

  // 监听抽屉组件中的JSON数据
  function monitorDrawerForKTR() {
    console.log('开始监听KTR数据...');

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

    // 如果抽屉位置是(0,0)但有尺寸，说明使用了transform
    // 将按钮放在页面右侧，靠近抽屉可能出现的位置
    if (drawerRect.left === 0 && drawerRect.top === 0 && drawerRect.width > 0) {
      // 假设抽屉从右侧滑入，将按钮放在页面右侧
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