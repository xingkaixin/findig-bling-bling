(function interceptNetwork() {
  const globalWindow = window as typeof window & { __ktrNetworkInterceptorInstalled?: boolean };

  if (globalWindow.__ktrNetworkInterceptorInstalled) {
    return;
  }
  globalWindow.__ktrNetworkInterceptorInstalled = true;

  const TARGET_KEYWORD = 'logExtData';

  function shouldHandle(url: unknown): url is string {
    return typeof url === 'string' && url.includes(TARGET_KEYWORD);
  }

  function dispatchKTRData(rawBody: string, url: string, transport: 'fetch' | 'xhr') {
    if (!rawBody) return;
    try {
      window.postMessage(
        {
          source: 'ktr-interceptor',
          type: 'KTR_CAPTURED_DATA',
          payload: {
            body: rawBody,
            url,
            transport
          }
        },
        '*'
      );
    } catch (error) {
      console.warn('KTR捕获消息发送失败:', error);
    }
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const requestInfo = args[0];
        const requestUrl = typeof requestInfo === 'string' ? requestInfo : requestInfo?.url;
        if (shouldHandle(requestUrl)) {
          response
            .clone()
            .text()
            .then((text) => dispatchKTRData(text, requestUrl, 'fetch'))
            .catch(() => {});
        }
      } catch (error) {
        console.warn('KTR fetch捕获失败:', error);
      }
      return response;
    };
  }

  const OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR) {
    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function patchedOpen(method: string, url: string, ...rest: unknown[]) {
      (this as XMLHttpRequest & { __ktrRequestUrl?: string }).__ktrRequestUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    OriginalXHR.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this as XMLHttpRequest & { __ktrRequestUrl?: string };
      if (shouldHandle(xhr.__ktrRequestUrl)) {
        xhr.addEventListener('load', function onLoad() {
          try {
            if (xhr.status === 200 && (xhr.responseType === '' || xhr.responseType === 'text')) {
              dispatchKTRData(xhr.responseText, xhr.__ktrRequestUrl ?? '', 'xhr');
            }
          } catch (error) {
            console.warn('KTR XHR捕获失败:', error);
          }
        });
      }
      return originalSend.call(this, body as Document | XMLHttpRequestBodyInit | null);
    };
  }
})();
