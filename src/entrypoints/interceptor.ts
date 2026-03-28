import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';

export default defineUnlistedScript({
  async main() {
    await import('@injected/interceptor.js');
  },
});
