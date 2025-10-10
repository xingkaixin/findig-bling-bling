// 网站管理功能
class WebsiteManager {
  constructor() {
    this.websites = [];
    this.init();
  }

  loadWebsites(callback) {
    chrome.storage.local.get(['ktr-enabled-websites'], (result) => {
      const websites = result['ktr-enabled-websites'] || [];
      callback(websites);
    });
  }

  saveWebsites() {
    chrome.storage.local.set({'ktr-enabled-websites': this.websites});
  }

  init() {
    this.loadWebsites((websites) => {
      this.websites = websites;
      this.renderWebsiteList();
      this.bindEvents();
      this.updateCurrentTabStatus();
    });
  }

  bindEvents() {
    const addBtn = document.getElementById('add-website-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showAddInput();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.addCurrentWebsite();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideAddInput();
      });
    }
  }

  showAddInput() {
    const inputGroup = document.getElementById('input-group');
    const addBtn = document.getElementById('add-website-btn');

    if (inputGroup && addBtn) {
      inputGroup.style.display = 'block';
      addBtn.style.display = 'none';

      // 预填充当前标签页URL
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          const url = new URL(tabs[0].url);
          const baseUrl = `${url.protocol}//${url.host}`;
          const urlInput = document.getElementById('url-input');
          if (urlInput) {
            urlInput.value = baseUrl;
          }
        }
      });
    }
  }

  hideAddInput() {
    const inputGroup = document.getElementById('input-group');
    const addBtn = document.getElementById('add-website-btn');
    const urlInput = document.getElementById('url-input');

    if (inputGroup && addBtn) {
      inputGroup.style.display = 'none';
      addBtn.style.display = 'block';
    }

    if (urlInput) {
      urlInput.value = '';
    }
  }

  async addCurrentWebsite() {
    const urlInput = document.getElementById('url-input');
    if (!urlInput) return;

    const input = urlInput.value.trim();
    if (!input) {
      this.showMessage('请输入有效的网站URL', 'error');
      return;
    }

    try {
      const url = new URL(input);
      const baseUrl = `${url.protocol}//${url.host}`;

      // 检查路径是否包含findig-web
      if (!url.pathname.includes('findig-web')) {
        this.showMessage('网站不符合插件功能范围\n只支持包含 "findig-web" 路径的网站', 'error');
        return;
      }

      if (!this.websites.includes(baseUrl)) {
        this.websites.push(baseUrl);
        this.saveWebsites();
        this.renderWebsiteList();
        this.updateCurrentTabStatus();
        this.showMessage('网站添加成功！\n请刷新页面以启用插件。', 'success');
      } else {
        this.showMessage('该网站已经添加过了', 'warning');
      }

      this.hideAddInput();
    } catch (error) {
      this.showMessage('请输入有效的URL格式', 'error');
    }
  }

  removeWebsite(website) {
    if (confirm(`确定要移除网站 "${website}" 吗？`)) {
      this.websites = this.websites.filter(w => w !== website);
      this.saveWebsites();
      this.renderWebsiteList();
      this.updateCurrentTabStatus();
      this.showMessage(`网站 "${website}" 已移除`, 'info');
    }
  }

  renderWebsiteList() {
    const listEl = document.getElementById('website-list');
    if (!listEl) return;

    if (this.websites.length === 0) {
      listEl.innerHTML = '<div class="website-item"><span class="website-url">暂无添加的网站</span></div>';
      return;
    }

    listEl.innerHTML = this.websites.map(website => `
      <div class="website-item">
        <span class="website-url">${website}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="website-badge badge-enabled">已启用</span>
          <button class="btn btn-remove" onclick="websiteManager.removeWebsite('${website}')">移除</button>
        </div>
      </div>
    `).join('');

    // 重新绑定移除按钮事件
    this.bindRemoveEvents();
  }

  bindRemoveEvents() {
    const removeBtns = document.querySelectorAll('.btn-remove');
    removeBtns.forEach(btn => {
      if (!btn.hasAttribute('data-bound')) {
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', (e) => {
          const website = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
          this.removeWebsite(website);
        });
      }
    });
  }

  updateCurrentTabStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        try {
          const url = new URL(tabs[0].url);
          const baseUrl = `${url.protocol}//${url.host}`;
          const statusEl = document.getElementById('extension-status');

          if (this.websites.includes(baseUrl)) {
            statusEl.textContent = '✅ 本网站已启用';
          } else if (url.pathname.includes('findig-web')) {
            statusEl.textContent = '⚠️ 本网站未启用，点击添加';
          } else {
            statusEl.textContent = '❌ 网站不符合插件功能范围';
          }
        } catch (error) {
          // 无效URL，忽略
        }
      }
    });
  }

  showMessage(message, type = 'info') {
    // 创建消息提示
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;

    // 添加样式
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f56c6c' : type === 'warning' ? '#e6a23c' : type === 'success' ? '#67c23a' : '#409eff'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }
}

// 初始化网站管理器
const websiteManager = new WebsiteManager();