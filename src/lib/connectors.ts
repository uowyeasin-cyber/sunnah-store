import 'server-only';
import type { Api, Channel } from './channels';
import type { Tok } from './chanToken';

// One shape for every marketplace this store links to. keyOnly: no "Link shop" page, the saved API keys are the link.
export type Connector = {
  ready: (ch: Channel) => boolean;
  keysNeeded: (ch: Channel) => string;
  authUrl?: (ch: Channel, redirect: string, state: string) => string;
  exchange?: (ch: Channel, p: URLSearchParams) => Promise<Tok>;
  keyOnly?: boolean;
  push: (ch: Channel) => Promise<{ listed: number; synced: number }>;
  pull: (ch: Channel, days?: number) => Promise<{ seen: number; added: number }>;
};

export async function connector(api: Api): Promise<Connector | null> {
  switch (api) {
    case 'lazop': return import('./lazop');
    case 'shopee': return import('./shopee');
    case 'tiktok': return import('./tiktok');
    case 'ebay': return import('./ebay');
    case 'amazon': return import('./amazon');
    case 'walmart': return import('./walmart');
    default: return null;
  }
}
