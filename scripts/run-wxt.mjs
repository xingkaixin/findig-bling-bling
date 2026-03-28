import { readFile } from 'node:fs/promises';

const nativeFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;

  if (typeof url === 'string' && url.startsWith('/')) {
    const body = await readFile(url);
    return new Response(body);
  }

  return nativeFetch(input, init);
};

process.argv = ['node', 'wxt', ...process.argv.slice(2)];

await import('../node_modules/wxt/dist/cli/index.mjs');
