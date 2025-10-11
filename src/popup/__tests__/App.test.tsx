import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

vi.mock('@shared/storage/sites', () => {
  return {
    getEnabledSites: vi.fn(async () => ['https://foo.com']),
    setEnabledSites: vi.fn(async () => {}),
    subscribeEnabledSites: vi.fn(() => () => {})
  };
});

describe('Popup App', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      tabs: {
        query: vi.fn((_, callback) => {
          callback?.([{ url: 'https://foo.com/findig-web/jobs' }]);
        })
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      },
      runtime: {}
    } as unknown;
  });

  it('renders status banner for enabled site', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('✅ 本网站已启用')).toBeInTheDocument();
    });

    expect(screen.getByText('网站管理')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /添加网站/ })).toBeInTheDocument();
  });
});
