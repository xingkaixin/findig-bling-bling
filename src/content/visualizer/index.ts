import { parseKtrPayload } from '@shared/ktr/parser';
import { getEnabledSites } from '@shared/storage/sites';
import type { NormalizedKtrData } from '@shared/ktr/types';
import { extractKtrFromDrawer } from '@shared/ktr/extractors';
import { closePanel, showPanel } from './panel';

declare global {
  interface Window {
    __ktrVisualizerInitialized?: boolean;
    lastKTRResponse?: string;
  }
}

const FINDIG_PATH_FRAGMENT = 'findig-web';
const INTERCEPTOR_ID = 'ktr-network-interceptor';
const DRAWER_CLASS = 'el-drawer';

function isFindigPage(): boolean {
  return window.location.pathname.includes(FINDIG_PATH_FRAGMENT);
}

async function isEnabledSite(): Promise<boolean> {
  try {
    const sites = await getEnabledSites();
    return sites.some((site) => {
      try {
        const parsed = new URL(site);
        return parsed.host === window.location.host;
      } catch {
        return site === window.location.origin;
      }
    });
  } catch (error) {
    console.warn('读取站点启用状态失败，默认启用监听', error);
    return true;
  }
}

function injectNetworkInterceptor() {
  if (document.getElementById(INTERCEPTOR_ID)) {
    return;
  }

  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
    console.warn('缺少 Chrome runtime，上下文可能不在扩展环境');
    return;
  }

  const script = document.createElement('script');
  script.id = INTERCEPTOR_ID;
  script.type = 'text/javascript';
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = () => {
    script.remove();
  };

  document.documentElement.appendChild(script);
}

function handleParsedData(parsed: NormalizedKtrData | null, raw: unknown) {
  if (!parsed) {
    return;
  }
  window.lastKTRResponse = typeof raw === 'string' ? (raw as string) : JSON.stringify(raw);
  showPanel(parsed);
}

function monitorDrawer() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.classList.contains(DRAWER_CLASS)) {
            setTimeout(() => {
              const result = extractKtrFromDrawer(element);
              if (result) {
                handleParsedData(result.parsed, result.raw);
              }
            }, 500);
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function monitorMessages() {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) {
      return;
    }

    const { type, payload, data } = event.data as { type?: string; payload?: { body?: unknown }; data?: unknown };
    if (type === 'KTR_CAPTURED_DATA' && payload?.body) {
      const parsed = parseKtrPayload(payload.body);
      handleParsedData(parsed, payload.body);
      return;
    }

    if (type === 'KTR_DATA' && data) {
      const parsed = parseKtrPayload(data);
      handleParsedData(parsed, data);
    }
  });
}

function registerVisibilityCleanup() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      closePanel();
    }
  });
}

export async function init() {
  if (window.__ktrVisualizerInitialized) {
    return;
  }
  window.__ktrVisualizerInitialized = true;

  if (!isFindigPage()) {
    return;
  }

  const enabled = await isEnabledSite();
  if (!enabled) {
    return;
  }

  injectNetworkInterceptor();
  monitorDrawer();
  monitorMessages();
  registerVisibilityCleanup();
}
