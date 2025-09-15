// 调试版抽屉增强器 - 带详细错误追踪
(function() {
  'use strict';

  console.log('=== 调试版抽屉增强器已加载 ===');

  // 安全地添加样式
  function safeInjectStyles() {
    try {
      console.log('尝试注入样式...');

      if (document.getElementById('ktr-enhancer-styles')) {
        console.log('样式已存在，跳过注入');
        return;
      }

      if (!document.head) {
        console.log('document.head为null，延迟注入样式');
        setTimeout(safeInjectStyles, 100);
        return;
      }

      const styles = `
        #ktr-visualize-btn {
          background: #409eff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 10px;
          transition: all 0.3s;
        }
        #ktr-visualize-btn:hover {
          background: #66b1ff;
        }
        #ktr-visualize-btn.visualizing {
          background: #67c23a;
        }
        .ktr-flow-container {
          margin: 15px 0;
          padding: 15px;
          background: #f5f7fa;
          border-radius: 6px;
          border: 1px solid #ebeef5;
        }
        .ktr-flow-title {
          font-size: 14px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 15px;
          text-align: center;
        }
        .ktr-flow-step {
          display: flex;
          align-items: center;
          padding: 10px;
          margin: 8px 0;
          background: white;
          border-radius: 4px;
          border-left: 3px solid #dcdfe6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .ktr-flow-step.success { border-left-color: #67c23a; background: #f0f9ff; }
        .ktr-flow-step.error { border-left-color: #f56c6c; background: #fef0f0; }
        .ktr-flow-step.running { border-left-color: #409eff; background: #ecf5ff; }
        .ktr-step-icon { font-size: 18px; margin-right: 10px; width: 25px; text-align: center; }
        .ktr-step-content { flex: 1; }
        .ktr-step-name { font-size: 12px; font-weight: 500; color: #303133; margin-bottom: 2px; }
        .ktr-step-type { font-size: 10px; color: #909399; }
        .ktr-step-status { font-size: 10px; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-top: 4px; }
        .ktr-step-status.success { background: #f0f9ff; color: #67c23a; }
        .ktr-step-status.error { background: #fef0f0; color: #f56c6c; }
        .ktr-step-status.running { background: #ecf5ff; color: #409eff; }
        .ktr-step-duration { font-size: 10px; color: #67c23a; margin-top: 2px; }
        .ktr-flow-arrow { text-align: center; color: #c0c4cc; font-size: 16px; margin: 5px 0; }
      `;

      const styleElement = document.createElement('style');
      styleElement.id = 'ktr-enhancer-styles';
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
      console.log('样式注入成功');
    } catch (error) {
      console.error('样式注入失败:', error);
      console.error('错误堆栈:', error.stack);
    }
  }

  // 安全地创建按钮
  function safeCreateButton(drawer) {
    try {
      console.log('=== 开始创建按钮 ===');
      console.log('抽屉元素:', drawer);
      console.log('抽屉className:', drawer.className);
      console.log('抽屉innerHTML长度:', drawer.innerHTML.length);

      if (!drawer) {
        console.log('抽屉元素为null');
        return false;
      }

      // 检查是否已存在按钮
      const existingBtn = drawer.querySelector('#ktr-visualize-btn');
      if (existingBtn) {
        console.log('按钮已存在');
        return true;
      }

      console.log('查找抽屉头部...');

      // 尝试多种方式查找头部
      let header = null;
      const selectors = [
        '.el-drawer__header',
        '.el-drawer__title',
        '[class*="header"]',
        '.el-dialog__header',
        '[class*="title"]'
      ];

      for (const selector of selectors) {
        header = drawer.querySelector(selector);
        if (header) {
          console.log(`找到头部: ${selector}`);
          break;
        }
      }

      if (!header) {
        console.log('未找到标准头部，查看抽屉结构...');

        // 查看抽屉的前几个子元素
        const children = drawer.children;
        console.log('抽屉子元素数量:', children.length);
        for (let i = 0; i < Math.min(3, children.length); i++) {
          console.log(`子元素 ${i}:`, children[i].tagName, children[i].className);
        }

        // 尝试创建简单的按钮插入
        return createSimpleButton(drawer);
      }

      console.log('创建按钮元素...');
      const button = document.createElement('button');
      button.id = 'ktr-visualize-btn';
      button.textContent = '📊 图形展示';
      button.title = '显示数据处理链路图';
      button.style.cssText = 'margin-left: 10px; padding: 4px 8px; font-size: 11px;';

      console.log('添加到头部...');
      header.appendChild(button);
      console.log('按钮创建成功');

      // 绑定事件
      button.addEventListener('click', function() {
        console.log('按钮被点击');
        handleVisualizationClick(drawer);
      });

      return true;
    } catch (error) {
      console.error('创建按钮失败:', error);
      console.error('错误堆栈:', error.stack);
      return false;
    }
  }

  // 创建简单按钮（降级方案）
  function createSimpleButton(drawer) {
    try {
      console.log('尝试创建简单按钮...');

      const button = document.createElement('button');
      button.id = 'ktr-visualize-btn';
      button.textContent = '📊 展示';
      button.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: #409eff;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        cursor: pointer;
      `;

      // 直接添加到drawer
      if (drawer) {
        drawer.appendChild(button);
        console.log('简单按钮创建成功');

        button.addEventListener('click', function() {
          handleVisualizationClick(drawer);
        });

        return true;
      } else {
        console.log('drawer为null，无法添加按钮');
        return false;
      }
    } catch (error) {
      console.error('简单按钮创建失败:', error);
      return false;
    }
  }

  // 处理可视化点击
  function handleVisualizationClick(drawer) {
    try {
      console.log('处理可视化点击...');

      const button = drawer.querySelector('#ktr-visualize-btn');
      if (!button) {
        console.log('找不到按钮');
        return;
      }

      // 切换按钮状态
      button.classList.toggle('visualizing');
      const isVisualizing = button.classList.contains('visualizing');
      button.textContent = isVisualizing ? '🔄 隐藏' : '📊 展示';

      if (isVisualizing) {
        showSimpleVisualization(drawer);
      } else {
        hideSimpleVisualization(drawer);
      }
    } catch (error) {
      console.error('处理点击失败:', error);
    }
  }

  // 显示简单可视化
  function showSimpleVisualization(drawer) {
    try {
      console.log('显示简单可视化...');

      // 移除已存在的可视化
      hideSimpleVisualization(drawer);

      // 提取KTR数据
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (!jsonEditor) {
        console.log('未找到JSON编辑器');
        return;
      }

      const textContent = jsonEditor.textContent;
      console.log('JSON编辑器文本长度:', textContent.length);

      // 尝试提取KTR数据
      const ktrData = extractKTRFromText(textContent);
      if (!ktrData) {
        console.log('未能提取KTR数据');
        showDebugInfo(drawer, textContent);
        return;
      }

      // 创建简单的可视化
      const container = document.createElement('div');
      container.id = 'ktr-simple-viz';
      container.innerHTML = createSimpleVisualizationHTML(ktrData);
      container.className = 'ktr-flow-container';

      // 添加到drawer
      drawer.appendChild(container);
      console.log('简单可视化已显示');
    } catch (error) {
      console.error('显示可视化失败:', error);
    }
  }

  // 隐藏简单可视化
  function hideSimpleVisualization(drawer) {
    const existing = drawer.querySelector('#ktr-simple-viz');
    if (existing) {
      existing.remove();
      console.log('可视化已隐藏');
    }
  }

  // 显示调试信息
  function showDebugInfo(drawer, textContent) {
    const container = document.createElement('div');
    container.id = 'ktr-simple-viz';
    container.style.cssText = 'margin: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 11px;';
    container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">🔍 调试信息</div>
      <div>未能提取KTR数据</div>
      <div style="margin-top: 5px;">文本预览: ${textContent.substring(0, 200)}...</div>
    `;
    drawer.appendChild(container);
  }

  // 从文本提取KTR数据
  function extractKTRFromText(textContent) {
    try {
      // 尝试找到JSON结构
      const patterns = [
        /\{\s*"statusCode"[\s\S]*"ext_data"[\s\S]*\}/,
        /\{\s*"result"[\s\S]*"ext_data"[\s\S]*\}/
      ];

      for (const pattern of patterns) {
        const match = textContent.match(pattern);
        if (match) {
          const data = JSON.parse(match[0]);
          if (data.result && data.result[0]) {
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
          }
        }
      }
      return null;
    } catch (error) {
      console.log('文本提取失败:', error);
      return null;
    }
  }

  // 创建简单的可视化HTML
  function createSimpleVisualizationHTML(ktrData) {
    if (!ktrData || !ktrData.extData) {
      return '<div style="text-align: center; color: #999; padding: 10px;">无法解析KTR数据</div>';
    }

    const { extData, extSummary } = ktrData;
    let html = '';

    // 运行概览
    if (extSummary.rs && extSummary.rs.length > 0) {
      const summary = extSummary.rs[0];
      html += `
        <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #ebeef5;">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">📊 运行概览</div>
          <div style="font-size: 11px;">批次: <strong>${summary.batch || 'N/A'}</strong></div>
          <div style="font-size: 11px;">错误数: <strong>${summary.errors || 0}</strong></div>
          <div style="font-size: 11px;">状态: <strong>${summary.finish ? '✅ 已完成' : summary.stop ? '❌ 已停止' : '🔄 运行中'}</strong></div>
        </div>
      `;
    }

    // 数据处理流程
    if (extData.steps && extData.steps.length > 0) {
      html += '<div style="font-weight: bold; margin-bottom: 10px; font-size: 12px;">🔄 数据处理链路</div>';

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
            </div>
          </div>
        `;

        if (!isLast) {
          html += '<div class="ktr-flow-arrow">↓</div>';
        }
      });
    }

    return html;
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

  // 监听抽屉出现
  function monitorDrawer() {
    console.log('开始监听抽屉组件...');

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('el-drawer')) {
            console.log('检测到抽屉出现，延迟处理...');

            // 延迟处理等待内容加载
            setTimeout(() => {
              safeCreateButton(node);
            }, 1000);
          }
        });
      });
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('已开始监听document.body');
    } else {
      console.log('document.body为null，延迟监听');
      setTimeout(() => {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          console.log('延迟监听已开始');
        }
      }, 500);
    }
  }

  // 初始化
  try {
    console.log('开始初始化...');

    // 等待DOM就绪
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded事件触发');
        safeInjectStyles();
        monitorDrawer();
      });
    } else {
      console.log('DOM已加载，直接初始化');
      safeInjectStyles();
      monitorDrawer();
    }

    console.log('初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
    console.error('错误堆栈:', error.stack);
  }

})();