// 融美美 - findig-bling-bling content script
// 监听抽屉组件和JSON数据

(function() {
  'use strict';

  console.log('融美美扩展已加载，等待页面加载...');

  // 监听抽屉组件出现
  function monitorDrawer() {
    console.log('开始监听抽屉组件...');

    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        // 检查新增的节点
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            // 检查是否是抽屉组件
            if (node.classList && node.classList.contains('el-drawer')) {
              console.log('融美美 - 检测到抽屉组件出现');
              handleDrawerContent(node);
            }

            // 检查抽屉组件内部的内容
            const drawers = node.querySelectorAll ? node.querySelectorAll('.el-drawer') : [];
            drawers.forEach(function(drawer) {
              console.log('融美美 - 检测到抽屉组件(子节点中)');
              handleDrawerContent(drawer);
            });
          }
        });
      });
    });

    // 监听整个文档的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 检查已存在的抽屉
    const existingDrawers = document.querySelectorAll('.el-drawer');
    existingDrawers.forEach(function(drawer) {
      console.log('融美美 - 发现已存在的抽屉组件');
      handleDrawerContent(drawer);
    });
  }

  // 处理抽屉内容
  function handleDrawerContent(drawer) {
    console.log('融美美 - 处理抽屉内容');

    // 查找jsoneditor
    const jsonEditor = drawer.querySelector('.jsoneditor');
    if (jsonEditor) {
      console.log('融美美 - 发现JSON编辑器');
      extractJsonData(jsonEditor);
    }

    // 监听抽屉内部的变化
    const innerObserver = new MutationObserver(function() {
      const jsonEditor = drawer.querySelector('.jsoneditor');
      if (jsonEditor) {
        console.log('融美美 - 抽屉内发现JSON编辑器');
        extractJsonData(jsonEditor);
        innerObserver.disconnect(); // 找到后停止监听
      }
    });

    innerObserver.observe(drawer, {
      childList: true,
      subtree: true
    });

    // 5秒后自动断开监听，避免内存泄漏
    setTimeout(() => {
      innerObserver.disconnect();
    }, 5000);
  }

  // 提取JSON数据
  function extractJsonData(jsonEditor) {
    console.log('融美美 - 提取JSON数据');

    try {
      // 查找包含数据的元素
      const dataElements = jsonEditor.querySelectorAll('.jsoneditor-value');
      const fieldElements = jsonEditor.querySelectorAll('.jsoneditor-field');

      console.log('融美美 - 找到的数据元素数量:', dataElements.length);
      console.log('融美美 - 找到的字段元素数量:', fieldElements.length);

      // 提取文本内容
      const extractedData = {
        fields: [],
        values: [],
        rawContent: []
      };

      fieldElements.forEach((el, index) => {
        extractedData.fields.push({
          index: index,
          text: el.textContent.trim(),
          title: el.title || ''
        });
      });

      dataElements.forEach((el, index) => {
        extractedData.values.push({
          index: index,
          text: el.textContent.trim(),
          title: el.title || '',
          className: el.className
        });
      });

      // 尝试获取更完整的内容
      const treeInner = jsonEditor.querySelector('.jsoneditor-tree-inner');
      if (treeInner) {
        extractedData.rawContent.push(treeInner.textContent);
      }

      console.log('融美美 - 提取的字段:', extractedData.fields);
      console.log('融美美 - 提取的值:', extractedData.values);
      console.log('融美美 - 原始内容:', extractedData.rawContent);

      // 尝试解析JSON结构
      parseJsonStructure(jsonEditor);

      // 尝试提取KTR数据并发送给可视化器
      extractKTRDataAndVisualize(jsonEditor);

    } catch (error) {
      console.log('融美美 - 提取数据时出错:', error);
    }
  }

  // 提取KTR数据并可视化
  function extractKTRDataAndVisualize(jsonEditor) {
    try {
      // 尝试从JSON编辑器中提取完整的KTR响应数据
      const ktrData = extractCompleteKTRResponse(jsonEditor);
      if (ktrData) {
        console.log('融美美 - 提取到KTR数据，发送给可视化器:', ktrData);

        // 发送消息给KTR可视化器
        window.postMessage({
          type: 'KTR_DATA_FROM_CONTENT',
          data: ktrData
        }, '*');
      }
    } catch (error) {
      console.log('融美美 - KTR数据提取失败:', error);
    }
  }

  // 提取完整的KTR响应
  function extractCompleteKTRResponse(jsonEditor) {
    // 尝试多种方法提取完整的JSON响应
    const textContent = jsonEditor.textContent;

    // 方法1: 尝试找到完整的JSON结构
    const jsonPatterns = [
      /\{\s*"statusCode":\s*"200"[\s\S]*"ext_data"[\s\S]*\}/,
      /\{\s*"result"[\s\S]*"ext_data"[\s\S]*\}/,
      /\{\s*"rs"[\s\S]*"steps"[\s\S]*\}/
    ];

    for (const pattern of jsonPatterns) {
      const match = textContent.match(pattern);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          console.log('融美美 - 通过模式匹配找到KTR数据');
          return parsed;
        } catch (e) {
          continue;
        }
      }
    }

    // 方法2: 尝试从DOM元素重构
    return reconstructKTRFromDOM(jsonEditor);
  }

  // 从DOM元素重构KTR数据
  function reconstructKTRFromDOM(jsonEditor) {
    try {
      // 查找关键字段
      const statusElement = Array.from(jsonEditor.querySelectorAll('.jsoneditor-field')).find(el =>
        el.textContent.includes('statusCode')
      );

      const resultElement = Array.from(jsonEditor.querySelectorAll('.jsoneditor-field')).find(el =>
        el.textContent.includes('result')
      );

      if (statusElement && resultElement) {
        // 构建基本的KTR响应结构
        return {
          statusCode: "200",
          msg: "",
          result: [{
            ext_data: "{\"rs\": [], \"steps\": []}",
            ext_summary: "{\"rs\": []}"
          }],
          total: 0,
          page: 0,
          size: 0
        };
      }
    } catch (error) {
      console.log('DOM重构失败:', error);
    }
    return null;
  }

  // 尝试解析JSON结构
  function parseJsonStructure(jsonEditor) {
    console.log('融美美 - 解析JSON结构');

    try {
      // 查找rs和steps字段（根据提供的HTML结构）
      const rsElements = jsonEditor.querySelectorAll('[title*="rs"]');
      const stepsElements = jsonEditor.querySelectorAll('[title*="steps"]');

      console.log('融美美 - rs相关元素:', rsElements.length);
      console.log('融美美 - steps相关元素:', stepsElements.length);

      // 查找包含数组信息的元素
      const arrayElements = jsonEditor.querySelectorAll('[title*="array containing"]');
      arrayElements.forEach((el, index) => {
        console.log(`融美美 - 数组元素 ${index}:`, el.textContent.trim(), el.title);
      });

      // 查找包含对象信息的元素
      const objectElements = jsonEditor.querySelectorAll('[title*="object containing"]');
      objectElements.forEach((el, index) => {
        console.log(`融美美 - 对象元素 ${index}:`, el.textContent.trim(), el.title);
      });

      // 尝试构建完整的数据结构
      if (arrayElements.length > 0 || objectElements.length > 0) {
        console.log('融美美 - 发现JSON数据结构，尝试解析...');

        // 输出所有可见的JSON内容
        const allValues = jsonEditor.querySelectorAll('.jsoneditor-value');
        const result = {
          summary: `找到 ${allValues.length} 个值`,
          values: Array.from(allValues).slice(0, 10).map(el => ({
            text: el.textContent.trim(),
            title: el.title
          }))
        };

        console.log('融美美 - JSON数据概览:', result);
      }

    } catch (error) {
      console.log('融美美 - 解析JSON结构时出错:', error);
    }
  }

  // 监听详情按钮点击
  function monitorDetailButtons() {
    console.log('开始监听详情按钮...');

    document.addEventListener('click', function(event) {
      // 检查点击的是否是详情按钮
      const target = event.target;

      // 检查按钮文本
      if (target.tagName === 'BUTTON' && target.textContent.includes('详情')) {
        console.log('融美美 - 点击了详情按钮');

        // 检查是否在扩展列
        const cell = target.closest('.el-table_5_column_48');
        if (cell) {
          console.log('融美美 - 确认：点击的是扩展列的详情按钮');

          // 获取行数据
          const row = target.closest('.el-table__row');
          if (row) {
            const cells = row.querySelectorAll('.el-table__cell');
            const rowData = {
              序号: cells[0]?.textContent.trim(),
              作业名称: cells[1]?.textContent.trim(),
              作业中文描述: cells[2]?.textContent.trim(),
              执行服务器: cells[3]?.textContent.trim(),
              线程编号: cells[4]?.textContent.trim(),
              执行结果: cells[5]?.textContent.trim(),
              计数信息: cells[8]?.textContent.trim(),
              开始时间: cells[9]?.textContent.trim(),
              完成时间: cells[10]?.textContent.trim(),
              运行时长: cells[11]?.textContent.trim()
            };
            console.log('融美美 - 当前行数据:', rowData);
          }
        }
      }
    });
  }

  // 等待页面加载完成
  function init() {
    console.log('融美美扩展初始化...');

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM加载完成，开始监听');
        monitorDrawer();
        monitorDetailButtons();
      });
    } else {
      console.log('DOM已加载，直接开始监听');
      monitorDrawer();
      monitorDetailButtons();
    }
  }

  // 初始化
  init();

  console.log('融美美扩展加载完成');
})();