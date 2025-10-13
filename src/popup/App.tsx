import { useEffect, useMemo, useState } from 'react';
import {
  getEnabledSites,
  setEnabledSites,
  subscribeEnabledSites
} from '@shared/storage/sites';

type BannerTone = 'success' | 'error' | 'warning' | 'info';

type BannerState = {
  tone: BannerTone;
  message: string;
};

type TabInfo = {
  origin: string | null;
  pathname: string | null;
};

const STATUS_LABELS: Record<'enabled' | 'notEnabled' | 'outOfScope' | 'unknown', string> = {
  enabled: '✅ 本网站已启用',
  notEnabled: '⚠️ 本网站未启用，点击添加',
  outOfScope: '❌ 网站不符合插件功能范围',
  unknown: '❓ 无法识别当前标签页'
};

const findigPathFragment = 'findig-web';

function includesFindig(pathname: string | null): boolean {
  return Boolean(pathname && pathname.includes(findigPathFragment));
}

function normalizePath(pathname: string | null): string {
  if (!pathname) {
    return '';
  }
  return pathname.replace(/\/+$/, '') || '/';
}

function buildSiteEntry(parsed: URL): string {
  const normalizedPath = normalizePath(parsed.pathname);
  return normalizedPath && normalizedPath !== '/' ? `${parsed.origin}${normalizedPath}` : parsed.origin;
}

function matchesSite(site: string, tab: TabInfo): boolean {
  if (!tab.origin) {
    return false;
  }

  const normalizedPath = normalizePath(tab.pathname);
  const candidates = normalizedPath && normalizedPath !== '/'
    ? [tab.origin, `${tab.origin}${normalizedPath}`]
    : [tab.origin];

  if (candidates.includes(site)) {
    return true;
  }

  try {
    const parsed = new URL(site);
    const normalizedSite = buildSiteEntry(parsed);
    return candidates.includes(normalizedSite) || candidates.includes(parsed.origin);
  } catch {
    return false;
  }
}

async function queryActiveTab(): Promise<TabInfo> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return { origin: null, pathname: null };
  }

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const target = tabs[0];
      if (!target?.url) {
        resolve({ origin: null, pathname: null });
        return;
      }

      try {
        const parsed = new URL(target.url);
        resolve({ origin: `${parsed.protocol}//${parsed.host}`, pathname: parsed.pathname });
      } catch (error) {
        console.warn('解析当前标签页地址失败', error);
        resolve({ origin: null, pathname: null });
      }
    });
  });
}

function Banner({ state }: { state: BannerState | null }) {
  if (!state) {
    return null;
  }

  const toneStyles: Record<BannerTone, string> = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    error: 'bg-rose-100 text-rose-700 border-rose-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    info: 'bg-sky-100 text-sky-700 border-sky-200'
  };

  return (
    <div
      className={`mb-4 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition ${toneStyles[state.tone]}`}
    >
      {state.message}
    </div>
  );
}

export default function App() {
  const [sites, setSitesState] = useState<string[]>([]);
  const [tabInfo, setTabInfo] = useState<TabInfo>({ origin: null, pathname: null });
  const [statusKey, setStatusKey] = useState<'enabled' | 'notEnabled' | 'outOfScope' | 'unknown'>('unknown');
  const [isInputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [banner, setBanner] = useState<BannerState | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const [initialSites, currentTab] = await Promise.all([getEnabledSites(), queryActiveTab()]);
      if (!mounted) return;
      setSitesState(initialSites);
      setTabInfo(currentTab);
    }

    init();

    const unsubscribe = subscribeEnabledSites((next) => {
      if (mounted) {
        setSitesState(next);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!tabInfo.origin) {
      setStatusKey('unknown');
      return;
    }

    const isEnabled = sites.some((site) => matchesSite(site, tabInfo));
    if (isEnabled) {
      setStatusKey('enabled');
      return;
    }

    if (includesFindig(tabInfo.pathname)) {
      setStatusKey('notEnabled');
      return;
    }

    setStatusKey('outOfScope');
  }, [sites, tabInfo]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(timer);
  }, [banner]);

  const statusLabel = useMemo(() => STATUS_LABELS[statusKey], [statusKey]);

  const handleToggleInput = async () => {
    if (isInputVisible) {
      setInputVisible(false);
      setInputValue('');
      return;
    }

    const currentTab = await queryActiveTab();
    setTabInfo(currentTab);
    const normalizedPath = normalizePath(currentTab.pathname);
    const defaultValue = currentTab.origin
      ? normalizedPath && normalizedPath !== '/'
        ? `${currentTab.origin}${normalizedPath}`
        : currentTab.origin
      : '';
    setInputValue(defaultValue);
    setInputVisible(true);
  };

  const handleAddWebsite = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setBanner({ tone: 'error', message: '请输入有效的网站URL' });
      return;
    }

    try {
      const parsed = new URL(trimmed);
      const baseUrl = `${parsed.protocol}//${parsed.host}`;
      const siteEntry = buildSiteEntry(parsed);

      if (!parsed.pathname.includes(findigPathFragment)) {
        setBanner({
          tone: 'error',
          message: '网站不符合插件功能范围，只支持包含 "findig-web" 路径的网址'
        });
        return;
      }

      const existingExactIndex = sites.findIndex((site) => {
        try {
          return buildSiteEntry(new URL(site)) === siteEntry;
        } catch {
          return site === siteEntry;
        }
      });

      if (existingExactIndex !== -1) {
        setBanner({ tone: 'warning', message: '该网站已经添加过了' });
        setInputVisible(false);
        return;
      }

      const existingBaseIndex = sites.findIndex((site) => {
        try {
          return buildSiteEntry(new URL(site)) === baseUrl;
        } catch {
          return site === baseUrl;
        }
      });

      if (existingBaseIndex !== -1) {
        const nextSites = [...sites];
        nextSites[existingBaseIndex] = siteEntry;
        setSitesState(nextSites);
        await setEnabledSites(nextSites);
        setBanner({ tone: 'success', message: '网站添加成功！请刷新页面以启用插件。' });
        setInputVisible(false);
        setInputValue('');
        return;
      }

      const nextSites = [...sites, siteEntry];
      setSitesState(nextSites);
      await setEnabledSites(nextSites);
      setBanner({ tone: 'success', message: '网站添加成功！请刷新页面以启用插件。' });
      setInputVisible(false);
      setInputValue('');
    } catch (error) {
      console.warn('添加网站失败', error);
      setBanner({ tone: 'error', message: '请输入有效的URL格式' });
    }
  };

  const handleRemoveWebsite = async (website: string) => {
    if (!window.confirm(`确定要移除网站 "${website}" 吗？`)) {
      return;
    }

    const nextSites = sites.filter((item) => item !== website);
    setSitesState(nextSites);
    await setEnabledSites(nextSites);
    setBanner({ tone: 'info', message: `网站 "${website}" 已移除` });
  };

  return (
    <div className="space-y-4 text-sm">
      <header className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">融美美</h1>
        <p className="text-xs text-slate-500">findig-bling-bling</p>
      </header>

      <Banner state={banner} />

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-sky-700">扩展状态</h2>
        <p className="mt-2 text-xs text-sky-700">{statusLabel}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">网站管理</h2>
        <div className="mt-3 space-y-2">
          {sites.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              暂未添加网站
            </div>
          ) : (
            <ul className="space-y-2">
              {sites.map((website) => (
                <li
                  key={website}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex-1 pr-3">
                    <p className="break-all text-xs text-slate-600">{website}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-medium text-white">
                      已启用
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWebsite(website)}
                      className="rounded-md bg-rose-500 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-rose-600"
                    >
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {!isInputVisible && (
            <button
              type="button"
              onClick={handleToggleInput}
              className="w-full rounded-md bg-sky-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-sky-600"
            >
              + 添加网站
            </button>
          )}

          {isInputVisible && (
            <div className="space-y-2">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="输入网站URL，例如：https://example.com/findig-web"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-sky-400 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddWebsite}
                  className="flex-1 rounded-md bg-emerald-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-600"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={handleToggleInput}
                  className="flex-1 rounded-md bg-slate-400 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">使用说明</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs text-slate-600">
          <li>访问目标网站</li>
          <li>点击扩展图标</li>
          <li>点击“添加网站”按钮启用当前站点</li>
          <li>点击页面中的 JSON 数据查看按钮</li>
          <li>点击“🚀 渲染数据链路图”进行可视化</li>
        </ol>
      </section>
    </div>
  );
}
