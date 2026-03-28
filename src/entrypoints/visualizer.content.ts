import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_end',
  allFrames: true,
  async main() {
    const { init } = await import('@content/visualizer/index');
    await init();
  },
});
