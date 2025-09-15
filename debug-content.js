// 调试版content script - 简化数据提取和可视化
(function() {
  'use strict';

  console.log('=== 融美美调试版扩展已加载 ===');

  // 直接注入可视化样式和函数
  function injectVisualizationStyles() {
    if (document.getElementById('ktr-debug-styles')) return;

    const styles = `
      .ktr-debug-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 500px;
        max-height: 80vh;
        background: #fff;
        border: 2px solid #409eff;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }
      .ktr-debug-header {
        background: #409eff;
        color: white;
        padding: 10px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ktr-debug-close {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 0 5px;
      }
      .ktr-debug-content {
        padding: 15px;
        overflow-y: auto;
        max-height: calc(80vh - 50px);
      }
      .ktr-debug-step {
        margin: 10px 0;
        padding: 10px;
        border-left: 4px solid #ddd;
        background: #f5f5f5;
      }
      .ktr-debug-step.success { border-left-color: #67c23a; background: #f0f9ff; }
      .ktr-debug-step.error { border-left-color: #f56c6c; background: #fef0f0; }
      .ktr-debug-step.running { border-left-color: #409eff; background: #ecf5ff; }
      .ktr-step-title { font-weight: bold; margin-bottom: 5px; }
      .ktr-step-info { color: #666; font-size: 11px; }
      .ktr-flow-arrow { text-align: center; color: #999; margin: 5px 0; }
      pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
    `;

    // 等待DOM准备好再注入样式
    if (document.head) {
      const styleElement = document.createElement('style');
      styleElement.id = 'ktr-debug-styles';
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    } else {
      // 如果head还不存在，延迟注入
      setTimeout(() => {
        if (document.head) {
          const styleElement = document.createElement('style');
          styleElement.id = 'ktr-debug-styles';
          styleElement.textContent = styles;
          document.head.appendChild(styleElement);
        }
      }, 100);
    }
  }

  // 创建调试面板
  function createDebugPanel(title, content) {
    injectVisualizationStyles();

    // 等待body存在
    function tryCreatePanel() {
      if (!document.body) {
        setTimeout(tryCreatePanel, 100);
        return;
      }

      // 移除已存在的面板
      const existing = document.getElementById('ktr-debug-panel');
      if (existing) existing.remove();

      const panel = document.createElement('div');
      panel.id = 'ktr-debug-panel';
      panel.className = 'ktr-debug-panel';

      panel.innerHTML = `
        <div class="ktr-debug-header">
          <span>${title}</span>
          <button class="ktr-debug-close" onclick="this.closest('#ktr-debug-panel').remove()">×</button>
        </div>
        <div class="ktr-debug-content">
          ${content}
        </div>
      `;

      document.body.appendChild(panel);
    }

    tryCreatePanel();
  }

  // 简化的KTR数据解析
  function parseSimpleKTRData(jsonStr) {
    try {
      console.log('=== 尝试解析KTR数据 ===');
      console.log('原始字符串长度:', jsonStr.length);
      console.log('前200字符:', jsonStr.substring(0, 200));

      const data = JSON.parse(jsonStr);
      console.log('解析成功，数据结构:', Object.keys(data));

      if (data.result && data.result[0]) {
        const result = data.result[0];
        console.log('找到result[0]，字段:', Object.keys(result));

        // 解析ext_data
        let extData = {};
        if (result.ext_data) {
          try {
            extData = typeof result.ext_data === 'string' ? JSON.parse(result.ext_data) : result.ext_data;
            console.log('ext_data解析成功，包含:', Object.keys(extData));
          } catch (e) {
            console.log('ext_data解析失败:', e);
          }
        }

        // 解析ext_summary
        let extSummary = {};
        if (result.ext_summary) {
          try {
            extSummary = typeof result.ext_summary === 'string' ? JSON.parse(result.ext_summary) : result.ext_summary;
            console.log('ext_summary解析成功');
          } catch (e) {
            console.log('ext_summary解析失败:', e);
          }
        }

        return { data, extData, extSummary };
      }

      return null;
    } catch (error) {
      console.log('JSON解析失败:', error);
      return null;
    }
  }

  // 创建可视化内容
  function createVisualization(ktrData) {
    if (!ktrData || !ktrData.extData) {
      return '<div style="color: red;">无法解析KTR数据</div>';
    }

    const { extData, extSummary } = ktrData;
    let html = '';

    // 显示处理步骤
    if (extData.steps && extData.steps.length > 0) {
      html += '<h4>🔄 数据处理链路</h4>';

      extData.steps.forEach((step, index) => {
        const status = getStepStatus(step.name, extData.rs || []);

        html += `
          <div class="ktr-debug-step ${status.className}">
            <div class="ktr-step-title">${index + 1}. ${step.name}</div>
            <div class="ktr-step-info">类型: ${step.type} | 状态: ${status.text}</div>
            ${status.duration ? `<div class="ktr-step-info">耗时: ${status.duration}ms</div>` : ''}
            ${status.comment ? `<div class="ktr-step-info">备注: ${status.comment}</div>` : ''}
          </div>
        `;

        if (index < extData.steps.length - 1) {
          html += '<div class="ktr-flow-arrow">↓</div>';
        }
      });
    }

    // 显示运行概览
    if (extSummary.rs && extSummary.rs.length > 0) {
      const summary = extSummary.rs[0];
      html += '<h4>📊 运行概览</h4>';
      html += '<div style="background: #f9f9f9; padding: 10px; border-radius: 4px;">';
      html += `<div>批次: <strong>${summary.batch || 'N/A'}</strong></div>`;
      html += `<div>开始时间: ${summary.startAt || 'N/A'}</div>`;
      html += `<div>错误数: ${summary.errors || 0}</div>`;
      html += `<div>状态: ${summary.finish ? '✅ 已完成' : summary.stop ? '🛑 已停止' : '🔄 运行中'}</div>`;
      html += '</div>';
    }

    // 显示原始数据（调试用）
    html += '<h4>📝 原始数据（调试用）</h4>';
    html += '<pre style="font-size: 10px;">' + JSON.stringify({extData, extSummary}, null, 2) + '</pre>';

    return html;
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
    return { className: 'pending', text: '未知' };
  }

  function getStatusClass(exitCode) {
    if (exitCode === 0) return 'success';
    if (exitCode === 1) return 'warning';
    if (exitCode === 2) return 'running';
    return 'error';
  }

  function getStatusText(exitCode) {
    if (exitCode === 0) return '成功';
    if (exitCode === 1) return '警告';
    if (exitCode === 2) return '运行中';
    return '失败';
  }

  // 从抽屉中提取KTR数据
  function extractKTRFromDrawer(drawer) {
    console.log('=== 开始从抽屉提取KTR数据 ===');

    try {
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (!jsonEditor) {
        console.log('未找到JSON编辑器');
        return null;
      }

      console.log('找到JSON编辑器，尝试提取文本...');

      // 获取所有文本内容
      const textContent = jsonEditor.textContent;
      console.log('文本内容长度:', textContent.length);

      // 尝试找到JSON结构
      const jsonMatch = textContent.match(/\{[\s\S]*"statusCode"[\s\S]*\}/);
      if (jsonMatch) {
        console.log('找到可能的JSON结构');
        const ktrData = parseSimpleKTRData(jsonMatch[0]);
        if (ktrData) {
          return ktrData;
        }
      }

      // 备用：尝试其他JSON模式
      const altJsonMatch = textContent.match(/\{[\s\S]*"result"[\s\S]*\}/);
      if (altJsonMatch) {
        console.log('尝试备用JSON模式');
        const ktrData = parseSimpleKTRData(altJsonMatch[0]);
        if (ktrData) {
          return ktrData;
        }
      }

      console.log('未找到有效的JSON结构');
      return null;

    } catch (error) {
      console.log('提取失败:', error);
      return null;
    }
  }

  // 监听抽屉出现
  function monitorDrawer() {
    console.log('=== 开始监听抽屉 ===');

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('el-drawer')) {
            console.log('检测到抽屉出现，延迟1秒等待内容加载...');

            setTimeout(() => {
              const ktrData = extractKTRFromDrawer(node);
              if (ktrData) {
                console.log('成功提取KTR数据，创建可视化面板');
                const vizContent = createVisualization(ktrData);
                createDebugPanel('KTR数据处理链路', vizContent);
              } else {
                console.log('未能提取KTR数据，显示调试信息');
                const drawerText = node.textContent.substring(0, 500);
                createDebugPanel('调试信息', `
                  <h4>抽屉内容预览</h4>
                  <pre>${drawerText}</pre>
                  <p style="color: red;">未能解析KTR数据，请检查控制台日志</p>
                `);
              }
            }, 1000);
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
  console.log('=== 调试版扩展初始化 ===');

  // 等待DOM准备好
  function waitForDOM() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  function init() {
    console.log('DOM ready, 开始初始化...');

    // 延迟显示面板确保DOM完全就绪
    setTimeout(() => {
      createDebugPanel('扩展状态', `
        <div>✅ 扩展已加载</div>
        <div>🎯 正在监听抽屉组件</div>
        <div>⏳ 等待用户点击详情按钮...</div>
        <div style="margin-top: 10px; font-size: 11px; color: #666;">
          提示：点击扩展列的"详情"按钮后，我会自动解析KTR数据并显示链路图
        </div>
      `);

      monitorDrawer();
    }, 500);
  }

  waitForDOM();

})();