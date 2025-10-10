(() => {
  if (window.__ktrNetworkInterceptorInstalled) {
    return;
  }
  window.__ktrNetworkInterceptorInstalled = true;

  const TARGET_KEYWORD = 'logExtData';

  function shouldHandle(url) {
    return typeof url === 'string' && url.includes(TARGET_KEYWORD);
  }

  function dispatchKTRData(rawBody, url, transport) {
    if (!rawBody) {
      return;
    }
    try {
      window.postMessage({
        source: 'ktr-interceptor',
        type: 'KTR_CAPTURED_DATA',
        payload: {
          body: rawBody,
          url,
          transport
        }
      }, '*');
    } catch (error) {
      console.warn('KTR捕获消息发送失败:', error);
    }
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const requestInfo = args[0];
        const requestUrl = typeof requestInfo === 'string' ? requestInfo : requestInfo?.url;
        if (shouldHandle(requestUrl)) {
          response.clone().text().then(text => {
            dispatchKTRData(text, requestUrl, 'fetch');
          }).catch(() => {});
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

    OriginalXHR.prototype.open = function(method, url, ...rest) {
      this.__ktrRequestUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    OriginalXHR.prototype.send = function(body) {
      if (shouldHandle(this.__ktrRequestUrl)) {
        this.addEventListener('load', function() {
          try {
            if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) {
              dispatchKTRData(this.responseText, this.__ktrRequestUrl, 'xhr');
            }
          } catch (error) {
            console.warn('KTR XHR捕获失败:', error);
          }
        });
      }
      return originalSend.call(this, body);
    };
  }
})();
