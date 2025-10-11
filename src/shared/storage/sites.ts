const ENABLED_KEY = 'ktr-enabled-websites';

type Listener = (sites: string[]) => void;

const memoryStore = {
  sites: [] as string[],
  listeners: new Set<Listener>()
};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function getChromeError(): string | undefined {
  return typeof chrome !== 'undefined' && chrome.runtime?.lastError ? chrome.runtime.lastError.message : undefined;
}

export async function getEnabledSites(): Promise<string[]> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([ENABLED_KEY], (items) => {
        const error = getChromeError();
        if (error) {
          console.warn('读取站点列表失败', error);
        }
        resolve(items[ENABLED_KEY] ?? []);
      });
    });
  }

  return [...memoryStore.sites];
}

export async function setEnabledSites(sites: string[]): Promise<void> {
  if (hasChromeStorage()) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [ENABLED_KEY]: sites }, () => {
        const error = getChromeError();
        if (error) {
          console.warn('保存站点列表失败', error);
        }
        resolve();
      });
    });
    return;
  }

  memoryStore.sites = [...sites];
  memoryStore.listeners.forEach((listener) => listener([...memoryStore.sites]));
}

export function subscribeEnabledSites(listener: Listener): () => void {
  if (hasChromeStorage()) {
    const handler = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: 'sync' | 'local' | 'managed' | 'session') => {
      if (areaName === 'local' && changes[ENABLED_KEY]) {
        listener(changes[ENABLED_KEY].newValue ?? []);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }

  memoryStore.listeners.add(listener);
  return () => {
    memoryStore.listeners.delete(listener);
  };
}

export function resetMemoryStore() {
  memoryStore.sites = [];
  memoryStore.listeners.clear();
}

export const storageKeys = {
  enabledSites: ENABLED_KEY
} as const;
